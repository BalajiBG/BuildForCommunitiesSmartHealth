'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ref, onValue, push, update } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { useAuditLog } from '@/lib/hooks/useAuditLog';
import { t } from '@/lib/i18n/translations';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CampType =
  | 'screening'
  | 'vaccination'
  | 'blood_donation'
  | 'eye_checkup'
  | 'dental'
  | 'maternal'
  | 'general_checkup'
  | 'awareness'
  | 'other';

export type CampStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface HealthCamp {
  id?: string;
  name: string;
  type: CampType;
  date: string; // YYYY-MM-DD
  status: CampStatus;
  targetBeneficiaries: number;
  actualBeneficiaries?: number;
  organizer: string;
  location: string;
  notes?: string | null;
  createdBy: string;
  createdAt: number;
}

interface HealthCampsPanelProps {
  centreId: string;
  readOnly?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CAMP_TYPE_COLORS: Record<CampType, string> = {
  screening: 'bg-purple-100 text-purple-800',
  vaccination: 'bg-blue-100 text-blue-800',
  blood_donation: 'bg-red-100 text-red-800',
  eye_checkup: 'bg-teal-100 text-teal-800',
  dental: 'bg-cyan-100 text-cyan-800',
  maternal: 'bg-pink-100 text-pink-800',
  general_checkup: 'bg-green-100 text-green-800',
  awareness: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
};

const CAMP_TYPE_LABELS: Record<CampType, string> = {
  screening: 'Screening',
  vaccination: 'Vaccination',
  blood_donation: 'Blood Donation',
  eye_checkup: 'Eye Checkup',
  dental: 'Dental',
  maternal: 'Maternal',
  general_checkup: 'General Checkup',
  awareness: 'Awareness',
  other: 'Other',
};

const STATUS_BADGES: Record<CampStatus, { emoji: string; label: string; className: string }> = {
  scheduled: { emoji: '🟢', label: 'Scheduled', className: 'bg-green-50 text-green-700 border-green-200' },
  ongoing: { emoji: '🔵', label: 'Ongoing', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { emoji: '✅', label: 'Completed', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  cancelled: { emoji: '❌', label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function HealthCampsPanel({ centreId, readOnly = false }: HealthCampsPanelProps) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const { log } = useAuditLog(centreId);

  const [camps, setCamps] = useState<HealthCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [editingCamp, setEditingCamp] = useState<HealthCamp | null>(null);

  // ─── Fetch camps ────────────────────────────────────────────────────────

  useEffect(() => {
    const campsRef = ref(database, dbPaths.camps(centreId));
    const unsubscribe = onValue(campsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setCamps([]);
        setLoading(false);
        return;
      }
      const list: HealthCamp[] = Object.entries(data).map(([id, val]) => ({
        ...(val as HealthCamp),
        id,
      }));
      setCamps(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [centreId]);

  // ─── Sort and filter ────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];

  const sortedCamps = [...camps].sort((a, b) => {
    const statusOrder: Record<CampStatus, number> = { ongoing: 0, scheduled: 1, completed: 2, cancelled: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (a.status === 'scheduled') return a.date.localeCompare(b.date);
    if (a.status === 'completed') return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });

  const upcomingCamps = sortedCamps.filter(
    (c) => c.status === 'scheduled' || c.status === 'ongoing'
  );
  const pastCamps = sortedCamps.filter(
    (c) => c.status === 'completed' || c.status === 'cancelled'
  );

  const displayedCamps = view === 'upcoming' ? upcomingCamps : pastCamps;

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCreateCamp = useCallback(
    async (campData: Omit<HealthCamp, 'id' | 'createdBy' | 'createdAt'>) => {
      const campsRef = ref(database, dbPaths.camps(centreId));
      const newCamp: Omit<HealthCamp, 'id'> = {
        ...campData,
        createdBy: profile?.email ?? 'unknown',
        createdAt: Date.now(),
      };
      await push(campsRef, newCamp);
      await log(`Scheduled health camp: ${campData.name} for ${campData.date}`, 'camp');
      setShowForm(false);
    },
    [centreId, profile, log]
  );

  const handleUpdateCamp = useCallback(
    async (campId: string, updates: Partial<HealthCamp>) => {
      const campRef = ref(database, dbPaths.camp(centreId, campId));
      // Firebase doesn't accept undefined — replace with null or remove the key
      const cleanUpdates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        cleanUpdates[key] = value === undefined ? null : value;
      }
      await update(campRef, cleanUpdates);

      const camp = camps.find((c) => c.id === campId);
      if (updates.status === 'completed' && camp) {
        await log(
          `Updated camp status: ${camp.name} → Completed (${updates.actualBeneficiaries ?? 0} beneficiaries)`,
          'camp'
        );
      } else if (updates.status === 'cancelled' && camp) {
        await log(`Updated camp status: ${camp.name} → Cancelled`, 'camp');
      }
      setEditingCamp(null);
    },
    [centreId, camps, log]
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading health camps">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{t('health_camps', lang)}</h2>
        {!readOnly && (
          <button
            onClick={() => { setShowForm(true); setEditingCamp(null); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span aria-hidden="true">+</span> {t('schedule_new_camp', lang)}
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setView('upcoming')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('upcoming_and_active', lang)} ({upcomingCamps.length})
        </button>
        <button
          onClick={() => setView('past')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === 'past' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('past', lang)} ({pastCamps.length})
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <CampForm
          onSubmit={handleCreateCamp}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit modal */}
      {editingCamp && (
        <CampEditForm
          camp={editingCamp}
          onSubmit={(updates) => handleUpdateCamp(editingCamp.id!, updates)}
          onCancel={() => setEditingCamp(null)}
        />
      )}

      {/* Camp cards */}
      {displayedCamps.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {view === 'upcoming' ? t('no_upcoming_camps', lang) : t('no_past_camps', lang)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedCamps.map((camp) => (
            <CampCard
              key={camp.id}
              camp={camp}
              readOnly={readOnly}
              onMarkComplete={() => setEditingCamp(camp)}
              onEdit={() => setEditingCamp(camp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ─── CampCard ───────────────────────────────────────────────────────────────

function CampCard({
  camp,
  readOnly,
  onMarkComplete,
  onEdit,
}: {
  camp: HealthCamp;
  readOnly: boolean;
  onMarkComplete: () => void;
  onEdit: () => void;
}) {
  const badge = STATUS_BADGES[camp.status];
  const typeColor = CAMP_TYPE_COLORS[camp.type];
  const typeLabel = CAMP_TYPE_LABELS[camp.type];

  const progress =
    camp.status === 'completed' && camp.actualBeneficiaries != null
      ? Math.min(100, Math.round((camp.actualBeneficiaries / camp.targetBeneficiaries) * 100))
      : null;

  return (
    <article className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Top row: status + type */}
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
          <span aria-hidden="true">{badge.emoji}</span> {badge.label}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
          {typeLabel}
        </span>
      </div>

      {/* Camp name and date */}
      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{camp.name}</h3>
      <p className="text-xs text-gray-500 mb-2">
        📅 {new Date(camp.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      {/* Beneficiaries */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Target: {camp.targetBeneficiaries}</span>
          {camp.actualBeneficiaries != null && <span>Actual: {camp.actualBeneficiaries}</span>}
        </div>
        {progress != null && (
          <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-2 rounded-full transition-all ${progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Organizer and location */}
      <div className="text-xs text-gray-500 space-y-0.5 mb-3">
        <p>🏢 {camp.organizer}</p>
        <p>📍 {camp.location}</p>
      </div>

      {/* Actions */}
      {!readOnly && (camp.status === 'scheduled' || camp.status === 'ongoing') && (
        <div className="flex gap-2">
          <button
            onClick={onMarkComplete}
            className="flex-1 text-xs font-medium px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            ✅ Mark Complete
          </button>
          <button
            onClick={onEdit}
            className="text-xs font-medium px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✏️ Edit
          </button>
        </div>
      )}
    </article>
  );
}

// ─── CampForm (Create) ─────────────────────────────────────────────────────

function CampForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Omit<HealthCamp, 'id' | 'createdBy' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [name, setName] = useState('');
  const [type, setType] = useState<CampType>('screening');
  const [date, setDate] = useState('');
  const [targetBeneficiaries, setTargetBeneficiaries] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date || !targetBeneficiaries || !organizer || !location) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        type,
        date,
        status: 'scheduled',
        targetBeneficiaries: parseInt(targetBeneficiaries, 10),
        organizer,
        location,
        notes: notes || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">{t('schedule_new_camp', lang)}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="camp-name" className="block text-sm font-medium text-gray-700 mb-1">{t('camp_name', lang)} *</label>
          <input
            id="camp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. World Diabetes Day — Free Sugar Test"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="camp-type" className="block text-sm font-medium text-gray-700 mb-1">{t('type', lang)} *</label>
          <select
            id="camp-type"
            value={type}
            onChange={(e) => setType(e.target.value as CampType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(CAMP_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="camp-date" className="block text-sm font-medium text-gray-700 mb-1">{t('date', lang)} *</label>
          <input
            id="camp-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="camp-target" className="block text-sm font-medium text-gray-700 mb-1">{t('target_beneficiaries', lang)} *</label>
          <input
            id="camp-target"
            type="number"
            min="1"
            value={targetBeneficiaries}
            onChange={(e) => setTargetBeneficiaries(e.target.value)}
            placeholder="e.g. 100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="camp-organizer" className="block text-sm font-medium text-gray-700 mb-1">{t('organizer', lang)} *</label>
          <input
            id="camp-organizer"
            type="text"
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            placeholder="e.g. PHC Borsad + Lions Club"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="camp-location" className="block text-sm font-medium text-gray-700 mb-1">{t('location', lang)} *</label>
          <input
            id="camp-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Village Panchayat Hall, Borsad"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="camp-notes" className="block text-sm font-medium text-gray-700 mb-1">{t('notes', lang)}</label>
          <textarea
            id="camp-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional remarks..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('cancel', lang)}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? t('scheduling', lang) : t('schedule_camp_btn', lang)}
          </button>
        </div>
      </form>
    </div>
  );
}


// ─── CampEditForm (Update status / actual beneficiaries) ────────────────────

function CampEditForm({
  camp,
  onSubmit,
  onCancel,
}: {
  camp: HealthCamp;
  onSubmit: (updates: Partial<HealthCamp>) => Promise<void>;
  onCancel: () => void;
}) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [status, setStatus] = useState<CampStatus>(camp.status);
  const [actualBeneficiaries, setActualBeneficiaries] = useState(
    camp.actualBeneficiaries?.toString() ?? ''
  );
  const [notes, setNotes] = useState(camp.notes ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updates: Partial<HealthCamp> = { status, notes: notes || null };
      if (actualBeneficiaries) {
        updates.actualBeneficiaries = parseInt(actualBeneficiaries, 10);
      }
      await onSubmit(updates);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-yellow-200 rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-1">{t('update_camp', lang)}</h3>
      <p className="text-sm text-gray-500 mb-4">{camp.name}</p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">{t('status', lang)}</label>
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CampStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label htmlFor="edit-actual" className="block text-sm font-medium text-gray-700 mb-1">
            {t('actual_beneficiaries', lang)}
          </label>
          <input
            id="edit-actual"
            type="number"
            min="0"
            value={actualBeneficiaries}
            onChange={(e) => setActualBeneficiaries(e.target.value)}
            placeholder={`Target: ${camp.targetBeneficiaries}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">{t('notes', lang)}</label>
          <textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('cancel', lang)}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? t('updating', lang) : t('update_camp', lang)}
          </button>
        </div>
      </form>
    </div>
  );
}

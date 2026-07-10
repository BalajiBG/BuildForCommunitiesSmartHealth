'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ref, onValue, push, update } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { logAudit } from '@/lib/services/audit';
import { t } from '@/lib/i18n/translations';
import type { Directive, DirectiveType, DirectivePriority } from '@/lib/types';

const DIRECTIVE_TYPE_KEYS: Record<DirectiveType, string> = {
  indent: 'directive_indent',
  staff_rotation: 'directive_staff_rotation',
  inspection: 'directive_inspection',
  patient_diversion: 'directive_patient_diversion',
  equipment_request: 'directive_equipment_request',
  general: 'directive_general',
};

const PRIORITY_COLOURS: Record<DirectivePriority, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  issued: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  acknowledged: { bg: 'bg-blue-100', text: 'text-blue-800' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
};

interface CentreOption {
  id: string;
  name: string;
}

export default function DirectivesPage() {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [centres, setCentres] = useState<CentreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formType, setFormType] = useState<DirectiveType>('general');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetCentre, setFormTargetCentre] = useState('');
  const [formPriority, setFormPriority] = useState<DirectivePriority>('normal');

  const districtId = profile?.districtId ?? '';

  // Load centres for the dropdown
  useEffect(() => {
    if (!districtId) return;
    const centresRef = ref(database, 'centres');
    const unsub = onValue(centresRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const list: CentreOption[] = [];
      for (const [id, val] of Object.entries(data)) {
        const c = val as { name: string; districtId: string };
        if (c.districtId === districtId) {
          list.push({ id, name: c.name });
        }
      }
      setCentres(list.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsub();
  }, [districtId]);

  // Load directives
  useEffect(() => {
    if (!districtId) return;
    const directivesRef = ref(database, dbPaths.directives(districtId));
    const unsub = onValue(directivesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setDirectives([]);
        setLoading(false);
        return;
      }
      const list: Directive[] = Object.entries(data).map(([id, val]) => ({
        ...(val as Directive),
        id,
      }));
      list.sort((a, b) => b.issuedAt - a.issuedAt);
      setDirectives(list);
      setLoading(false);
    });
    return () => unsub();
  }, [districtId]);

  const handleCreateDirective = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !districtId || !formTargetCentre) return;

    const targetCentre = centres.find((c) => c.id === formTargetCentre);
    if (!targetCentre) return;

    setSubmitting(true);
    try {
      const newDirective: Omit<Directive, 'id'> = {
        type: formType,
        title: formTitle.trim(),
        description: formDescription.trim(),
        targetCentreId: formTargetCentre,
        targetCentreName: targetCentre.name,
        status: 'issued',
        priority: formPriority,
        issuedBy: profile.email ?? 'unknown',
        issuedAt: Date.now(),
      };

      await push(ref(database, dbPaths.directives(districtId)), newDirective);

      // Audit log
      await logAudit({
        userEmail: profile.email ?? 'unknown',
        userRole: profile.role ?? 'unknown',
        action: `Issued directive: ${formTitle.trim()} to ${targetCentre.name}`,
        category: 'directive',
        centreId: formTargetCentre,
      });

      // Reset form
      setFormTitle('');
      setFormDescription('');
      setFormTargetCentre('');
      setFormType('general');
      setFormPriority('normal');
      setFormOpen(false);
    } catch (err) {
      console.error('Failed to create directive:', err);
    } finally {
      setSubmitting(false);
    }
  }, [profile, districtId, formType, formTitle, formDescription, formTargetCentre, formPriority, centres]);

  const handleMarkCompleted = useCallback(async (directive: Directive) => {
    if (!directive.id || !districtId) return;
    const updates: Partial<Directive> = {
      status: 'completed',
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await update(ref(database, dbPaths.directive(districtId, directive.id)), updates);
  }, [districtId]);

  // Summary stats
  const activeDirectives = directives.filter((d) => d.status !== 'completed' && d.status !== 'rejected');
  const criticalActive = activeDirectives.filter((d) => d.priority === 'critical');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const completedToday = directives.filter(
    (d) => d.status === 'completed' && d.completedAt && d.completedAt >= todayStart.getTime()
  );

  if (profile?.role !== 'District_Admin') {
    return (
      <div className="p-6">
        <p className="text-gray-500">{t('only_district_admin', lang)}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin_directives', lang)}</h1>
      <p className="text-sm text-gray-500">{t('directives_desc', lang)}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{t('total_active', lang)}</p>
          <p className="text-2xl font-bold text-gray-900">{activeDirectives.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-sm text-red-600">{t('critical', lang)}</p>
          <p className="text-2xl font-bold text-red-700">{criticalActive.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-600">{t('completed_today', lang)}</p>
          <p className="text-2xl font-bold text-green-700">{completedToday.length}</p>
        </div>
      </div>

      {/* Create Directive Form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-gray-900">{t('create_new_directive', lang)}</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${formOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {formOpen && (
          <form onSubmit={handleCreateDirective} className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('type', lang)}</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as DirectiveType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Object.entries(DIRECTIVE_TYPE_KEYS).map(([key, tKey]) => (
                    <option key={key} value={key}>{t(tKey, lang)}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('priority', lang)}</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as DirectivePriority)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('title', lang)}</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Emergency Insulin supply for CHC Anand"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('description', lang)}</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Provide details about the directive..."
                required
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Target Centre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('target_centre', lang)}</label>
              <select
                value={formTargetCentre}
                onChange={(e) => setFormTargetCentre(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">{t('select_a_centre', lang)}</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !formTitle.trim() || !formDescription.trim() || !formTargetCentre}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('issuing', lang) : t('issue_directive_btn', lang)}
            </button>
          </form>
        )}
      </div>

      {/* Directives List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : directives.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{t('no_directives_yet', lang)}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Directives */}
          {activeDirectives.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('active_directives_heading', lang)}</h2>
              <div className="space-y-3">
                {activeDirectives.map((d) => (
                  <DirectiveCard key={d.id} directive={d} onMarkCompleted={handleMarkCompleted} />
                ))}
              </div>
            </div>
          )}

          {/* Completed / Rejected */}
          {directives.filter((d) => d.status === 'completed' || d.status === 'rejected').length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('completed_closed', lang)}</h2>
              <div className="space-y-3">
                {directives
                  .filter((d) => d.status === 'completed' || d.status === 'rejected')
                  .map((d) => (
                    <DirectiveCard key={d.id} directive={d} onMarkCompleted={handleMarkCompleted} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DirectiveCard({
  directive,
  onMarkCompleted,
}: {
  directive: Directive;
  onMarkCompleted: (d: Directive) => void;
}) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [translatedCache, setTranslatedCache] = useState<Record<string, string>>({});
  const priority = PRIORITY_COLOURS[directive.priority];
  const status = STATUS_BADGES[directive.status] ?? STATUS_BADGES.issued;
  const isActive = directive.status !== 'completed' && directive.status !== 'rejected';

  const translateText = (text: string): string => {
    if (lang === 'en') return text;
    const map: Record<string, string> = {
      'Discuss about dental camp': 'दंत शिविर के बारे में चर्चा करें',
      'give all the advertisement planning to get more beneficiaries for dental camp': 'दंत शिविर के लिए अधिक लाभार्थी प्राप्त करने हेतु विज्ञापन योजना दें',
      'plan on health camp': 'स्वास्थ्य शिविर की योजना बनाएं',
      'come up with beneficiary details': 'लाभार्थी विवरण तैयार करें',
      'Emergency Insulin supply for CHC Anand': 'CHC आनंद के लिए आपातकालीन इंसुलिन आपूर्ति',
      'Arrange emergency insulin supply from district warehouse': 'जिला गोदाम से आपातकालीन इंसुलिन आपूर्ति की व्यवस्था करें',
      'Rotate 1 MO from PHC Petlad to PHC Khambhat': 'PHC पेटलाद से 1 MO PHC खंभात में स्थानांतरित करें',
      'PHC Khambhat is critically understaffed. Deploy 1 Medical Officer from PHC Petlad temporarily.': 'PHC खंभात में गंभीर कर्मचारी कमी है। PHC पेटलाद से 1 चिकित्सा अधिकारी अस्थायी तैनात करें।',
      'Quarterly inspection of PHC Borsad cold chain': 'PHC बोरसद कोल्ड चेन का तिमाही निरीक्षण',
      'Schedule and conduct quarterly cold chain inspection at PHC Borsad': 'PHC बोरसद में तिमाही कोल्ड चेन निरीक्षण निर्धारित और संचालित करें',
      'Dr. Patel from PHC Petlad has been notified. Will report tomorrow morning.': 'PHC पेटलाद के डॉ. पटेल को सूचित किया गया। कल सुबह रिपोर्ट करेंगे।',
      'Infrastructure audit planning and report': 'अवसंरचना ऑडिट योजना और रिपोर्ट',
      'provide all infra details and report for the year by next week': 'अगले सप्ताह तक वर्ष की सभी अवसंरचना विवरण और रिपोर्ट प्रदान करें',
    };
    if (map[text]) return map[text];
    const lower = text.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
      if (k.toLowerCase() === lower) return v;
    }
    // Fallback: call translate API asynchronously
    if (!translatedCache[text]) {
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: 'hi' }),
      }).then(r => r.json()).then(data => {
        if (data.translated && data.translated !== text) {
          setTranslatedCache(prev => ({ ...prev, [text]: data.translated }));
        }
      }).catch(() => {});
    }
    return translatedCache[text] || text;
  };

  return (
    <div className={`rounded-xl border ${priority.border} ${priority.bg} p-4`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Type Badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
              {t(DIRECTIVE_TYPE_KEYS[directive.type], lang)}
            </span>
            {/* Priority Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${priority.text}`}>
              {lang === 'hi' ? (directive.priority === 'critical' ? 'गंभीर' : directive.priority === 'high' ? 'उच्च' : 'सामान्य') : directive.priority.toUpperCase()}
            </span>
            {/* Status Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}`}>
              {lang === 'hi' ? (directive.status === 'issued' ? 'जारी' : directive.status === 'acknowledged' ? 'स्वीकृत' : directive.status === 'in_progress' ? 'प्रगति में' : directive.status === 'completed' ? 'पूर्ण' : directive.status) : directive.status.replace('_', ' ')}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">{translateText(directive.title)}</h3>
          <p className="text-xs text-gray-600 mt-1">{translateText(directive.description)}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            <span>📍 {directive.targetCentreName}</span>
            <span>🕒 {new Date(directive.issuedAt).toLocaleString()}</span>
            {directive.remarks && <span>💬 {translateText(directive.remarks)}</span>}
          </div>
        </div>

        {/* Mark Completed Button */}
        {isActive && (
          <button
            onClick={() => onMarkCompleted(directive)}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {t('mark_completed', lang)}
          </button>
        )}
      </div>
    </div>
  );
}

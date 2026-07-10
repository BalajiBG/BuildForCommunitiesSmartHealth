'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { validateBedAvailability } from '@/lib/services/validation';
import { isFullCapacity } from '@/lib/services/alert';
import { useAuditLog } from '@/lib/hooks/useAuditLog';
import { t } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/contexts/AuthProvider';

interface BedAvailabilityPanelProps {
  centreId: string;
  readOnly?: boolean;
}

/**
 * Formats a timestamp into a relative/friendly string.
 * - Less than 1 min ago: "just now"
 * - Less than 60 min: "X min ago"
 * - Less than 24 hours: "X hours ago"
 * - Today: time like "2:35 PM today"
 * - Otherwise: date string
 */
function formatLastUpdated(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const date = new Date(timestamp);
  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' today';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * BedAvailabilityPanel — Displays total beds and available beds for a Health Centre.
 * Subscribes to RTDB for real-time updates. Provides input to update available beds.
 * Shows full-capacity alert when availableBeds === 0.
 * Displays "Last updated" timestamp showing data freshness.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export default function BedAvailabilityPanel({ centreId, readOnly = false }: BedAvailabilityPanelProps) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [totalBeds, setTotalBeds] = useState<number>(0);
  const [availableBeds, setAvailableBeds] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { log: auditLog } = useAuditLog(centreId);

  // Re-render relative time every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const centreRef = ref(database, dbPaths.centre(centreId));
    const unsubscribe = onValue(centreRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTotalBeds(data.totalBeds ?? 0);
        setAvailableBeds(data.availableBeds ?? 0);
        setLastUpdated(data.lastUpdated ?? null);
        setInputValue(String(data.availableBeds ?? 0));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [centreId]);

  const handleUpdate = async () => {
    setError(null);
    const parsed = Number(inputValue);

    if (!validateBedAvailability(parsed, totalBeds)) {
      setError(`Available beds must be an integer between 0 and ${totalBeds}.`);
      return;
    }

    try {
      const centreRef = ref(database, dbPaths.centre(centreId));
      await update(centreRef, { availableBeds: parsed, lastUpdated: Date.now() });
      auditLog(`Updated bed availability: ${availableBeds} → ${parsed}`, 'beds');
    } catch {
      setError('Failed to update bed availability. Please try again.');
      setInputValue(String(availableBeds));
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow" aria-busy="true">
        <p className="text-gray-500">{t('loading_beds', lang)}</p>
      </div>
    );
  }

  const fullCapacity = isFullCapacity(availableBeds);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{t('bed_availability', lang)}</h3>
        {lastUpdated && (
          <span className="text-xs text-gray-400" title={new Date(lastUpdated).toLocaleString()}>
            {t('last_updated', lang)}: {formatLastUpdated(lastUpdated)}
          </span>
        )}
      </div>

      <div className="flex gap-6 mb-4">
        <div>
          <span className="text-sm text-gray-500">{t('total_beds', lang)}</span>
          <p className="text-2xl font-bold" data-testid="total-beds">
            {totalBeds}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">{t('available_beds', lang)}</span>
          <p className="text-2xl font-bold" data-testid="available-beds">
            {availableBeds}
          </p>
        </div>
      </div>

      {fullCapacity && (
        <div
          className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
          role="alert"
          data-testid="full-capacity-alert"
        >
          <strong>{t('full_capacity', lang)}:</strong> {t('no_beds_available', lang)}
        </div>
      )}

      {!readOnly && (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="available-beds-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('update_available_beds', lang)}
            </label>
            <input
              id="available-beds-input"
              type="number"
              min={0}
              max={totalBeds}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby={error ? 'bed-error' : undefined}
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('update', lang)}
          </button>
        </div>
      )}

      {error && (
        <p
          id="bed-error"
          className="mt-2 text-sm text-red-600"
          role="alert"
          data-testid="bed-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

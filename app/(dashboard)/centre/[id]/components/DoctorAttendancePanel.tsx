'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { validateDoctorAttendance } from '@/lib/services/validation';
import { isUnderstaffed } from '@/lib/services/alert';
import { useAuditLog } from '@/lib/hooks/useAuditLog';
import { t } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/contexts/AuthProvider';

interface DoctorAttendancePanelProps {
  centreId: string;
  readOnly?: boolean;
}

/**
 * Formats today's date as YYYY-MM-DD.
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * DoctorAttendancePanel — Displays doctors present vs assigned for a Health Centre.
 * Allows Centre_Staff to record today's attendance count.
 * Shows understaffed warning when presentCount < 50% of assignedDoctors.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */
export default function DoctorAttendancePanel({ centreId, readOnly = false }: DoctorAttendancePanelProps) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [assignedDoctors, setAssignedDoctors] = useState<number>(0);
  const [presentCount, setPresentCount] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const { log: auditLog } = useAuditLog(centreId);

  const today = getTodayDate();

  // Subscribe to centre data for assignedDoctors
  useEffect(() => {
    const centreRef = ref(database, dbPaths.centre(centreId));
    const unsubscribe = onValue(centreRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.assignedDoctors === 'number') {
        setAssignedDoctors(data.assignedDoctors);
      }
    });

    return () => unsubscribe();
  }, [centreId]);

  // Subscribe to today's attendance data
  useEffect(() => {
    const attendanceRef = ref(database, dbPaths.attendance(centreId, today));
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.presentCount === 'number') {
        setPresentCount(data.presentCount);
      } else {
        setPresentCount(null);
      }
    });

    return () => unsubscribe();
  }, [centreId, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    const numericValue = Number(inputValue);

    // Validate using the validation service
    if (!validateDoctorAttendance(numericValue, assignedDoctors)) {
      setError(
        `Invalid attendance count. Please enter a whole number between 0 and ${assignedDoctors}.`
      );
      return;
    }

    setSaving(true);

    try {
      const attendanceRef = ref(database, dbPaths.attendance(centreId, today));
      await set(attendanceRef, { presentCount: numericValue });
      setSaveSuccess(true);
      setInputValue('');
      auditLog(`Recorded doctor attendance: ${numericValue} present`, 'attendance');
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const understaffed = presentCount !== null && isUnderstaffed(presentCount, assignedDoctors);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('doctor_attendance', lang)}</h3>
        {understaffed && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800"
            role="alert"
            aria-label="Understaffed warning"
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.345 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            {t('understaffed', lang)}
          </span>
        )}
      </div>

      {/* Present vs Assigned display */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {presentCount !== null ? presentCount : '—'}
          </span>
          <span className="text-lg text-gray-500">/ {assignedDoctors}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {t('doctors_present_today', lang)} ({today})
        </p>
      </div>

      {/* Attendance input form — Centre Staff only */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor={`attendance-input-${centreId}`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('record_attendance', lang)}
            </label>
            <div className="flex gap-2">
              <input
                id={`attendance-input-${centreId}`}
                type="number"
                min={0}
                max={assignedDoctors}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError(null);
                }}
                placeholder={`0 – ${assignedDoctors}`}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={saving}
                aria-describedby={error ? `attendance-error-${centreId}` : undefined}
              />
              <button
                type="submit"
                disabled={saving || inputValue === ''}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('saving', lang) : t('save', lang)}
              </button>
            </div>
          </div>

          {error && (
            <p
              id={`attendance-error-${centreId}`}
              className="text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}

          {saveSuccess && (
            <p className="text-sm text-green-600" role="status">
              {t('attendance_recorded', lang)}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ref, push, onValue, runTransaction } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { useAuditLog } from '@/lib/hooks/useAuditLog';
import type { Department, AgeGroup, Gender, VisitType, PatientVisit } from '@/lib/types';

interface FootfallInputFormProps {
  centreId: string;
}

const DEPARTMENTS: Department[] = [
  'General Medicine',
  'Dental',
  'Ophthalmology',
  'Dermatology',
  'Paediatrics',
  'Gynaecology/ANC',
  'Preventive Health Check',
  'Emergency',
];

const AGE_GROUPS: AgeGroup[] = [
  '0-5 years',
  '6-14 years',
  '15-30 years',
  '31-50 years',
  '51-65 years',
  '65+ years',
];

const GENDERS: Gender[] = ['Male', 'Female', 'Other'];

const VISIT_TYPES: VisitType[] = [
  'New OPD',
  'Follow-up OPD',
  'Emergency',
  'Lab/Investigation only',
];

/**
 * FootfallInputForm — Per-patient visit logging.
 * Captures department, age group, gender, and visit type for each patient.
 * Writes to /visits/{centreId}/{date}/{visitId} and increments /footfall/{centreId}/{date}/count.
 * Designed for quick repeated entry — fields persist between submissions.
 */
export default function FootfallInputForm({ centreId }: FootfallInputFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const { log: auditLog } = useAuditLog(centreId);

  const [department, setDepartment] = useState<Department>('General Medicine');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('31-50 years');
  const [gender, setGender] = useState<Gender>('Male');
  const [visitType, setVisitType] = useState<VisitType>('New OPD');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  // Listen to today's footfall count
  useEffect(() => {
    const footfallRef = ref(database, dbPaths.footfall(centreId, today));
    const unsubscribe = onValue(footfallRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.count === 'number') {
        setTodayCount(data.count);
      } else {
        setTodayCount(0);
      }
    });
    return () => unsubscribe();
  }, [centreId, today]);

  const handleSubmit = useCallback(async () => {
    setMessage(null);
    setIsSubmitting(true);

    try {
      const visit: PatientVisit = {
        department,
        ageGroup,
        gender,
        visitType,
        timestamp: Date.now(),
      };

      // Write detailed visit record
      const visitsRef = ref(database, dbPaths.visits(centreId, today));
      await push(visitsRef, visit);

      // Increment aggregate footfall count
      const footfallRef = ref(database, dbPaths.footfall(centreId, today));
      await runTransaction(footfallRef, (currentData) => {
        if (currentData === null) {
          return { count: 1 };
        }
        return { count: (currentData.count || 0) + 1 };
      });

      auditLog(`Recorded patient visit: ${department}, ${ageGroup}, ${gender}`, 'visit');

      setMessage({
        type: 'success',
        text: `✓ Visit recorded — ${department}, ${ageGroup}, ${gender}`,
      });

      // Clear message after 2 seconds for quick repeated entry
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to record visit. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [centreId, today, department, ageGroup, gender, visitType]);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      {/* Header with today's count */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Record Patient Visit</h3>
        <div className="text-right">
          <span className="text-xs text-gray-500">Today</span>
          <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Department */}
        <div>
          <label htmlFor="visit-department" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            id="visit-department"
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Age Group & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="visit-age" className="block text-sm font-medium text-gray-700 mb-1">
              Age Group
            </label>
            <select
              id="visit-age"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-1">Gender</legend>
              <div className="flex gap-3">
                {GENDERS.map((g) => (
                  <label key={g} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="visit-gender"
                      value={g}
                      checked={gender === g}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{g}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Visit Type */}
        <div>
          <label htmlFor="visit-type" className="block text-sm font-medium text-gray-700 mb-1">
            Visit Type
          </label>
          <select
            id="visit-type"
            value={visitType}
            onChange={(e) => setVisitType(e.target.value as VisitType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {VISIT_TYPES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Submit — large for mobile */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:bg-blue-800 transition-colors"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Recording...' : '+ Record Visit'}
        </button>

        {message && (
          <div
            role="alert"
            aria-live="polite"
            className={`p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

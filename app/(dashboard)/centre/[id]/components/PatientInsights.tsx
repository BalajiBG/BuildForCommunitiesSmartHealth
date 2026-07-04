'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import type { PatientVisit, Department, AgeGroup, Gender, VisitType } from '@/lib/types';

interface PatientInsightsProps {
  centreId: string;
}

const ALL_DEPARTMENTS: Department[] = [
  'General Medicine', 'Dental', 'Ophthalmology', 'Dermatology',
  'Paediatrics', 'Gynaecology/ANC', 'Preventive Health Check', 'Emergency',
];
const ALL_AGE_GROUPS: AgeGroup[] = ['0-5 years', '6-14 years', '15-30 years', '31-50 years', '51-65 years', '65+ years'];
const ALL_GENDERS: Gender[] = ['Male', 'Female', 'Other'];
const ALL_VISIT_TYPES: VisitType[] = ['New OPD', 'Follow-up OPD', 'Emergency', 'Lab/Investigation only'];

const DEPT_COLORS: Record<string, string> = {
  'General Medicine': 'bg-blue-500',
  'Dental': 'bg-teal-500',
  'Ophthalmology': 'bg-purple-500',
  'Dermatology': 'bg-pink-500',
  'Paediatrics': 'bg-yellow-500',
  'Gynaecology/ANC': 'bg-rose-500',
  'Preventive Health Check': 'bg-green-500',
  'Emergency': 'bg-red-500',
};

const GENDER_COLORS: Record<string, string> = {
  Male: 'bg-blue-500',
  Female: 'bg-pink-500',
  Other: 'bg-amber-500',
};

interface Filters {
  department: Department | null;
  ageGroup: AgeGroup | null;
  gender: Gender | null;
  visitType: VisitType | null;
}

/**
 * PatientInsights — Interactive bi-directional cross-filtering analytics.
 * Click ANY dimension (department, age, gender, visit type) to filter all others.
 * Multiple filters can be combined. Click again to deselect.
 */
export default function PatientInsights({ centreId }: PatientInsightsProps) {
  const today = new Date().toISOString().split('T')[0];
  const [allVisits, setAllVisits] = useState<PatientVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ department: null, ageGroup: null, gender: null, visitType: null });

  useEffect(() => {
    const visitsRef = ref(database, dbPaths.visits(centreId, today));
    const unsubscribe = onValue(visitsRef, (snapshot) => {
      const raw = snapshot.val() as Record<string, PatientVisit> | null;
      setAllVisits(raw ? Object.values(raw) : []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [centreId, today]);

  const toggleFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  }, []);

  const hasAnyFilter = filters.department || filters.ageGroup || filters.gender || filters.visitType;

  // Apply ALL active filters
  const filteredVisits = useMemo(() => {
    return allVisits.filter(v => {
      if (filters.department && v.department !== filters.department) return false;
      if (filters.ageGroup && v.ageGroup !== filters.ageGroup) return false;
      if (filters.gender && v.gender !== filters.gender) return false;
      if (filters.visitType && v.visitType !== filters.visitType) return false;
      return true;
    });
  }, [allVisits, filters]);

  // Counts for each dimension — all use the SAME filtered dataset
  // This ensures consistency: if filtered set is empty, all counts are zero
  const counts = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    const ageCounts: Record<string, number> = {};
    const genderCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    for (const v of filteredVisits) {
      deptCounts[v.department] = (deptCounts[v.department] || 0) + 1;
      ageCounts[v.ageGroup] = (ageCounts[v.ageGroup] || 0) + 1;
      genderCounts[v.gender] = (genderCounts[v.gender] || 0) + 1;
      typeCounts[v.visitType] = (typeCounts[v.visitType] || 0) + 1;
    }

    const genderTotal = Object.values(genderCounts).reduce((s, n) => s + n, 0);

    return { deptCounts, ageCounts, genderCounts, typeCounts, genderTotal };
  }, [filteredVisits]);

  if (loading) {
    return (
      <div className="p-5 border rounded-xl bg-white shadow-sm animate-pulse" aria-busy="true">
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    );
  }

  if (allVisits.length === 0) {
    return (
      <div className="p-5 border rounded-xl bg-white shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Patient Insights — Today</h3>
        <p className="text-sm text-gray-500">No detailed visit data recorded for today yet.</p>
      </div>
    );
  }

  const activeFilterLabels = [
    filters.department,
    filters.ageGroup,
    filters.gender,
    filters.visitType,
  ].filter(Boolean);

  return (
    <div className="p-5 border rounded-xl bg-white shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Patient Insights — Today</h3>
          {hasAnyFilter && (
            <p className="text-xs text-indigo-600 mt-0.5">
              {filteredVisits.length} of {allVisits.length} visits
              {activeFilterLabels.length > 0 && ` • ${activeFilterLabels.join(' + ')}`}
            </p>
          )}
        </div>
        <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">
          {hasAnyFilter ? `${filteredVisits.length} / ${allVisits.length}` : `${allVisits.length}`} visits
        </span>
      </div>

      {/* Department Breakdown — clickable */}
      <section>
        <h4 className="text-sm font-medium text-gray-600 mb-2">
          Department
          <span className="text-xs text-gray-400 ml-1">(click to filter)</span>
        </h4>
        <div className="space-y-1">
          {ALL_DEPARTMENTS.map((dept) => {
            const count = counts.deptCounts[dept] || 0;
            const maxCount = Math.max(...Object.values(counts.deptCounts), 1);
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
            const isSelected = filters.department === dept;

            return (
              <button
                key={dept}
                type="button"
                onClick={() => toggleFilter('department', dept)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all text-left ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                    : 'border-transparent hover:bg-gray-50'
                }`}
                aria-pressed={isSelected}
              >
                <span className={`text-xs w-36 truncate ${isSelected ? 'font-bold text-indigo-800' : count === 0 ? 'text-gray-400' : 'text-gray-600'}`}>{dept}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${DEPT_COLORS[dept] || 'bg-gray-400'} ${count === 0 ? 'opacity-20' : isSelected ? 'opacity-100' : 'opacity-70'}`}
                    style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className={`text-xs w-8 text-right font-medium ${count === 0 ? 'text-gray-300' : 'text-gray-600'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Age Distribution — clickable */}
      <section>
        <h4 className="text-sm font-medium text-gray-600 mb-2">
          Age Group
          <span className="text-xs text-gray-400 ml-1">(click to filter)</span>
        </h4>
        <div className="flex items-end gap-1 h-28">
          {ALL_AGE_GROUPS.map((group) => {
            const count = counts.ageCounts[group] || 0;
            const maxCount = Math.max(...Object.values(counts.ageCounts), 1);
            const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isSelected = filters.ageGroup === group;

            return (
              <button
                key={group}
                type="button"
                onClick={() => toggleFilter('ageGroup', group)}
                className={`flex-1 flex flex-col items-center gap-1 rounded-lg p-1 transition-all ${
                  isSelected ? 'bg-indigo-50 ring-2 ring-indigo-400' : 'hover:bg-gray-50'
                }`}
                aria-pressed={isSelected}
              >
                <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>{count}</span>
                <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '64px' }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t transition-all duration-300 ${isSelected ? 'bg-indigo-600' : 'bg-indigo-400'}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className={`text-[10px] text-center leading-tight ${isSelected ? 'font-bold text-indigo-700' : 'text-gray-500'}`}>
                  {group.replace(' years', '')}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Gender Split — clickable */}
      <section>
        <h4 className="text-sm font-medium text-gray-600 mb-2">
          Gender
          <span className="text-xs text-gray-400 ml-1">(click to filter)</span>
        </h4>
        <div className="flex gap-2">
          {ALL_GENDERS.map((g) => {
            const count = counts.genderCounts[g] || 0;
            const pct = counts.genderTotal > 0 ? Math.round((count / counts.genderTotal) * 100) : 0;
            const isSelected = filters.gender === g;

            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleFilter('gender', g)}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                aria-pressed={isSelected}
              >
                <div className={`w-4 h-4 rounded-full ${GENDER_COLORS[g]}`} />
                <span className={`text-lg font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{count}</span>
                <span className="text-xs text-gray-500">{g}</span>
                <span className="text-xs text-gray-400">{pct}%</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Visit Type — clickable */}
      <section>
        <h4 className="text-sm font-medium text-gray-600 mb-2">
          Visit Type
          <span className="text-xs text-gray-400 ml-1">(click to filter)</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {ALL_VISIT_TYPES.map((type) => {
            const count = counts.typeCounts[type] || 0;
            const isSelected = filters.visitType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleFilter('visitType', type)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-800 shadow-sm'
                    : count === 0
                    ? 'bg-gray-50 border-gray-100 text-gray-400'
                    : 'bg-gray-100 border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
                aria-pressed={isSelected}
              >
                {type}
                <span className={`font-bold ${isSelected ? 'text-indigo-700' : count === 0 ? 'text-gray-300' : 'text-gray-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

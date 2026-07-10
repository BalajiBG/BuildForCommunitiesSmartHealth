'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ref, onValue, off } from 'firebase/database';
import { useTranslations } from 'next-intl';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { t as tStatic } from '@/lib/i18n/translations';
import { getStockColour } from '@/lib/services/stock-analysis';
import { aggregateFootfall } from '@/lib/services/aggregation';
import { isFullCapacity, isUnderstaffed } from '@/lib/services/alert';
import { CentreCard } from './components/CentreCard';
import { AlertBanner, Alert, AlertType } from './components/AlertBanner';

interface CentreData {
  id: string;
  name: string;
  districtId: string;
  totalBeds: number;
  availableBeds: number;
  assignedDoctors: number;
  maxPatientCapacity: number;
}

interface CentreMetrics {
  centre: CentreData;
  stockColour: 'green' | 'yellow' | 'red';
  presentDoctors: number;
  footfallCount: number;
}

/**
 * Determines the worst (most critical) stock colour for a centre
 * from all its medicines.
 */
function worstStockColour(
  medicines: Record<string, { quantity: number; reorderLevel: number }> | null
): 'green' | 'yellow' | 'red' {
  if (!medicines) return 'green';

  let worst: 'green' | 'yellow' | 'red' = 'green';
  const priority = { green: 0, yellow: 1, red: 2 };

  for (const med of Object.values(medicines)) {
    const colour = getStockColour(med.quantity, med.reorderLevel);
    if (priority[colour] > priority[worst]) {
      worst = colour;
    }
    if (worst === 'red') break;
  }

  return worst;
}

/**
 * Gets today's date in YYYY-MM-DD format.
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/* ─── Skeleton Loaders ─── */

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-16" />
    </div>
  );
}

function CentreCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-3 w-3 rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

/* ─── Summary Stats Row ─── */

interface SummaryStatsProps {
  totalCentres: number;
  totalAvailableBeds: number;
  totalDoctorsPresent: number;
  totalFootfall: number;
}

function SummaryStats({ totalCentres, totalAvailableBeds, totalDoctorsPresent, totalFootfall }: SummaryStatsProps) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';

  const stats = [
    {
      label: tStatic('total_centres', lang),
      value: totalCentres,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
        </svg>
      ),
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: tStatic('beds_available', lang),
      value: totalAvailableBeds,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: tStatic('doctors_present', lang),
      value: totalDoctorsPresent,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: tStatic('todays_footfall', lang),
      value: totalFootfall,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl p-4 lg:p-5 border border-gray-100 shadow-sm card-hover"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
          <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Detail Panel ─── */

interface DetailPanelProps {
  metrics: CentreMetrics;
  onClose: () => void;
}

function DetailPanel({ metrics, onClose }: DetailPanelProps) {
  const { centre, presentDoctors, footfallCount } = metrics;
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const bedOccupancy = centre.totalBeds > 0 ? ((centre.totalBeds - centre.availableBeds) / centre.totalBeds) * 100 : 0;
  const doctorAttendance = centre.assignedDoctors > 0 ? (presentDoctors / centre.assignedDoctors) * 100 : 0;

  const bedBarColor = bedOccupancy >= 90 ? 'bg-rose-500' : bedOccupancy >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  const doctorBarColor = doctorAttendance < 50 ? 'bg-rose-500' : doctorAttendance < 75 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{centre.name}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close detail panel"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Bed Occupancy */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-600">{tStatic('bed_occupancy', lang)}</span>
          <span className="text-sm font-bold text-gray-900">
            {centre.availableBeds} {tStatic('available', lang).toLowerCase()} / {centre.totalBeds} {tStatic('total', lang).toLowerCase()}
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${bedBarColor}`}
            style={{ width: `${bedOccupancy}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{Math.round(bedOccupancy)}% occupied</p>
      </div>

      {/* Doctor Attendance */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-600">{tStatic('doctor_attendance', lang)}</span>
          <span className="text-sm font-bold text-gray-900">
            {presentDoctors} {tStatic('present', lang).toLowerCase()} / {centre.assignedDoctors} {tStatic('assigned', lang).toLowerCase()}
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${doctorBarColor}`}
            style={{ width: `${Math.min(doctorAttendance, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{Math.round(doctorAttendance)}% present</p>
      </div>

      {/* Footfall */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-600">{tStatic('todays_footfall', lang)}</span>
        <p className="text-3xl font-bold text-gray-900 mt-1">{footfallCount}</p>
      </div>

      {/* View Full Details Link */}
      <Link
        href={`/centre/${centre.id}`}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {tStatic('view_full_details', lang)}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}

/* ─── District Dashboard Content ─── */

function DistrictDashboardContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const tEval = useTranslations('evaluation');
  const lang = profile?.languagePreference ?? 'en';

  const [centreIds, setCentreIds] = useState<string[]>([]);
  const [centreMetrics, setCentreMetrics] = useState<Map<string, CentreMetrics>>(new Map());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCentres, setHasCentres] = useState<boolean | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<Map<string, { isUnderperforming: boolean; breachedMetrics: string[] }>>(new Map());
  const [evaluationUnavailable, setEvaluationUnavailable] = useState(false);
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);

  const districtId = profile?.districtId;

  // Subscribe to centre IDs for this district
  useEffect(() => {
    if (!districtId) return;

    const centresRef = ref(database, dbPaths.districtCentres(districtId));

    const unsubscribe = onValue(centresRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const ids = Object.keys(data);
        setCentreIds(ids);
        setHasCentres(ids.length > 0);
      } else {
        setCentreIds([]);
        setHasCentres(false);
      }
      setLoading(false);
    });

    return () => off(centresRef);
  }, [districtId]);

  // Subscribe to each centre's data, medicines, attendance, footfall
  useEffect(() => {
    if (centreIds.length === 0) return;

    const today = getTodayDate();
    const unsubscribers: (() => void)[] = [];

    for (const centreId of centreIds) {
      const centreRef = ref(database, dbPaths.centre(centreId));
      const medicinesRef = ref(database, `medicines/${centreId}`);
      const attendanceRef = ref(database, dbPaths.attendance(centreId, today));
      const footfallRef = ref(database, dbPaths.footfall(centreId, today));

      onValue(centreRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setCentreMetrics((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(centreId);
            updated.set(centreId, {
              centre: { id: centreId, ...data },
              stockColour: existing?.stockColour ?? 'green',
              presentDoctors: existing?.presentDoctors ?? 0,
              footfallCount: existing?.footfallCount ?? 0,
            });
            return updated;
          });
        }
      });
      unsubscribers.push(() => off(centreRef));

      onValue(medicinesRef, (snapshot) => {
        const medicines = snapshot.exists() ? snapshot.val() : null;
        const colour = worstStockColour(medicines);
        setCentreMetrics((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(centreId);
          if (existing) {
            updated.set(centreId, { ...existing, stockColour: colour });
          }
          return updated;
        });
      });
      unsubscribers.push(() => off(medicinesRef));

      onValue(attendanceRef, (snapshot) => {
        const presentCount = snapshot.exists() ? snapshot.val().presentCount ?? 0 : 0;
        setCentreMetrics((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(centreId);
          if (existing) {
            updated.set(centreId, { ...existing, presentDoctors: presentCount });
          }
          return updated;
        });
      });
      unsubscribers.push(() => off(attendanceRef));

      onValue(footfallRef, (snapshot) => {
        const count = snapshot.exists() ? snapshot.val().count ?? 0 : 0;
        setCentreMetrics((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(centreId);
          if (existing) {
            updated.set(centreId, { ...existing, footfallCount: count });
          }
          return updated;
        });
      });
      unsubscribers.push(() => off(footfallRef));
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [centreIds]);

  // Subscribe to district alerts
  useEffect(() => {
    if (!districtId) return;

    const alertsRef = ref(database, dbPaths.districtAlerts(districtId));

    const unsubscribe = onValue(alertsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const activeAlerts: Alert[] = [];
        for (const [alertId, alertData] of Object.entries(data)) {
          const alert = alertData as {
            type: AlertType;
            centreId: string;
            message: string;
            resolved?: boolean;
          };
          if (!alert.resolved) {
            activeAlerts.push({
              id: alertId,
              type: alert.type,
              centreId: alert.centreId,
              message: alert.message,
            });
          }
        }
        setAlerts(activeAlerts);
      } else {
        setAlerts([]);
      }
    });

    return () => off(alertsRef);
  }, [districtId]);

  // Evaluate centres for underperformance flags
  useEffect(() => {
    if (!districtId) return;

    const controller = new AbortController();

    async function fetchEvaluation() {
      try {
        const response = await fetch('/api/ai/evaluate-centres', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ districtId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          setEvaluationUnavailable(true);
          return;
        }

        const data = await response.json();
        const evaluations: { centreId: string; isUnderperforming: boolean; breachedMetrics: string[] }[] = data.evaluations ?? [];

        const resultsMap = new Map<string, { isUnderperforming: boolean; breachedMetrics: string[] }>();
        for (const evaluation of evaluations) {
          resultsMap.set(evaluation.centreId, {
            isUnderperforming: evaluation.isUnderperforming,
            breachedMetrics: evaluation.breachedMetrics,
          });
        }
        setEvaluationResults(resultsMap);
        setEvaluationUnavailable(false);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setEvaluationUnavailable(true);
      }
    }

    fetchEvaluation();

    return () => controller.abort();
  }, [districtId]);

  // Compute derived alerts from live centre metrics
  const computedAlerts: Alert[] = [];
  centreMetrics.forEach((metrics, centreId) => {
    const { centre, stockColour, presentDoctors } = metrics;

    if (stockColour === 'red') {
      computedAlerts.push({
        id: `stock-${centreId}`,
        type: 'stock_low',
        centreId,
        message: centre.name,
      });
    }

    if (isFullCapacity(centre.availableBeds)) {
      computedAlerts.push({
        id: `capacity-${centreId}`,
        type: 'full_capacity',
        centreId,
        message: centre.name,
      });
    }

    if (isUnderstaffed(presentDoctors, centre.assignedDoctors)) {
      computedAlerts.push({
        id: `staffing-${centreId}`,
        type: 'understaffed',
        centreId,
        message: centre.name,
      });
    }
  });

  // Merge RTDB alerts with computed alerts (deduplicate by type+centreId)
  const allAlerts = [...alerts];
  for (const computed of computedAlerts) {
    const exists = allAlerts.some(
      (a) => a.type === computed.type && a.centreId === computed.centreId
    );
    if (!exists) {
      allAlerts.push(computed);
    }
  }

  // Aggregate stats
  const totalFootfall = aggregateFootfall(
    Array.from(centreMetrics.values()).map((m) => ({
      centreId: m.centre.id,
      count: m.footfallCount,
    }))
  );
  const totalAvailableBeds = Array.from(centreMetrics.values()).reduce((sum, m) => sum + m.centre.availableBeds, 0);
  const totalDoctorsPresent = Array.from(centreMetrics.values()).reduce((sum, m) => sum + m.presentDoctors, 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <CentreCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (hasCentres === false) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
          </svg>
          <p className="text-gray-500 text-lg">{tStatic('no_data', lang)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{tStatic('district_dashboard', lang)}</h1>
      </div>

      {/* Alert Banner */}
      <AlertBanner alerts={allAlerts} />

      {/* Evaluation Unavailable Notification */}
      {evaluationUnavailable && (
        <div
          className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 animate-slide-down"
          role="alert"
        >
          <span aria-hidden="true">⚠️</span>
          <span className="text-sm text-amber-800">{tEval('unavailable')}</span>
        </div>
      )}

      {/* Summary Stats */}
      <SummaryStats
        totalCentres={centreMetrics.size}
        totalAvailableBeds={totalAvailableBeds}
        totalDoctorsPresent={totalDoctorsPresent}
        totalFootfall={totalFootfall}
      />

      {/* Centre Cards Grid + Detail Panel */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Centre Cards Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${selectedCentreId ? 'lg:grid-cols-2 lg:flex-1' : 'lg:grid-cols-3 w-full'}`}>
          {Array.from(centreMetrics.values()).map((metrics) => {
            const evaluation = evaluationResults.get(metrics.centre.id);
            return (
              <CentreCard
                key={metrics.centre.id}
                id={metrics.centre.id}
                name={metrics.centre.name}
                stockColour={metrics.stockColour}
                availableBeds={metrics.centre.availableBeds}
                totalBeds={metrics.centre.totalBeds}
                presentDoctors={metrics.presentDoctors}
                assignedDoctors={metrics.centre.assignedDoctors}
                footfallCount={metrics.footfallCount}
                isUnderperforming={evaluation?.isUnderperforming}
                breachedMetrics={evaluation?.breachedMetrics}
                onClick={(id) => router.push(`/centre/${id}`)}
                isSelected={metrics.centre.id === selectedCentreId}
              />
            );
          })}
        </div>

        {/* Detail Panel — slides in when a centre is selected */}
        {selectedCentreId && centreMetrics.get(selectedCentreId) && (
          <div className="w-full lg:w-96 lg:flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <DetailPanel
                metrics={centreMetrics.get(selectedCentreId)!}
                onClose={() => setSelectedCentreId(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Role-Based Routing ─── */

/**
 * Dashboard page — handles both District_Admin and Centre_Staff roles.
 * - District_Admin sees the full district dashboard
 * - Centre_Staff gets redirected to their assigned centre's detail page
 */
export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.role === 'Centre_Staff' && profile.centreId) {
      router.replace(`/centre/${profile.centreId}`);
    }
  }, [loading, profile, router]);

  // While loading or redirecting Centre_Staff, show skeleton
  if (loading || (profile?.role === 'Centre_Staff' && profile.centreId)) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  // District_Admin or any role without centreId — show dashboard
  return <DistrictDashboardContent />;
}

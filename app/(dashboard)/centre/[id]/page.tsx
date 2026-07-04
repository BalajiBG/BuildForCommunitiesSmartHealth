'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { StockTable } from './components/StockTable';
import FootfallChart from './components/FootfallChart';
import FootfallInputForm from './components/FootfallInputForm';
import PatientInsights from './components/PatientInsights';
import BedAvailabilityPanel from './components/BedAvailabilityPanel';
import DoctorAttendancePanel from './components/DoctorAttendancePanel';
import InfrastructurePanel from './components/InfrastructurePanel';
import AddMedicineForm from './components/AddMedicineForm';
import AuditLog from './components/AuditLog';
import HealthCampsPanel from './components/HealthCampsPanel';
import TabBar, { CentreTab } from './components/TabBar';
import DirectivesNotice from './components/DirectivesNotice';

interface CentreInfo {
  name: string;
  districtId: string;
  totalBeds: number;
  availableBeds: number;
  assignedDoctors: number;
  maxPatientCapacity: number;
}

/**
 * CentreDetailPage — Tabbed detailed view for a single Health Centre.
 * Tabs: Overview, Infrastructure, Medicine Stock, Audit Log.
 *
 * Validates: Requirements 2.3
 */
export default function CentreDetailPage() {
  return <CentreDetailContent />;
}

function CentreDetailContent() {
  const params = useParams();
  const centreId = params.id as string;
  const { profile } = useAuth();

  // Centre Staff can only edit their own centre — view-only for other centres
  const isOwnCentre = profile?.role === 'Centre_Staff' && profile.centreId === centreId;
  const isAdmin = profile?.role === 'District_Admin';
  const isStaff = isOwnCentre; // Only allow editing if it's their own centre

  const [centreInfo, setCentreInfo] = useState<CentreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CentreTab>('overview');

  useEffect(() => {
    const centreRef = ref(database, dbPaths.centre(centreId));
    const unsubscribe = onValue(centreRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCentreInfo({
          name: data.name ?? 'Unknown Centre',
          districtId: data.districtId ?? '',
          totalBeds: data.totalBeds ?? 0,
          availableBeds: data.availableBeds ?? 0,
          assignedDoctors: data.assignedDoctors ?? 0,
          maxPatientCapacity: data.maxPatientCapacity ?? 0,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [centreId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading centre details">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Back link and heading */}
      <div className="mb-6">
        {profile?.role === 'District_Admin' && (
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        )}
        <h1 className="text-2xl font-bold text-gray-900">
          {centreInfo?.name ?? 'Centre Details'}
        </h1>
      </div>

      {/* Tab Navigation */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-label={`${activeTab} tab content`}>
        {activeTab === 'overview' && (
          <OverviewTab centreId={centreId} isStaff={isStaff} />
        )}
        {activeTab === 'infrastructure' && (
          <InfrastructureTab centreId={centreId} isStaff={isStaff} />
        )}
        {activeTab === 'stock' && (
          <StockTab centreId={centreId} isStaff={isStaff} />
        )}
        {activeTab === 'camps' && (
          <HealthCampsPanel centreId={centreId} readOnly={!isStaff} />
        )}
        {activeTab === 'audit' && (
          <AuditTab centreId={centreId} />
        )}
      </div>
    </div>
  );
}

// ─── Tab Content Components ─────────────────────────────────────────────────

function OverviewTab({ centreId, isStaff }: { centreId: string; isStaff: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Directives Notice — shows active directives for this centre */}
      <div className="lg:col-span-2">
        <DirectivesNotice centreId={centreId} />
      </div>

      {/* Patient Insights */}
      <div className="lg:col-span-2">
        <PatientInsights centreId={centreId} />
      </div>

      {/* Footfall Chart */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Patient Footfall</h2>
        <FootfallChart centreId={centreId} />
      </div>

      {/* Footfall Input Form — Centre Staff only */}
      {isStaff && (
        <div>
          <FootfallInputForm centreId={centreId} />
        </div>
      )}

      {/* Bed Availability Panel */}
      <div>
        <BedAvailabilityPanel centreId={centreId} readOnly={!isStaff} />
      </div>

      {/* Doctor Attendance Panel */}
      <div>
        <DoctorAttendancePanel centreId={centreId} readOnly={!isStaff} />
      </div>
    </div>
  );
}

function InfrastructureTab({ centreId, isStaff }: { centreId: string; isStaff: boolean }) {
  return (
    <div>
      <InfrastructurePanel centreId={centreId} readOnly={!isStaff} />
    </div>
  );
}

function StockTab({ centreId, isStaff }: { centreId: string; isStaff: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Medicine Stock</h2>
        <StockTable centreId={centreId} readOnly={!isStaff} />
      </div>

      {isStaff && (
        <div>
          <AddMedicineForm centreId={centreId} />
        </div>
      )}
    </div>
  );
}

function AuditTab({ centreId }: { centreId: string }) {
  return (
    <div>
      <AuditLog centreId={centreId} />
    </div>
  );
}

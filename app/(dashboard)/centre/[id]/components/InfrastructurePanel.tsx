'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { useAuditLog } from '@/lib/hooks/useAuditLog';

interface InfrastructurePanelProps {
  centreId: string;
  readOnly?: boolean;
}

type LabStatus = 'available' | 'not_available' | 'out_of_order';

interface StaffData {
  doctors: { general: number; dental: number; ayush: number };
  nurses: { male: number; female: number };
  ashaWorkers: number;
  labTechnicians: number;
  pharmacist: number;
  dataEntry: number;
  helpers: number;
}

interface LaboratoryData {
  [key: string]: LabStatus;
}

interface FacilitiesData {
  [key: string]: boolean;
}

interface InfrastructureData {
  staff: StaffData;
  laboratory: LaboratoryData;
  facilities: FacilitiesData;
}

const LAB_LABELS: Record<string, string> = {
  bloodSugar: 'Blood Sugar',
  cbc: 'CBC (Complete Blood Count)',
  urineTest: 'Urine Test',
  xray: 'X-Ray',
  ecg: 'ECG',
  ultrasound: 'Ultrasound',
  hivTest: 'HIV Test',
  malariaTest: 'Malaria Test',
  pregnancyTest: 'Pregnancy Test',
  liverFunction: 'Liver Function Test',
  kidneyFunction: 'Kidney Function Test',
};

const FACILITY_LABELS: Record<string, string> = {
  ambulance: 'Ambulance',
  delivery24x7: '24x7 Delivery Services',
  operationTheatre: 'Operation Theatre',
  bloodBank: 'Blood Bank',
  pharmacy: 'Pharmacy',
  electricityBackup: 'Electricity Backup',
  waterSupply: 'Water Supply',
  wasteManagement: 'Waste Management',
  internet: 'Internet Connectivity',
  cctv: 'CCTV Surveillance',
};

const STATUS_BADGE: Record<LabStatus, { label: string; icon: string; className: string }> = {
  available: { label: 'Available', icon: '✅', className: 'bg-green-100 text-green-800' },
  not_available: { label: 'Not Available', icon: '❌', className: 'bg-red-100 text-red-800' },
  out_of_order: { label: 'Out of Order', icon: '⚠️', className: 'bg-amber-100 text-amber-800' },
};

const DEFAULT_INFRASTRUCTURE: InfrastructureData = {
  staff: {
    doctors: { general: 0, dental: 0, ayush: 0 },
    nurses: { male: 0, female: 0 },
    ashaWorkers: 0,
    labTechnicians: 0,
    pharmacist: 0,
    dataEntry: 0,
    helpers: 0,
  },
  laboratory: {
    bloodSugar: 'not_available',
    cbc: 'not_available',
    urineTest: 'not_available',
    xray: 'not_available',
    ecg: 'not_available',
    ultrasound: 'not_available',
    hivTest: 'not_available',
    malariaTest: 'not_available',
    pregnancyTest: 'not_available',
    liverFunction: 'not_available',
    kidneyFunction: 'not_available',
  },
  facilities: {
    ambulance: false,
    delivery24x7: false,
    operationTheatre: false,
    bloodBank: false,
    pharmacy: false,
    electricityBackup: false,
    waterSupply: false,
    wasteManagement: false,
    internet: false,
    cctv: false,
  },
};

/**
 * InfrastructurePanel — Displays centre infrastructure (staff, labs, facilities).
 * Editable by Centre Staff, read-only for District Admin.
 */
export default function InfrastructurePanel({ centreId, readOnly = false }: InfrastructurePanelProps) {
  const [data, setData] = useState<InfrastructureData>(DEFAULT_INFRASTRUCTURE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { log: auditLog } = useAuditLog(centreId);

  // State for inline CRUD forms
  const [showAddLab, setShowAddLab] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabStatus, setNewLabStatus] = useState<LabStatus>('available');
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [newFacilityName, setNewFacilityName] = useState('');
  const [newFacilityAvailable, setNewFacilityAvailable] = useState(true);

  useEffect(() => {
    const infraRef = ref(database, dbPaths.infrastructure(centreId));
    const unsubscribe = onValue(infraRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData({
          staff: val.staff ?? DEFAULT_INFRASTRUCTURE.staff,
          laboratory: val.laboratory ?? DEFAULT_INFRASTRUCTURE.laboratory,
          facilities: val.facilities ?? DEFAULT_INFRASTRUCTURE.facilities,
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [centreId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const infraRef = ref(database, dbPaths.infrastructure(centreId));
      await update(infraRef, data);
      auditLog('Updated infrastructure data', 'infrastructure');
      setSaveMessage('✅ Infrastructure updated successfully.');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch {
      setSaveMessage('❌ Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLabTest = async () => {
    const key = newLabName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!key) return;

    try {
      const labRef = ref(database, `${dbPaths.infrastructure(centreId)}/laboratory`);
      await update(labRef, { [key]: newLabStatus });
      auditLog(`Added lab test: ${newLabName.trim()} (${newLabStatus})`, 'infrastructure');
      setNewLabName('');
      setNewLabStatus('available');
      setShowAddLab(false);
    } catch {
      setSaveMessage('❌ Failed to add lab test.');
    }
  };

  const handleAddFacility = async () => {
    const key = newFacilityName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!key) return;

    try {
      const facilityRef = ref(database, `${dbPaths.infrastructure(centreId)}/facilities`);
      await update(facilityRef, { [key]: newFacilityAvailable });
      auditLog(`Added facility: ${newFacilityName.trim()} (${newFacilityAvailable ? 'Yes' : 'No'})`, 'infrastructure');
      setNewFacilityName('');
      setNewFacilityAvailable(true);
      setShowAddFacility(false);
    } catch {
      setSaveMessage('❌ Failed to add facility.');
    }
  };

  // Staff update helpers
  const updateStaffField = (path: string, value: number) => {
    setData((prev) => {
      const updated = { ...prev, staff: { ...prev.staff } };
      const keys = path.split('.');
      if (keys.length === 2) {
        const [group, field] = keys;
        if (group === 'doctors') {
          updated.staff.doctors = { ...updated.staff.doctors, [field]: value };
        } else if (group === 'nurses') {
          updated.staff.nurses = { ...updated.staff.nurses, [field]: value };
        }
      } else {
        (updated.staff as Record<string, unknown>)[keys[0]] = value;
      }
      return updated;
    });
  };

  const updateLab = (key: string, status: LabStatus) => {
    setData((prev) => ({
      ...prev,
      laboratory: { ...prev.laboratory, [key]: status },
    }));
  };

  const updateFacility = (key: string, value: boolean) => {
    setData((prev) => ({
      ...prev,
      facilities: { ...prev.facilities, [key]: value },
    }));
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow" aria-busy="true">
        <p className="text-gray-500">Loading infrastructure data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Centre Infrastructure</h3>
        {!readOnly && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {saveMessage && (
        <div className="p-2 text-sm rounded bg-gray-50 border border-gray-200" role="status">
          {saveMessage}
        </div>
      )}

      {/* Staff Section */}
      <section>
        <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-1">👨‍⚕️ Staff</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StaffRow label="Doctors (General)" value={data.staff.doctors.general} path="doctors.general" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="Doctors (Dental)" value={data.staff.doctors.dental} path="doctors.dental" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="Doctors (AYUSH)" value={data.staff.doctors.ayush} path="doctors.ayush" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="Nurses (Male)" value={data.staff.nurses.male} path="nurses.male" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="Nurses (Female)" value={data.staff.nurses.female} path="nurses.female" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="ASHA Workers" value={data.staff.ashaWorkers} path="ashaWorkers" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="Lab Technicians" value={data.staff.labTechnicians} path="labTechnicians" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="Pharmacist" value={data.staff.pharmacist} path="pharmacist" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="Data Entry Operators" value={data.staff.dataEntry} path="dataEntry" readOnly={readOnly} onChange={updateStaffField} />
          <StaffRow label="Helpers/Attendants" value={data.staff.helpers} path="helpers" readOnly={readOnly} onChange={updateStaffField} />
        </div>
      </section>

      {/* Laboratory Section */}
      <section>
        <div className="flex items-center justify-between mb-3 border-b pb-1">
          <h4 className="text-md font-semibold text-gray-800">🔬 Laboratory</h4>
          {!readOnly && (
            <button
              onClick={() => setShowAddLab(!showAddLab)}
              className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Add Lab Test
            </button>
          )}
        </div>

        {/* Inline Add Lab Test Form */}
        {!readOnly && showAddLab && (
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200 flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Test Name</label>
              <input
                type="text"
                value={newLabName}
                onChange={(e) => setNewLabName(e.target.value)}
                placeholder="e.g. Thyroid Panel"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={newLabStatus}
                onChange={(e) => setNewLabStatus(e.target.value as LabStatus)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="available">Available</option>
                <option value="not_available">Not Available</option>
                <option value="out_of_order">Out of Order</option>
              </select>
            </div>
            <button
              onClick={handleAddLabTest}
              disabled={!newLabName.trim()}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddLab(false)}
              className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(data.laboratory).map(([key, status]) => (
            <LabRow
              key={key}
              label={LAB_LABELS[key] ?? key}
              status={(status as LabStatus) ?? 'not_available'}
              readOnly={readOnly}
              onChange={(s) => updateLab(key, s)}
            />
          ))}
        </div>
      </section>

      {/* Facilities Section */}
      <section>
        <div className="flex items-center justify-between mb-3 border-b pb-1">
          <h4 className="text-md font-semibold text-gray-800">🏥 Facilities</h4>
          {!readOnly && (
            <button
              onClick={() => setShowAddFacility(!showAddFacility)}
              className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Add Facility
            </button>
          )}
        </div>

        {/* Inline Add Facility Form */}
        {!readOnly && showAddFacility && (
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200 flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Facility Name</label>
              <input
                type="text"
                value={newFacilityName}
                onChange={(e) => setNewFacilityName(e.target.value)}
                placeholder="e.g. Physiotherapy Room"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-700">Available:</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={newFacilityAvailable}
                  onChange={(e) => setNewFacilityAvailable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            <button
              onClick={handleAddFacility}
              disabled={!newFacilityName.trim()}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddFacility(false)}
              className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(data.facilities).map(([key, available]) => (
            <FacilityRow
              key={key}
              label={FACILITY_LABELS[key] ?? key}
              available={available ?? false}
              readOnly={readOnly}
              onChange={(val) => updateFacility(key, val)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function StaffRow({
  label,
  value,
  path,
  readOnly,
  onChange,
}: {
  label: string;
  value: number;
  path: string;
  readOnly: boolean;
  onChange: (path: string, value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
      <span className="text-sm text-gray-700">{label}</span>
      {readOnly ? (
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      ) : (
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(path, Math.max(0, Number(e.target.value) || 0))}
          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={label}
        />
      )}
    </div>
  );
}

function LabRow({
  label,
  status,
  readOnly,
  onChange,
}: {
  label: string;
  status: LabStatus;
  readOnly: boolean;
  onChange: (status: LabStatus) => void;
}) {
  const badge = STATUS_BADGE[status];
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
      <span className="text-sm text-gray-700">{label}</span>
      {readOnly ? (
        <span className={`text-xs px-2 py-0.5 rounded ${badge.className}`}>
          {badge.icon} {badge.label}
        </span>
      ) : (
        <select
          value={status}
          onChange={(e) => onChange(e.target.value as LabStatus)}
          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={`${label} status`}
        >
          <option value="available">✅ Available</option>
          <option value="not_available">❌ Not Available</option>
          <option value="out_of_order">⚠️ Out of Order</option>
        </select>
      )}
    </div>
  );
}

function FacilityRow({
  label,
  available,
  readOnly,
  onChange,
}: {
  label: string;
  available: boolean;
  readOnly: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
      <span className="text-sm text-gray-700">{label}</span>
      {readOnly ? (
        <span className={`text-xs px-2 py-0.5 rounded ${available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {available ? '✅ Yes' : '❌ No'}
        </span>
      ) : (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
            aria-label={label}
          />
          <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      )}
    </div>
  );
}

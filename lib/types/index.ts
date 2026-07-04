/**
 * Core TypeScript interfaces and data models for the Smart Health AI Platform.
 * These interfaces define the shape of data used across the application.
 */

export interface HealthCentre {
  id: string;
  name: string;
  districtId: string;
  location: { lat: number; lng: number };
  totalBeds: number;
  assignedDoctors: number;
  maxPatientCapacity: number;
}

export interface MedicineStock {
  medicineId: string;
  name: string;
  quantity: number; // 0-999999, whole number
  reorderLevel: number;
  expiryDate: string; // ISO 8601 date
  centreId: string;
}

export interface PatientFootfall {
  date: string; // YYYY-MM-DD
  centreId: string;
  count: number; // 0-10000, integer
}

export type Department =
  | 'General Medicine'
  | 'Dental'
  | 'Ophthalmology'
  | 'Dermatology'
  | 'Paediatrics'
  | 'Gynaecology/ANC'
  | 'Preventive Health Check'
  | 'Emergency';

export type AgeGroup =
  | '0-5 years'
  | '6-14 years'
  | '15-30 years'
  | '31-50 years'
  | '51-65 years'
  | '65+ years';

export type Gender = 'Male' | 'Female' | 'Other';

export type VisitType = 'New OPD' | 'Follow-up OPD' | 'Emergency' | 'Lab/Investigation only';

export interface PatientVisit {
  department: Department;
  ageGroup: AgeGroup;
  gender: Gender;
  visitType: VisitType;
  timestamp: number; // Date.now()
}

export interface DoctorAttendance {
  date: string; // YYYY-MM-DD
  centreId: string;
  presentCount: number;
}

export interface StockPrediction {
  centreId: string;
  centreName: string;
  medicineId: string;
  medicineName: string;
  currentQuantity: number;
  predictedStockOutDate: string; // ISO 8601 date
}

export interface RedistributionRecommendation {
  sourceCentreId: string;
  sourceCentreName: string;
  destinationCentreId: string;
  destinationCentreName: string;
  resourceType: 'medicine' | 'staff' | 'beds';
  resourceName?: string;
  quantity: number;
  explanation: string; // max 500 chars
}

export interface UserProfile {
  uid: string;
  email: string;
  role?: 'District_Admin' | 'Centre_Staff';
  districtId?: string;
  centreId?: string; // For Centre_Staff
  languagePreference: 'en' | 'hi';
}

export interface APIErrorResponse {
  error: {
    code: string; // Machine-readable error code
    message: string; // Human-readable message (localized)
    details?: {
      field?: string; // Field that caused validation error
      validRange?: string; // e.g., "0-999999"
      missingVars?: string[]; // For startup errors
    };
  };
}

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
  notes?: string;
  createdBy: string;
  createdAt: number;
}

// ─── Directives ─────────────────────────────────────────────────────────────

export type DirectiveType =
  | 'indent'
  | 'staff_rotation'
  | 'inspection'
  | 'patient_diversion'
  | 'equipment_request'
  | 'general';

export type DirectiveStatus = 'issued' | 'acknowledged' | 'in_progress' | 'completed' | 'rejected';

export type DirectivePriority = 'critical' | 'high' | 'normal';

export interface Directive {
  id?: string;
  type: DirectiveType;
  title: string;
  description: string;
  targetCentreId: string;
  targetCentreName: string;
  status: DirectiveStatus;
  priority: DirectivePriority;
  issuedBy: string;
  issuedAt: number;
  updatedAt?: number;
  completedAt?: number;
  remarks?: string | null;
}

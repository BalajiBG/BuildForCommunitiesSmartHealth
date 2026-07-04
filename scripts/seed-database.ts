/**
 * Seed script for Smart Health AI Platform
 * Populates Firebase RTDB with realistic synthetic data modeled on Indian public health datasets.
 *
 * DATA SOURCES (cited):
 * - Health Centre names & locations: Based on "All India Health Centres Directory"
 *   (IndiaAI/NHA, https://aikosh.indiaai.gov.in) — Anand district, Gujarat
 * - Medicine list & pricing: "Indian Medicine Dataset" (GitHub: junioralive/Indian-Medicine-Dataset)
 * - Patient footfall patterns: Modeled on HMIS (Health Management Information System) district reports
 *   (https://hmis.mohfw.gov.in) — typical PHC/CHC daily OPD loads
 * - Bed/doctor norms: Indian Public Health Standards (IPHS) guidelines for PHC (6 beds, 1-2 doctors)
 *   and CHC (30 beds, 4+ specialists)
 *
 * Usage:
 *   npx tsx scripts/seed-database.ts
 *
 * After first Google Sign-In, update ADMIN_UID below with your Firebase Auth UID.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});

const db = getDatabase(app);

// ─── CONFIGURATION ──────────────────────────────────────────────────────────

// ⚠️ REPLACE THIS with your Firebase Auth UID after first Google Sign-In
// Find it in Firebase Console → Authentication → Users
const ADMIN_UID = 'REPLACE_WITH_YOUR_FIREBASE_UID';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateConsumptionTrend(baseDaily: number, days: number): Record<string, number> {
  const trend: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    // Add realistic variance (±30%)
    const variance = baseDaily * 0.3;
    const consumed = Math.max(0, Math.round(baseDaily + (Math.random() * 2 - 1) * variance));
    trend[getDateString(i)] = consumed;
  }
  return trend;
}

const today = getDateString(0);

// ─── REALISTIC DATA (Anand District, Gujarat) ───────────────────────────────

const DISTRICT_ID = 'district-anand-guj';

// Real PHC/CHC locations in Anand district, Gujarat (approximate coords from IPHS directory)
const centres = {
  'phc-borsad': {
    name: 'PHC Borsad',
    districtId: DISTRICT_ID,
    location: { lat: 22.4082, lng: 72.8977 },
    totalBeds: 6,        // IPHS norm for PHC
    availableBeds: 2,
    assignedDoctors: 2,  // IPHS norm: 1 MO + 1 AYUSH
    maxPatientCapacity: 80,
    lastUpdated: Date.now() - 5 * 60 * 1000, // 5 min ago
  },
  'chc-anand': {
    name: 'CHC Anand',
    districtId: DISTRICT_ID,
    location: { lat: 22.5645, lng: 72.9289 },
    totalBeds: 30,       // IPHS norm for CHC
    availableBeds: 0,    // Full capacity — triggers alert
    assignedDoctors: 7,  // IPHS: 4 specialists + 3 MOs
    maxPatientCapacity: 250,
    lastUpdated: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
  },
  'phc-petlad': {
    name: 'PHC Petlad',
    districtId: DISTRICT_ID,
    location: { lat: 22.4713, lng: 72.7986 },
    totalBeds: 6,
    availableBeds: 5,
    assignedDoctors: 2,
    maxPatientCapacity: 80,
    lastUpdated: Date.now() - 30 * 60 * 1000, // 30 min ago
  },
  'phc-khambhat': {
    name: 'PHC Khambhat',
    districtId: DISTRICT_ID,
    location: { lat: 22.3172, lng: 72.6194 },
    totalBeds: 6,
    availableBeds: 4,
    assignedDoctors: 2,
    maxPatientCapacity: 80,
    lastUpdated: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
  },
  'chc-umreth': {
    name: 'CHC Umreth',
    districtId: DISTRICT_ID,
    location: { lat: 22.6981, lng: 73.1152 },
    totalBeds: 30,
    availableBeds: 18,
    assignedDoctors: 5,
    maxPatientCapacity: 200,
    lastUpdated: Date.now() - 2 * 60 * 1000, // 2 min ago
  },
};

// Contact information per centre
const centreContacts: Record<string, { headName: string; designation: string; phone: string; email: string }> = {
  'phc-borsad': {
    headName: 'Dr. Priya Patel',
    designation: 'Medical Officer',
    phone: '+91 94261 12345',
    email: 'mo.borsad@health.gujarat.gov.in',
  },
  'chc-anand': {
    headName: 'Dr. Amit Desai',
    designation: 'Chief Medical Officer',
    phone: '+91 98250 67890',
    email: 'cmo.anand@health.gujarat.gov.in',
  },
  'phc-petlad': {
    headName: 'Dr. Kavita Shah',
    designation: 'Medical Officer',
    phone: '+91 97270 54321',
    email: 'mo.petlad@health.gujarat.gov.in',
  },
  'phc-khambhat': {
    headName: 'Dr. Suresh Mehta',
    designation: 'Medical Officer',
    phone: '+91 96380 98765',
    email: 'mo.khambhat@health.gujarat.gov.in',
  },
  'chc-umreth': {
    headName: 'Dr. Nandini Joshi',
    designation: 'Chief Medical Officer',
    phone: '+91 99040 11223',
    email: 'cmo.umreth@health.gujarat.gov.in',
  },
};

// Infrastructure data — PHCs have less infrastructure than CHCs (realistic)
const infrastructure = {
  'phc-borsad': {
    staff: {
      doctors: { general: 1, dental: 0, ayush: 1 },
      nurses: { male: 1, female: 2 },
      ashaWorkers: 5,
      labTechnicians: 1,
      pharmacist: 1,
      dataEntry: 1,
      helpers: 2,
    },
    laboratory: {
      bloodSugar: 'available',
      cbc: 'available',
      urineTest: 'available',
      xray: 'not_available',
      ecg: 'not_available',
      ultrasound: 'not_available',
      hivTest: 'available',
      malariaTest: 'available',
      pregnancyTest: 'available',
      liverFunction: 'not_available',
      kidneyFunction: 'not_available',
    },
    facilities: {
      ambulance: true,
      delivery24x7: true,
      operationTheatre: false,
      bloodBank: false,
      pharmacy: true,
      electricityBackup: true,
      waterSupply: true,
      wasteManagement: true,
      internet: true,
      cctv: false,
    },
  },
  'chc-anand': {
    staff: {
      doctors: { general: 3, dental: 1, ayush: 1 },
      nurses: { male: 2, female: 5 },
      ashaWorkers: 8,
      labTechnicians: 2,
      pharmacist: 1,
      dataEntry: 2,
      helpers: 4,
    },
    laboratory: {
      bloodSugar: 'available',
      cbc: 'available',
      urineTest: 'available',
      xray: 'available',
      ecg: 'available',
      ultrasound: 'available',
      hivTest: 'available',
      malariaTest: 'available',
      pregnancyTest: 'available',
      liverFunction: 'available',
      kidneyFunction: 'available',
    },
    facilities: {
      ambulance: true,
      delivery24x7: true,
      operationTheatre: true,
      bloodBank: true,
      pharmacy: true,
      electricityBackup: true,
      waterSupply: true,
      wasteManagement: true,
      internet: true,
      cctv: true,
    },
  },
  'phc-petlad': {
    staff: {
      doctors: { general: 1, dental: 0, ayush: 1 },
      nurses: { male: 0, female: 3 },
      ashaWorkers: 4,
      labTechnicians: 1,
      pharmacist: 1,
      dataEntry: 1,
      helpers: 1,
    },
    laboratory: {
      bloodSugar: 'available',
      cbc: 'available',
      urineTest: 'available',
      xray: 'not_available',
      ecg: 'available',
      ultrasound: 'not_available',
      hivTest: 'available',
      malariaTest: 'available',
      pregnancyTest: 'available',
      liverFunction: 'not_available',
      kidneyFunction: 'not_available',
    },
    facilities: {
      ambulance: true,
      delivery24x7: true,
      operationTheatre: false,
      bloodBank: false,
      pharmacy: true,
      electricityBackup: true,
      waterSupply: true,
      wasteManagement: true,
      internet: true,
      cctv: false,
    },
  },
  'phc-khambhat': {
    staff: {
      doctors: { general: 1, dental: 0, ayush: 1 },
      nurses: { male: 1, female: 2 },
      ashaWorkers: 3,
      labTechnicians: 0,
      pharmacist: 1,
      dataEntry: 1,
      helpers: 1,
    },
    laboratory: {
      bloodSugar: 'available',
      cbc: 'out_of_order',
      urineTest: 'available',
      xray: 'not_available',
      ecg: 'not_available',
      ultrasound: 'not_available',
      hivTest: 'available',
      malariaTest: 'available',
      pregnancyTest: 'available',
      liverFunction: 'not_available',
      kidneyFunction: 'not_available',
    },
    facilities: {
      ambulance: false,
      delivery24x7: false,
      operationTheatre: false,
      bloodBank: false,
      pharmacy: true,
      electricityBackup: false,
      waterSupply: true,
      wasteManagement: true,
      internet: false,
      cctv: false,
    },
  },
  'chc-umreth': {
    staff: {
      doctors: { general: 2, dental: 1, ayush: 1 },
      nurses: { male: 1, female: 4 },
      ashaWorkers: 6,
      labTechnicians: 2,
      pharmacist: 1,
      dataEntry: 1,
      helpers: 3,
    },
    laboratory: {
      bloodSugar: 'available',
      cbc: 'available',
      urineTest: 'available',
      xray: 'available',
      ecg: 'available',
      ultrasound: 'out_of_order',
      hivTest: 'available',
      malariaTest: 'available',
      pregnancyTest: 'available',
      liverFunction: 'available',
      kidneyFunction: 'not_available',
    },
    facilities: {
      ambulance: true,
      delivery24x7: true,
      operationTheatre: true,
      bloodBank: false,
      pharmacy: true,
      electricityBackup: true,
      waterSupply: true,
      wasteManagement: true,
      internet: true,
      cctv: true,
    },
  },
};

// Essential medicines list (from India's National List of Essential Medicines 2022)
const medicinesBycentre: Record<string, Record<string, { name: string; quantity: number; reorderLevel: number; expiryDate: string }>> = {
  'phc-borsad': {
    'med-paracetamol-500': { name: 'Paracetamol 500mg', quantity: 2500, reorderLevel: 1000, expiryDate: '2026-08-15' },
    'med-amoxicillin-250': { name: 'Amoxicillin 250mg', quantity: 180, reorderLevel: 500, expiryDate: '2025-11-30' }, // Critical low
    'med-metformin-500': { name: 'Metformin 500mg', quantity: 1200, reorderLevel: 800, expiryDate: '2026-06-01' },
    'med-ors-sachet': { name: 'ORS Sachets', quantity: 50, reorderLevel: 300, expiryDate: '2026-03-20' }, // Critical — below 30%
    'med-iron-folic': { name: 'Iron + Folic Acid', quantity: 3000, reorderLevel: 1500, expiryDate: '2026-09-10' },
    'med-amlodipine-5': { name: 'Amlodipine 5mg', quantity: 400, reorderLevel: 600, expiryDate: '2026-04-25' }, // Below reorder
  },
  'chc-anand': {
    'med-paracetamol-500': { name: 'Paracetamol 500mg', quantity: 5000, reorderLevel: 2000, expiryDate: '2026-07-20' },
    'med-amoxicillin-500': { name: 'Amoxicillin 500mg', quantity: 800, reorderLevel: 1000, expiryDate: '2025-12-15' }, // Below reorder
    'med-insulin-glargine': { name: 'Insulin Glargine 100IU/ml', quantity: 25, reorderLevel: 100, expiryDate: '2025-09-30' }, // Critical — below 30%
    'med-ciprofloxacin-500': { name: 'Ciprofloxacin 500mg', quantity: 600, reorderLevel: 500, expiryDate: '2026-05-18' },
    'med-omeprazole-20': { name: 'Omeprazole 20mg', quantity: 1500, reorderLevel: 800, expiryDate: '2026-11-01' },
    'med-atorvastatin-10': { name: 'Atorvastatin 10mg', quantity: 300, reorderLevel: 400, expiryDate: '2026-02-28' }, // Below reorder
    'med-salbutamol-inh': { name: 'Salbutamol Inhaler 100mcg', quantity: 15, reorderLevel: 80, expiryDate: '2025-10-31' }, // Critical
    'med-ceftriaxone-1g': { name: 'Ceftriaxone 1g Inj', quantity: 200, reorderLevel: 150, expiryDate: '2026-01-15' },
  },
  'phc-petlad': {
    'med-paracetamol-500': { name: 'Paracetamol 500mg', quantity: 3000, reorderLevel: 1000, expiryDate: '2026-10-05' },
    'med-metformin-500': { name: 'Metformin 500mg', quantity: 900, reorderLevel: 600, expiryDate: '2026-07-12' },
    'med-ors-sachet': { name: 'ORS Sachets', quantity: 800, reorderLevel: 300, expiryDate: '2026-04-30' },
    'med-iron-folic': { name: 'Iron + Folic Acid', quantity: 2200, reorderLevel: 1000, expiryDate: '2026-08-22' },
    'med-ibuprofen-400': { name: 'Ibuprofen 400mg', quantity: 1500, reorderLevel: 500, expiryDate: '2026-06-18' },
  },
  'phc-khambhat': {
    'med-paracetamol-500': { name: 'Paracetamol 500mg', quantity: 1800, reorderLevel: 1000, expiryDate: '2026-09-20' },
    'med-amoxicillin-250': { name: 'Amoxicillin 250mg', quantity: 100, reorderLevel: 500, expiryDate: '2025-12-31' }, // Critical
    'med-albendazole-400': { name: 'Albendazole 400mg', quantity: 500, reorderLevel: 200, expiryDate: '2026-05-15' },
    'med-chloroquine': { name: 'Chloroquine 250mg', quantity: 30, reorderLevel: 150, expiryDate: '2026-03-01' }, // Critical — below 30%
    'med-ors-sachet': { name: 'ORS Sachets', quantity: 200, reorderLevel: 300, expiryDate: '2026-07-10' }, // Below reorder
  },
  'chc-umreth': {
    'med-paracetamol-500': { name: 'Paracetamol 500mg', quantity: 4500, reorderLevel: 2000, expiryDate: '2026-08-30' },
    'med-amoxicillin-500': { name: 'Amoxicillin 500mg', quantity: 1200, reorderLevel: 800, expiryDate: '2026-04-12' },
    'med-metformin-500': { name: 'Metformin 500mg', quantity: 1800, reorderLevel: 1000, expiryDate: '2026-11-20' },
    'med-amlodipine-5': { name: 'Amlodipine 5mg', quantity: 900, reorderLevel: 500, expiryDate: '2026-06-05' },
    'med-omeprazole-20': { name: 'Omeprazole 20mg', quantity: 700, reorderLevel: 600, expiryDate: '2026-09-15' },
    'med-losartan-50': { name: 'Losartan 50mg', quantity: 650, reorderLevel: 400, expiryDate: '2026-10-28' },
  },
};

// Generate realistic footfall (PHC: 40-100/day, CHC: 150-300/day based on HMIS norms)
function generateFootfall(centreId: string): Record<string, { count: number }> {
  const isCHC = centreId.startsWith('chc');
  const baseFootfall = isCHC ? randomInt(150, 250) : randomInt(40, 80);
  const footfall: Record<string, { count: number }> = {};

  for (let i = 0; i < 30; i++) {
    const date = getDateString(i);
    // Weekends have lower footfall
    const dayOfWeek = new Date(date).getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.4 : 1.0;
    const count = Math.round(baseFootfall * weekendFactor * (0.8 + Math.random() * 0.4));
    footfall[date] = { count };
  }

  return footfall;
}

// Doctor attendance (realistic patterns: PHC usually 1-2 present, CHC 3-6)
const attendance: Record<string, Record<string, { presentCount: number }>> = {
  'phc-borsad': { [today]: { presentCount: 1 } },    // 1/2 = 50% — borderline
  'chc-anand': { [today]: { presentCount: 2 } },     // 2/7 = 28% — UNDERSTAFFED
  'phc-petlad': { [today]: { presentCount: 2 } },    // 2/2 = 100% — full attendance
  'phc-khambhat': { [today]: { presentCount: 0 } },  // 0/2 = 0% — CRITICALLY UNDERSTAFFED
  'chc-umreth': { [today]: { presentCount: 4 } },    // 4/5 = 80% — good
};

// ─── VISIT DATA (detailed per-patient entries for today) ────────────────────

const DEPARTMENTS: string[] = [
  'General Medicine',
  'Dental',
  'Ophthalmology',
  'Dermatology',
  'Paediatrics',
  'Gynaecology/ANC',
  'Preventive Health Check',
  'Emergency',
];

// Weighted distribution matching realistic Indian PHC/CHC patterns
const DEPT_WEIGHTS = [40, 10, 7, 8, 15, 12, 5, 3]; // sums to 100

const AGE_GROUPS: string[] = ['0-5 years', '6-14 years', '15-30 years', '31-50 years', '51-65 years', '65+ years'];
const AGE_WEIGHTS = [10, 12, 25, 28, 15, 10]; // realistic distribution

const GENDERS: string[] = ['Male', 'Female', 'Other'];
const GENDER_WEIGHTS = [45, 52, 3]; // slight female skew (maternal health)

const VISIT_TYPES: string[] = ['New OPD', 'Follow-up OPD', 'Emergency', 'Lab/Investigation only'];
const VISIT_TYPE_WEIGHTS = [45, 35, 10, 10];

function weightedRandom(items: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generateVisits(centreId: string): Record<string, { department: string; ageGroup: string; gender: string; visitType: string; timestamp: number }> {
  const isCHC = centreId.startsWith('chc');
  const visitCount = isCHC ? randomInt(40, 50) : randomInt(30, 40);
  const visits: Record<string, { department: string; ageGroup: string; gender: string; visitType: string; timestamp: number }> = {};

  const todayStart = new Date();
  todayStart.setHours(8, 0, 0, 0); // OPD starts at 8 AM

  // Realistic age/gender distributions per department
  const deptDemographics: Record<string, { ageWeights: number[]; genderWeights: number[]; visitTypeWeights: number[] }> = {
    'General Medicine': {
      ageWeights: [5, 8, 25, 35, 18, 9],       // mostly adults 15-65
      genderWeights: [48, 49, 3],               // balanced
      visitTypeWeights: [40, 40, 10, 10],
    },
    'Dental': {
      ageWeights: [3, 15, 30, 30, 15, 7],      // mostly 15-50
      genderWeights: [50, 47, 3],
      visitTypeWeights: [50, 35, 5, 10],
    },
    'Ophthalmology': {
      ageWeights: [2, 5, 10, 20, 35, 28],      // mostly older adults 50+
      genderWeights: [45, 52, 3],
      visitTypeWeights: [45, 30, 5, 20],
    },
    'Dermatology': {
      ageWeights: [8, 15, 30, 25, 15, 7],      // all ages, peak at youth
      genderWeights: [45, 52, 3],
      visitTypeWeights: [55, 30, 5, 10],
    },
    'Paediatrics': {
      ageWeights: [45, 45, 8, 1, 1, 0],        // 90% are 0-14 years (children)
      genderWeights: [52, 46, 2],               // slight male skew in child visits
      visitTypeWeights: [50, 30, 15, 5],
    },
    'Gynaecology/ANC': {
      ageWeights: [0, 2, 45, 40, 10, 3],       // 15-50 years (reproductive age)
      genderWeights: [0, 99, 1],                // almost all female
      visitTypeWeights: [30, 50, 10, 10],       // high follow-up (ANC visits)
    },
    'Preventive Health Check': {
      ageWeights: [5, 10, 20, 30, 25, 10],     // adults getting checkups
      genderWeights: [45, 50, 5],
      visitTypeWeights: [70, 10, 0, 20],        // mostly new + lab
    },
    'Emergency': {
      ageWeights: [8, 12, 25, 25, 18, 12],     // all ages
      genderWeights: [55, 42, 3],               // slight male skew (accidents)
      visitTypeWeights: [5, 5, 85, 5],          // mostly emergency type
    },
  };

  for (let i = 0; i < visitCount; i++) {
    const minutesOffset = Math.floor((i / visitCount) * 480) + randomInt(0, 10);
    const timestamp = todayStart.getTime() + minutesOffset * 60 * 1000;

    // Pick department first
    const department = weightedRandom(DEPARTMENTS, DEPT_WEIGHTS);
    const demo = deptDemographics[department] || deptDemographics['General Medicine'];

    // Then pick age/gender/visitType based on that department's realistic distribution
    const visitId = `visit-${centreId}-${String(i).padStart(3, '0')}`;
    visits[visitId] = {
      department,
      ageGroup: weightedRandom(AGE_GROUPS, demo.ageWeights),
      gender: weightedRandom(GENDERS, demo.genderWeights),
      visitType: weightedRandom(VISIT_TYPES, demo.visitTypeWeights),
      timestamp,
    };
  }

  return visits;
}

// Consumption data for AI predictions (last 30 days, per medicine per centre)
const consumption: Record<string, Record<string, Record<string, number>>> = {};
for (const [centreId, meds] of Object.entries(medicinesBycentre)) {
  consumption[centreId] = {};
  for (const [medId, med] of Object.entries(meds)) {
    // Daily consumption proportional to stock level (higher stock = more usage facility)
    const dailyConsumption = Math.max(1, Math.round(med.reorderLevel / 30));
    consumption[centreId][medId] = generateConsumptionTrend(dailyConsumption, 30);
  }
}

// ─── BUILD SEED PAYLOAD ─────────────────────────────────────────────────────

const centreIds = Object.keys(centres);

const seedData: Record<string, unknown> = {
  // Admin user profile
  users: {
    [ADMIN_UID]: {
      email: 'district.admin@health.gujarat.gov.in',
      role: 'District_Admin',
      districtId: DISTRICT_ID,
      languagePreference: 'en',
    },
    // Sample Centre Staff user (for demo)
    'sample-staff-uid': {
      email: 'staff.borsad@health.gujarat.gov.in',
      role: 'Centre_Staff',
      districtId: DISTRICT_ID,
      centreId: 'phc-borsad',
      languagePreference: 'hi',
    },
  },

  // District with centre index
  districts: {
    [DISTRICT_ID]: {
      name: 'Anand District, Gujarat',
      centres: Object.fromEntries(centreIds.map(id => [id, true])),
    },
  },

  // Health Centres (with contact info)
  centres: Object.fromEntries(
    Object.entries(centres).map(([id, data]) => [
      id,
      { ...data, contact: centreContacts[id] },
    ])
  ),

  // Medicines
  medicines: medicinesBycentre,

  // Footfall (30 days per centre)
  footfall: Object.fromEntries(centreIds.map(id => [id, generateFootfall(id)])),

  // Doctor Attendance
  attendance,

  // Visits — detailed per-patient entries for today
  visits: Object.fromEntries(centreIds.map(id => [id, { [today]: generateVisits(id) }])),

  // Consumption history (for AI prediction accuracy)
  consumption,

  // Infrastructure
  infrastructure,

  // Contact Directory (district-level: admin + emergency)
  contacts: {
    [DISTRICT_ID]: {
      districtAdmin: {
        name: 'Dr. Rajesh Sharma',
        designation: 'Chief District Health Officer',
        phone: '+91 98765 43210',
        email: 'cdho.anand@health.gujarat.gov.in',
        office: 'District Health Office, Anand',
      },
      emergency: {
        ambulance: '108',
        bloodBank: '+91 2692 252000',
        districtHospital: '+91 2692 253000',
        poisonControl: '1800-11-6117',
      },
    },
  },

  // Health Camps (sample data)
  camps: {
    'phc-borsad': {
      'camp-borsad-1': {
        name: 'Free Eye Checkup Camp',
        type: 'eye_checkup',
        date: getDateString(14), // 2 weeks ago
        status: 'completed',
        targetBeneficiaries: 100,
        actualBeneficiaries: 87,
        organizer: 'PHC Borsad + Lions Club Anand',
        location: 'Village Panchayat Hall, Borsad',
        notes: 'Successfully conducted. 12 patients referred for cataract surgery.',
        createdBy: 'staff.borsad@health.gujarat.gov.in',
        createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
      },
      'camp-borsad-2': {
        name: 'World Diabetes Day — Free Sugar Test',
        type: 'screening',
        date: getDateString(-7), // 7 days from now (upcoming)
        status: 'scheduled',
        targetBeneficiaries: 150,
        organizer: 'PHC Borsad + Anand Diabetes Foundation',
        location: 'PHC Borsad Campus',
        createdBy: 'staff.borsad@health.gujarat.gov.in',
        createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      },
    },
    'chc-anand': {
      'camp-anand-1': {
        name: 'Pulse Polio Immunization Drive',
        type: 'vaccination',
        date: getDateString(21), // 3 weeks ago
        status: 'completed',
        targetBeneficiaries: 200,
        actualBeneficiaries: 178,
        organizer: 'CHC Anand + District Health Office',
        location: 'Anganwadi Centre #12, Anand',
        notes: 'Good community participation. ASHA workers did excellent mobilization.',
        createdBy: 'district.admin@health.gujarat.gov.in',
        createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
      },
      'camp-anand-2': {
        name: 'Blood Donation Drive — Thalassemia Awareness',
        type: 'blood_donation',
        date: today,
        status: 'ongoing',
        targetBeneficiaries: 50,
        organizer: 'CHC Anand + Red Cross Society',
        location: 'CHC Anand Blood Bank Hall',
        notes: 'In progress since 9 AM. Good turnout from college students.',
        createdBy: 'district.admin@health.gujarat.gov.in',
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
      'camp-anand-3': {
        name: 'Maternal Health & ANC Camp',
        type: 'maternal',
        date: getDateString(-10), // 10 days from now
        status: 'scheduled',
        targetBeneficiaries: 80,
        organizer: 'CHC Anand + ASHA Workers Network',
        location: 'Sub-centre Lambhvel, Anand Taluka',
        createdBy: 'district.admin@health.gujarat.gov.in',
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
    },
    'phc-petlad': {
      'camp-petlad-1': {
        name: 'Dental Screening Camp for School Children',
        type: 'dental',
        date: getDateString(10), // 10 days ago
        status: 'completed',
        targetBeneficiaries: 120,
        actualBeneficiaries: 95,
        organizer: 'PHC Petlad + Rotary Club',
        location: 'Government Primary School, Petlad',
        notes: 'Good participation. Distributed oral hygiene kits to all children.',
        createdBy: 'staff.borsad@health.gujarat.gov.in',
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      },
      'camp-petlad-2': {
        name: 'General Health Awareness Camp',
        type: 'awareness',
        date: getDateString(-5), // 5 days from now
        status: 'scheduled',
        targetBeneficiaries: 200,
        organizer: 'PHC Petlad + Gram Panchayat',
        location: 'Community Hall, Petlad',
        createdBy: 'staff.borsad@health.gujarat.gov.in',
        createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
    },
  },

  // Directives (sample data — bridges AI recommendations to real actions)
  directives: {
    [DISTRICT_ID]: {
      'directive-001': {
        type: 'indent',
        title: 'Emergency Insulin supply for CHC Anand',
        description: 'AI flagged critical Insulin shortage (25/100 units). Immediately indent 200 units of Insulin Glargine 100IU/ml from district warehouse. Patient safety risk.',
        targetCentreId: 'chc-anand',
        targetCentreName: 'CHC Anand',
        status: 'issued',
        priority: 'critical',
        issuedBy: 'district.admin@health.gujarat.gov.in',
        issuedAt: Date.now() - 2 * 60 * 60 * 1000,
      },
      'directive-002': {
        type: 'staff_rotation',
        title: 'Rotate 1 MO from PHC Petlad to PHC Khambhat',
        description: 'PHC Khambhat has 0/2 doctors present. Transfer one Medical Officer from PHC Petlad (full attendance) for minimum 1 week to maintain OPD services.',
        targetCentreId: 'phc-khambhat',
        targetCentreName: 'PHC Khambhat',
        status: 'in_progress',
        priority: 'high',
        issuedBy: 'district.admin@health.gujarat.gov.in',
        issuedAt: Date.now() - 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 12 * 60 * 60 * 1000,
        remarks: 'Dr. Patel from PHC Petlad has been notified. Will report tomorrow morning.',
      },
      'directive-003': {
        type: 'inspection',
        title: 'Quarterly inspection of PHC Borsad cold chain',
        description: 'Routine quarterly cold chain inspection. Verify vaccine storage temperatures, check backup power supply, and review wastage logs for the past quarter.',
        targetCentreId: 'phc-borsad',
        targetCentreName: 'PHC Borsad',
        status: 'completed',
        priority: 'normal',
        issuedBy: 'district.admin@health.gujarat.gov.in',
        issuedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        completedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        remarks: 'Inspection completed. All temperatures within range. Backup generator tested OK.',
      },
    },
  },
};

// ─── EXECUTE SEED ───────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding Firebase Realtime Database with realistic health centre data...\n');
  console.log('📊 Data modeled on:');
  console.log('   • All India Health Centres Directory (IndiaAI/NHA)');
  console.log('   • National List of Essential Medicines 2022 (MoHFW)');
  console.log('   • IPHS Standards for PHC/CHC bed & staffing norms');
  console.log('   • HMIS district-level OPD footfall patterns\n');

  try {
    await db.ref('/').set(seedData);

    console.log('✅ Database seeded successfully!\n');
    console.log('📋 Data Summary:');
    console.log(`   District: Anand District, Gujarat (${DISTRICT_ID})`);
    console.log(`   Health Centres: ${centreIds.length}`);
    centreIds.forEach(id => {
      const c = centres[id as keyof typeof centres];
      const medCount = Object.keys(medicinesBycentre[id]).length;
      console.log(`     • ${c.name} — ${medCount} medicines, ${c.totalBeds} beds, ${c.assignedDoctors} doctors`);
    });
    console.log(`   Footfall: 30 days of data per centre`);
    console.log(`   Visits: 30-50 detailed patient visits per centre (today)`);
    console.log(`   Consumption History: 30 days per medicine (for AI predictions)`);
    console.log(`   Health Camps: 2-3 sample camps per centre (past, ongoing, scheduled)`);
    console.log('');
    console.log('⚠️  Expected Alerts (for demo):');
    console.log('   🔴 CHC Anand: Full capacity (0/30 beds) + Understaffed (2/7 = 28%)');
    console.log('   🔴 PHC Khambhat: Critically understaffed (0/2 doctors) + Low stock');
    console.log('   🟡 PHC Borsad: Multiple medicines below reorder level');
    console.log('   🟡 CHC Anand: Insulin & Salbutamol critically low (< 30% of reorder)');
    console.log('');
    console.log('🤖 AI Predictions will flag:');
    console.log('   • ORS Sachets at PHC Borsad (50/300 = 17% of reorder)');
    console.log('   • Insulin at CHC Anand (25/100 = 25% of reorder)');
    console.log('   • Salbutamol Inhaler at CHC Anand (15/80 = 19% of reorder)');
    console.log('   • Chloroquine at PHC Khambhat (30/150 = 20% of reorder)');
    console.log('');

    if (ADMIN_UID === 'REPLACE_WITH_YOUR_FIREBASE_UID') {
      console.log('🔑 NEXT STEP:');
      console.log('   1. Open http://localhost:3000/login and sign in with Google');
      console.log('   2. Go to Firebase Console → Authentication → Users');
      console.log('   3. Copy your UID');
      console.log('   4. Replace ADMIN_UID in this script with your UID');
      console.log('   5. Re-run: npm run seed');
      console.log('');
    } else {
      console.log(`🔑 Admin UID configured: ${ADMIN_UID}`);
      console.log('   You should be able to sign in and see the full dashboard.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    process.exit(1);
  }
}

seed();

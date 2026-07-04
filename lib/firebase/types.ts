/**
 * Firebase Realtime Database path constants.
 * These match the RTDB schema defined in the design document.
 */

/** Path to a specific user profile: /users/{uid} */
export const USERS_PATH = 'users' as const;

/** Path to districts collection: /districts/{districtId} */
export const DISTRICTS_PATH = 'districts' as const;

/** Path to centres collection: /centres/{centreId} */
export const CENTRES_PATH = 'centres' as const;

/** Path to medicines collection: /medicines/{centreId}/{medicineId} */
export const MEDICINES_PATH = 'medicines' as const;

/** Path to footfall collection: /footfall/{centreId}/{date} */
export const FOOTFALL_PATH = 'footfall' as const;

/** Path to attendance collection: /attendance/{centreId}/{date} */
export const ATTENDANCE_PATH = 'attendance' as const;

/** Path to alerts collection: /alerts/{districtId}/{alertId} */
export const ALERTS_PATH = 'alerts' as const;

/** Path to visits collection: /visits/{centreId}/{date}/{visitId} */
export const VISITS_PATH = 'visits' as const;

/**
 * Helper functions to build RTDB paths.
 */
export const dbPaths = {
  /** /users/{uid} */
  user: (uid: string) => `${USERS_PATH}/${uid}`,

  /** /users/{uid}/role */
  userRole: (uid: string) => `${USERS_PATH}/${uid}/role`,

  /** /users/{uid}/languagePreference */
  userLanguage: (uid: string) => `${USERS_PATH}/${uid}/languagePreference`,

  /** /districts/{districtId} */
  district: (districtId: string) => `${DISTRICTS_PATH}/${districtId}`,

  /** /districts/{districtId}/centres */
  districtCentres: (districtId: string) => `${DISTRICTS_PATH}/${districtId}/centres`,

  /** /centres/{centreId} */
  centre: (centreId: string) => `${CENTRES_PATH}/${centreId}`,

  /** /medicines/{centreId} */
  centreMedicines: (centreId: string) => `${MEDICINES_PATH}/${centreId}`,

  /** /medicines/{centreId}/{medicineId} */
  medicine: (centreId: string, medicineId: string) =>
    `${MEDICINES_PATH}/${centreId}/${medicineId}`,

  /** /footfall/{centreId}/{date} */
  footfall: (centreId: string, date: string) => `${FOOTFALL_PATH}/${centreId}/${date}`,

  /** /footfall/{centreId} */
  centreFootfall: (centreId: string) => `${FOOTFALL_PATH}/${centreId}`,

  /** /attendance/{centreId}/{date} */
  attendance: (centreId: string, date: string) => `${ATTENDANCE_PATH}/${centreId}/${date}`,

  /** /attendance/{centreId} */
  centreAttendance: (centreId: string) => `${ATTENDANCE_PATH}/${centreId}`,

  /** /alerts/{districtId} */
  districtAlerts: (districtId: string) => `${ALERTS_PATH}/${districtId}`,

  /** /alerts/{districtId}/{alertId} */
  alert: (districtId: string, alertId: string) => `${ALERTS_PATH}/${districtId}/${alertId}`,

  /** /visits/{centreId}/{date} */
  visits: (centreId: string, date: string) => `${VISITS_PATH}/${centreId}/${date}`,

  /** /visits/{centreId}/{date}/{visitId} */
  visit: (centreId: string, date: string, visitId: string) =>
    `${VISITS_PATH}/${centreId}/${date}/${visitId}`,

  /** /infrastructure/{centreId} */
  infrastructure: (centreId: string) => `infrastructure/${centreId}`,

  /** /audit/{centreId} */
  audit: (centreId: string) => `audit/${centreId}`,

  /** /camps/{centreId} */
  camps: (centreId: string) => `camps/${centreId}`,

  /** /camps/{centreId}/{campId} */
  camp: (centreId: string, campId: string) => `camps/${centreId}/${campId}`,

  /** /directives/{districtId} */
  directives: (districtId: string) => `directives/${districtId}`,

  /** /directives/{districtId}/{directiveId} */
  directive: (districtId: string, directiveId: string) => `directives/${districtId}/${directiveId}`,

  /** /contacts/{districtId} */
  contacts: (districtId: string) => `contacts/${districtId}`,
} as const;

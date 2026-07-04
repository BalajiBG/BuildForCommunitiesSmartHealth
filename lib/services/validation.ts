/**
 * ValidationService — Input validators for data entry forms.
 *
 * Each validator ensures values conform to the domain constraints
 * defined in the Smart Health AI Platform requirements.
 */

/**
 * Validates that the given value is an integer in [0, 999999].
 * Rejects negative, decimal, > 999999, NaN, Infinity, and non-numeric values.
 *
 * Validates: Requirements 3.2
 */
export function validateMedicineQuantity(value: unknown): boolean {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) return false;
  if (!Number.isInteger(value)) return false;
  return value >= 0 && value <= 999999;
}

/**
 * Validates that the given value is an integer in [0, 10000].
 * Rejects negative, decimal, > 10000, NaN, Infinity, and non-numeric values.
 *
 * Validates: Requirements 4.4
 */
export function validateFootfallCount(value: unknown): boolean {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) return false;
  if (!Number.isInteger(value)) return false;
  return value >= 0 && value <= 10000;
}

/**
 * Validates that availableBeds is an integer in [0, totalBeds].
 * Both parameters must be valid integers and totalBeds must be non-negative.
 *
 * Validates: Requirements 5.3
 */
export function validateBedAvailability(available: unknown, total: unknown): boolean {
  if (typeof available !== 'number' || typeof total !== 'number') return false;
  if (!Number.isFinite(available) || !Number.isFinite(total)) return false;
  if (!Number.isInteger(available) || !Number.isInteger(total)) return false;
  if (total < 0) return false;
  return available >= 0 && available <= total;
}

/**
 * Validates that presentCount is an integer in [0, assignedDoctors].
 * Both parameters must be valid integers and assignedDoctors must be non-negative.
 *
 * Validates: Requirements 6.4
 */
export function validateDoctorAttendance(present: unknown, assigned: unknown): boolean {
  if (typeof present !== 'number' || typeof assigned !== 'number') return false;
  if (!Number.isFinite(present) || !Number.isFinite(assigned)) return false;
  if (!Number.isInteger(present) || !Number.isInteger(assigned)) return false;
  if (assigned < 0) return false;
  return present >= 0 && present <= assigned;
}

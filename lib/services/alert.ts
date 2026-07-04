/**
 * AlertService — Computes alert conditions for Health Centres.
 *
 * Provides functions to determine whether stock-low, full-capacity,
 * or understaffed alerts should be triggered based on current metrics.
 */

/**
 * Returns true if the medicine quantity is strictly below its reorder level.
 *
 * Validates: Requirements 3.4
 */
export function isStockLow(quantity: number, reorderLevel: number): boolean {
  return quantity < reorderLevel;
}

/**
 * Returns true if available beds equals zero (centre is at full capacity).
 *
 * Validates: Requirements 5.4, 5.5
 */
export function isFullCapacity(availableBeds: number): boolean {
  return availableBeds === 0;
}

/**
 * Returns true if present doctor count is below 50% of assigned doctors.
 *
 * Validates: Requirements 6.3
 */
export function isUnderstaffed(presentCount: number, assignedDoctors: number): boolean {
  return presentCount < assignedDoctors * 0.5;
}

/**
 * EvaluationService — Evaluates Health Centre performance based on key metrics.
 *
 * Determines whether a centre is underperforming by checking multiple
 * conditions against established thresholds.
 *
 * Validates: Requirements 9.2, 9.3
 */

/**
 * Input describing the centre's configuration.
 */
export interface CentreInfo {
  assignedDoctors: number;
  maxPatientCapacity: number;
}

/**
 * Input describing the centre's current operational metrics.
 */
export interface CentreMetrics {
  hasLowStock: boolean;
  presentDoctors: number;
  availableBeds: number;
  dailyFootfall: number;
}

/**
 * Result of the underperformance evaluation.
 */
export interface EvaluationResult {
  isUnderperforming: boolean;
  breachedMetrics: string[];
}

/**
 * Evaluates whether a Health Centre is underperforming.
 *
 * A centre is flagged as underperforming if 2 or more of the following
 * conditions are simultaneously true:
 * 1. Stock of any medicine is below its reorder level (hasLowStock)
 * 2. Doctor attendance is below 50% of assigned doctors
 * 3. Available beds equals zero
 * 4. Daily patient footfall exceeds the centre's designated maximum patient capacity
 *
 * Validates: Requirements 9.2, 9.3
 */
export function evaluateCentre(centre: CentreInfo, metrics: CentreMetrics): EvaluationResult {
  const breachedMetrics: string[] = [];

  // Condition 1: Stock below reorder level
  if (metrics.hasLowStock) {
    breachedMetrics.push('stock_below_reorder');
  }

  // Condition 2: Doctor attendance below 50%
  if (metrics.presentDoctors < centre.assignedDoctors * 0.5) {
    breachedMetrics.push('attendance_below_50_percent');
  }

  // Condition 3: Available beds equals zero
  if (metrics.availableBeds === 0) {
    breachedMetrics.push('beds_at_zero');
  }

  // Condition 4: Daily footfall exceeds max capacity
  if (metrics.dailyFootfall > centre.maxPatientCapacity) {
    breachedMetrics.push('footfall_exceeds_capacity');
  }

  return {
    isUnderperforming: breachedMetrics.length >= 2,
    breachedMetrics,
  };
}

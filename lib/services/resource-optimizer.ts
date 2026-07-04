/**
 * Resource Optimizer Service
 *
 * Provides data sufficiency checks for redistribution recommendations.
 * Property 17: The Resource Optimizer SHALL determine that redistribution
 * recommendations can be generated if and only if at least 2 centres have
 * sufficient stock, footfall, or bed occupancy data available for comparison.
 */

import { MedicineStock, PatientFootfall } from '@/lib/types';

/**
 * Represents the data available for a single Health Centre
 * used in data sufficiency evaluation.
 */
export interface CentreData {
  centreId: string;
  medicines: MedicineStock[];
  footfall: PatientFootfall[];
  totalBeds: number;
}

/**
 * Message returned when there is insufficient data to generate
 * redistribution recommendations.
 */
export const INSUFFICIENT_DATA_MESSAGE =
  'Insufficient data: at least 2 centres with stock, footfall, or bed occupancy data are required to generate redistribution recommendations.';

/**
 * Determines if a single centre has sufficient data for comparison.
 * A centre has sufficient data if it has at least one of:
 * - Stock data (non-empty medicines list)
 * - Footfall data (at least one recorded day)
 * - Bed occupancy data (totalBeds > 0)
 */
export function hasSufficientData(centre: CentreData): boolean {
  const hasStock = centre.medicines.length > 0;
  const hasFootfall = centre.footfall.length > 0;
  const hasBeds = centre.totalBeds > 0;

  return hasStock || hasFootfall || hasBeds;
}

/**
 * Determines whether there are enough centres with data to generate
 * redistribution recommendations.
 *
 * Returns true if at least 2 centres have sufficient data (stock, footfall,
 * or bed occupancy) available for comparison.
 */
export function hasMinimumCentresForComparison(centres: CentreData[]): boolean {
  let count = 0;

  for (const centre of centres) {
    if (hasSufficientData(centre)) {
      count++;
      if (count >= 2) {
        return true;
      }
    }
  }

  return false;
}

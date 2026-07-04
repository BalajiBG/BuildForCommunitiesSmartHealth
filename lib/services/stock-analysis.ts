/**
 * StockAnalysisService — Business logic for stock level analysis and thresholds.
 *
 * Provides colour-coding for stock levels, filtering for prediction candidates,
 * and data sufficiency checks for consumption history.
 */

import { MedicineStock } from '@/lib/types/index';

/**
 * Returns the colour code for a medicine's stock status based on quantity
 * relative to its reorder level.
 *
 * - "green" when quantity > reorderLevel
 * - "yellow" when quantity <= reorderLevel AND quantity > reorderLevel * 0.5
 * - "red" when quantity <= reorderLevel * 0.5
 *
 * Precondition: reorderLevel > 0
 *
 * Validates: Requirements 3.5
 */
export function getStockColour(
  quantity: number,
  reorderLevel: number
): 'green' | 'yellow' | 'red' {
  if (quantity > reorderLevel) {
    return 'green';
  }
  if (quantity > reorderLevel * 0.5) {
    return 'yellow';
  }
  return 'red';
}

/**
 * Filters medicines that should be sent to the AI prediction engine.
 * Selects exactly those medicines where quantity < reorderLevel * 0.3.
 *
 * Validates: Requirements 7.2
 */
export function filterMedicinesForPrediction(
  medicines: MedicineStock[]
): MedicineStock[] {
  return medicines.filter(
    (medicine) => medicine.quantity < medicine.reorderLevel * 0.3
  );
}

/**
 * Determines whether a medicine has insufficient consumption data for prediction.
 * Returns true if fewer than 7 days of consumption data exist in the last 30 days.
 *
 * @param consumptionDays - The number of days with recorded consumption data in the last 30 days
 *
 * Validates: Requirements 7.4
 */
export function hasInsufficientData(consumptionDays: number): boolean {
  return consumptionDays < 7;
}

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getStockColour,
  filterMedicinesForPrediction,
  hasInsufficientData,
} from '@/lib/services/stock-analysis';
import { MedicineStock } from '@/lib/types/index';

describe('StockAnalysisService', () => {
  // ─── Unit Tests ───────────────────────────────────────────────────────────

  describe('getStockColour', () => {
    it('returns "green" when quantity is above reorder level', () => {
      expect(getStockColour(100, 50)).toBe('green');
      expect(getStockColour(51, 50)).toBe('green');
    });

    it('returns "yellow" when quantity is at reorder level', () => {
      expect(getStockColour(50, 50)).toBe('yellow');
    });

    it('returns "yellow" when quantity is between reorderLevel*0.5 and reorderLevel', () => {
      expect(getStockColour(30, 50)).toBe('yellow');
      expect(getStockColour(26, 50)).toBe('yellow');
    });

    it('returns "red" when quantity is at exactly reorderLevel * 0.5', () => {
      expect(getStockColour(25, 50)).toBe('red');
    });

    it('returns "red" when quantity is below reorderLevel * 0.5', () => {
      expect(getStockColour(10, 50)).toBe('red');
      expect(getStockColour(0, 50)).toBe('red');
    });
  });

  describe('filterMedicinesForPrediction', () => {
    const makeMedicine = (quantity: number, reorderLevel: number): MedicineStock => ({
      medicineId: `med-${Math.random()}`,
      name: 'Test Medicine',
      quantity,
      reorderLevel,
      expiryDate: '2025-12-31',
      centreId: 'centre-1',
    });

    it('selects medicines with quantity below 30% of reorder level', () => {
      const medicines = [
        makeMedicine(2, 100),  // 2 < 30 → selected
        makeMedicine(50, 100), // 50 >= 30 → excluded
      ];
      const result = filterMedicinesForPrediction(medicines);
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(2);
    });

    it('excludes medicines at exactly 30% of reorder level', () => {
      const medicines = [makeMedicine(30, 100)]; // 30 is NOT < 30
      const result = filterMedicinesForPrediction(medicines);
      expect(result).toHaveLength(0);
    });

    it('returns empty array when no medicines qualify', () => {
      const medicines = [
        makeMedicine(100, 100),
        makeMedicine(50, 100),
      ];
      expect(filterMedicinesForPrediction(medicines)).toHaveLength(0);
    });

    it('returns all medicines when all qualify', () => {
      const medicines = [
        makeMedicine(1, 100),
        makeMedicine(5, 100),
      ];
      expect(filterMedicinesForPrediction(medicines)).toHaveLength(2);
    });
  });

  describe('hasInsufficientData', () => {
    it('returns true when fewer than 7 days of data exist', () => {
      expect(hasInsufficientData(0)).toBe(true);
      expect(hasInsufficientData(6)).toBe(true);
    });

    it('returns false when exactly 7 days of data exist', () => {
      expect(hasInsufficientData(7)).toBe(false);
    });

    it('returns false when more than 7 days of data exist', () => {
      expect(hasInsufficientData(15)).toBe(false);
      expect(hasInsufficientData(30)).toBe(false);
    });
  });

  // ─── Property-Based Tests ────────────────────────────────────────────────

  describe('Property Tests', () => {
    /**
     * Feature: smart-health-ai-platform, Property 3: Stock colour-coding threshold correctness
     * **Validates: Requirements 3.5**
     */
    it('Property 3: getStockColour returns correct colour based on thresholds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999999 }),
          fc.integer({ min: 1, max: 999999 }),
          (quantity, reorderLevel) => {
            const colour = getStockColour(quantity, reorderLevel);

            if (quantity > reorderLevel) {
              expect(colour).toBe('green');
            } else if (quantity > reorderLevel * 0.5) {
              expect(colour).toBe('yellow');
            } else {
              expect(colour).toBe('red');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: smart-health-ai-platform, Property 13: Stock-out prediction filter
     * **Validates: Requirements 7.2**
     */
    it('Property 13: filterMedicinesForPrediction selects exactly medicines below 30% of reorder level', () => {
      const medicineArb = fc.record({
        medicineId: fc.string({ minLength: 1, maxLength: 10 }),
        name: fc.string({ minLength: 1, maxLength: 30 }),
        quantity: fc.integer({ min: 0, max: 999999 }),
        reorderLevel: fc.integer({ min: 1, max: 999999 }),
        expiryDate: fc.constant('2025-12-31'),
        centreId: fc.string({ minLength: 1, maxLength: 10 }),
      });

      fc.assert(
        fc.property(
          fc.array(medicineArb, { minLength: 0, maxLength: 20 }),
          (medicines) => {
            const result = filterMedicinesForPrediction(medicines);

            // Every returned medicine must satisfy quantity < reorderLevel * 0.3
            for (const med of result) {
              expect(med.quantity).toBeLessThan(med.reorderLevel * 0.3);
            }

            // Every medicine NOT returned must NOT satisfy the condition
            const resultIds = new Set(result.map((m) => m.medicineId));
            for (const med of medicines) {
              if (!resultIds.has(med.medicineId)) {
                expect(med.quantity).toBeGreaterThanOrEqual(med.reorderLevel * 0.3);
              }
            }

            // Result length matches manual count
            const expectedCount = medicines.filter(
              (m) => m.quantity < m.reorderLevel * 0.3
            ).length;
            expect(result).toHaveLength(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: smart-health-ai-platform, Property 15: Insufficient consumption data flag
     * **Validates: Requirements 7.4**
     */
    it('Property 15: hasInsufficientData returns true iff fewer than 7 days in last 30', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 }),
          (consumptionDays) => {
            const result = hasInsufficientData(consumptionDays);

            if (consumptionDays < 7) {
              expect(result).toBe(true);
            } else {
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

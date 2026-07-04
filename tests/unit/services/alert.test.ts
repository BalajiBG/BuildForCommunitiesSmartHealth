import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isStockLow, isFullCapacity, isUnderstaffed } from '@/lib/services/alert';

describe('AlertService', () => {
  describe('isStockLow', () => {
    it('returns true when quantity is below reorder level', () => {
      expect(isStockLow(5, 10)).toBe(true);
    });

    it('returns false when quantity equals reorder level', () => {
      expect(isStockLow(10, 10)).toBe(false);
    });

    it('returns false when quantity is above reorder level', () => {
      expect(isStockLow(15, 10)).toBe(false);
    });

    it('returns true when quantity is 0 and reorder level is positive', () => {
      expect(isStockLow(0, 1)).toBe(true);
    });

    it('returns false when both are 0', () => {
      expect(isStockLow(0, 0)).toBe(false);
    });

    /**
     * Property 4: isStockLow returns true iff quantity < reorderLevel (strictly below)
     *
     * **Validates: Requirements 3.4**
     */
    it('Property 4: isStockLow returns true iff quantity < reorderLevel', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999999 }),
          fc.integer({ min: 0, max: 999999 }),
          (quantity, reorderLevel) => {
            const result = isStockLow(quantity, reorderLevel);
            const expected = quantity < reorderLevel;
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('isFullCapacity', () => {
    it('returns true when available beds is 0', () => {
      expect(isFullCapacity(0)).toBe(true);
    });

    it('returns false when available beds is 1', () => {
      expect(isFullCapacity(1)).toBe(false);
    });

    it('returns false when available beds is a large number', () => {
      expect(isFullCapacity(100)).toBe(false);
    });

    /**
     * Property 10: isFullCapacity returns true iff availableBeds === 0
     *
     * **Validates: Requirements 5.4, 5.5**
     */
    it('Property 10: isFullCapacity returns true iff availableBeds === 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          (availableBeds) => {
            const result = isFullCapacity(availableBeds);
            const expected = availableBeds === 0;
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('isUnderstaffed', () => {
    it('returns true when present is below 50% of assigned', () => {
      expect(isUnderstaffed(2, 10)).toBe(true);
    });

    it('returns false when present is exactly 50% of assigned', () => {
      expect(isUnderstaffed(5, 10)).toBe(false);
    });

    it('returns false when present is above 50% of assigned', () => {
      expect(isUnderstaffed(8, 10)).toBe(false);
    });

    it('returns false when present equals assigned', () => {
      expect(isUnderstaffed(10, 10)).toBe(false);
    });

    it('returns false when both are 0 (0 < 0 * 0.5 is false)', () => {
      expect(isUnderstaffed(0, 0)).toBe(false);
    });

    it('returns true when present is 0 and assigned is positive', () => {
      expect(isUnderstaffed(0, 4)).toBe(true);
    });

    /**
     * Property 12: isUnderstaffed returns true iff presentCount < assignedDoctors * 0.5
     *
     * **Validates: Requirements 6.3**
     */
    it('Property 12: isUnderstaffed returns true iff presentCount < assignedDoctors * 0.5', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          (presentCount, assignedDoctors) => {
            const result = isUnderstaffed(presentCount, assignedDoctors);
            const expected = presentCount < assignedDoctors * 0.5;
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

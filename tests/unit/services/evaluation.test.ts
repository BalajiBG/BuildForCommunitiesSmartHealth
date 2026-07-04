import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { evaluateCentre, CentreInfo, CentreMetrics } from '@/lib/services/evaluation';

describe('EvaluationService', () => {
  describe('evaluateCentre', () => {
    // --- Unit Tests ---

    it('returns not underperforming when no conditions are breached', () => {
      const centre: CentreInfo = { assignedDoctors: 10, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: false,
        presentDoctors: 8,
        availableBeds: 5,
        dailyFootfall: 50,
      };
      const result = evaluateCentre(centre, metrics);
      expect(result.isUnderperforming).toBe(false);
      expect(result.breachedMetrics).toEqual([]);
    });

    it('returns not underperforming when only 1 condition is breached (low stock)', () => {
      const centre: CentreInfo = { assignedDoctors: 10, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: true,
        presentDoctors: 8,
        availableBeds: 5,
        dailyFootfall: 50,
      };
      const result = evaluateCentre(centre, metrics);
      expect(result.isUnderperforming).toBe(false);
      expect(result.breachedMetrics).toEqual(['stock_below_reorder']);
    });

    it('returns underperforming when exactly 2 conditions are breached', () => {
      const centre: CentreInfo = { assignedDoctors: 10, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: true,
        presentDoctors: 3, // below 50% of 10
        availableBeds: 5,
        dailyFootfall: 50,
      };
      const result = evaluateCentre(centre, metrics);
      expect(result.isUnderperforming).toBe(true);
      expect(result.breachedMetrics).toEqual(['stock_below_reorder', 'attendance_below_50_percent']);
    });

    it('returns underperforming when 3 conditions are breached', () => {
      const centre: CentreInfo = { assignedDoctors: 10, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: true,
        presentDoctors: 2,
        availableBeds: 0,
        dailyFootfall: 50,
      };
      const result = evaluateCentre(centre, metrics);
      expect(result.isUnderperforming).toBe(true);
      expect(result.breachedMetrics).toEqual([
        'stock_below_reorder',
        'attendance_below_50_percent',
        'beds_at_zero',
      ]);
    });

    it('returns underperforming when all 4 conditions are breached', () => {
      const centre: CentreInfo = { assignedDoctors: 10, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: true,
        presentDoctors: 2,
        availableBeds: 0,
        dailyFootfall: 150,
      };
      const result = evaluateCentre(centre, metrics);
      expect(result.isUnderperforming).toBe(true);
      expect(result.breachedMetrics).toEqual([
        'stock_below_reorder',
        'attendance_below_50_percent',
        'beds_at_zero',
        'footfall_exceeds_capacity',
      ]);
    });

    it('attendance at exactly 50% is not breached', () => {
      const centre: CentreInfo = { assignedDoctors: 10, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: false,
        presentDoctors: 5, // exactly 50%
        availableBeds: 5,
        dailyFootfall: 50,
      };
      const result = evaluateCentre(centre, metrics);
      expect(result.isUnderperforming).toBe(false);
      expect(result.breachedMetrics).toEqual([]);
    });

    it('footfall equal to max capacity is not breached', () => {
      const centre: CentreInfo = { assignedDoctors: 10, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: false,
        presentDoctors: 8,
        availableBeds: 5,
        dailyFootfall: 100, // exactly at max, not exceeding
      };
      const result = evaluateCentre(centre, metrics);
      expect(result.isUnderperforming).toBe(false);
      expect(result.breachedMetrics).toEqual([]);
    });

    it('footfall exceeding max capacity by 1 is breached', () => {
      const centre: CentreInfo = { assignedDoctors: 10, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: false,
        presentDoctors: 8,
        availableBeds: 5,
        dailyFootfall: 101,
      };
      const result = evaluateCentre(centre, metrics);
      expect(result.isUnderperforming).toBe(false);
      expect(result.breachedMetrics).toEqual(['footfall_exceeds_capacity']);
    });

    it('handles zero assigned doctors (no attendance breach possible when 0 present)', () => {
      const centre: CentreInfo = { assignedDoctors: 0, maxPatientCapacity: 100 };
      const metrics: CentreMetrics = {
        hasLowStock: false,
        presentDoctors: 0,
        availableBeds: 5,
        dailyFootfall: 50,
      };
      const result = evaluateCentre(centre, metrics);
      // 0 < 0 * 0.5 = 0 < 0 = false
      expect(result.isUnderperforming).toBe(false);
      expect(result.breachedMetrics).toEqual([]);
    });

    // --- Property-Based Test ---

    /**
     * Property 18: Underperforming centre flag logic
     *
     * For any Health Centre, the AI Engine SHALL flag it as underperforming if and only if
     * two or more of the following conditions are simultaneously true:
     * - Stock of any medicine is below its reorder level
     * - Doctor attendance is below 50% of assigned doctors
     * - Available beds equals zero
     * - Daily patient footfall exceeds the centre's designated maximum patient capacity
     *
     * **Validates: Requirements 9.2**
     */
    it('Property 18: evaluateCentre flags underperforming iff 2+ conditions breached', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // hasLowStock
          fc.integer({ min: 0, max: 1000 }), // assignedDoctors
          fc.integer({ min: 0, max: 1000 }), // presentDoctors
          fc.integer({ min: 0, max: 500 }), // availableBeds
          fc.integer({ min: 0, max: 10000 }), // dailyFootfall
          fc.integer({ min: 1, max: 10000 }), // maxPatientCapacity (>0 to be meaningful)
          (hasLowStock, assignedDoctors, presentDoctors, availableBeds, dailyFootfall, maxPatientCapacity) => {
            const centre: CentreInfo = { assignedDoctors, maxPatientCapacity };
            const metrics: CentreMetrics = {
              hasLowStock,
              presentDoctors,
              availableBeds,
              dailyFootfall,
            };

            const result = evaluateCentre(centre, metrics);

            // Manually compute expected conditions
            let breachCount = 0;
            if (hasLowStock) breachCount++;
            if (presentDoctors < assignedDoctors * 0.5) breachCount++;
            if (availableBeds === 0) breachCount++;
            if (dailyFootfall > maxPatientCapacity) breachCount++;

            const expectedUnderperforming = breachCount >= 2;

            return result.isUnderperforming === expectedUnderperforming &&
                   result.breachedMetrics.length === breachCount;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

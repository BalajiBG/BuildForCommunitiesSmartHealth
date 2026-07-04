import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { aggregateFootfall } from '@/lib/services/aggregation';
import { getSevenDayChartData } from '@/lib/services/chart-data';

/**
 * Property 8: Aggregate footfall sum
 *
 * For any set of Health Centres with daily footfall values, the district-level
 * aggregated footfall for a given day SHALL equal the arithmetic sum of all
 * individual centre footfall values for that day.
 *
 * **Validates: Requirements 4.6**
 */
describe('AggregationService', () => {
  describe('aggregateFootfall', () => {
    it('should return 0 for an empty array', () => {
      expect(aggregateFootfall([])).toBe(0);
    });

    it('should return the count for a single centre', () => {
      expect(aggregateFootfall([{ centreId: 'c1', count: 42 }])).toBe(42);
    });

    it('should sum counts across multiple centres', () => {
      const centres = [
        { centreId: 'c1', count: 100 },
        { centreId: 'c2', count: 200 },
        { centreId: 'c3', count: 50 },
      ];
      expect(aggregateFootfall(centres)).toBe(350);
    });

    it('should handle centres with zero footfall', () => {
      const centres = [
        { centreId: 'c1', count: 0 },
        { centreId: 'c2', count: 0 },
      ];
      expect(aggregateFootfall(centres)).toBe(0);
    });

    /**
     * Property 8: Aggregate footfall sum
     * Feature: smart-health-ai-platform, Property 8: Aggregate footfall sum
     * **Validates: Requirements 4.6**
     */
    it('Property 8: aggregate footfall equals arithmetic sum of all centre counts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              centreId: fc.string({ minLength: 1, maxLength: 10 }),
              count: fc.integer({ min: 0, max: 10000 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (centreFootfalls) => {
            const result = aggregateFootfall(centreFootfalls);
            const expectedSum = centreFootfalls.reduce((sum, entry) => sum + entry.count, 0);
            expect(result).toBe(expectedSum);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Seven-day footfall zero-fill
   *
   * For any sparse set of footfall records within a 7-day window, the chart data
   * transformation SHALL produce exactly 7 entries (one per day), with zero
   * substituted for any day without a recorded value.
   *
   * **Validates: Requirements 4.5**
   */
  describe('getSevenDayChartData', () => {
    it('should return exactly 7 labels and 7 data entries', () => {
      const result = getSevenDayChartData({});
      expect(result.labels).toHaveLength(7);
      expect(result.data).toHaveLength(7);
    });

    it('should return zeros when records are empty', () => {
      const result = getSevenDayChartData({});
      expect(result.data.every((v) => v === 0)).toBe(true);
    });

    it('should include recorded values at the correct position', () => {
      const result = getSevenDayChartData({ '2024-01-07': 150 }, '2024-01-07');
      // The last entry (endDate) should be 150
      expect(result.labels[6]).toBe('2024-01-07');
      expect(result.data[6]).toBe(150);
    });

    it('should zero-fill missing days', () => {
      const result = getSevenDayChartData(
        { '2024-01-01': 10, '2024-01-04': 20 },
        '2024-01-07'
      );
      // Days: Jan 1-7, only Jan 1 and Jan 4 have data
      expect(result.labels).toEqual([
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05',
        '2024-01-06',
        '2024-01-07',
      ]);
      expect(result.data).toEqual([10, 0, 0, 20, 0, 0, 0]);
    });

    it('should handle all 7 days having data', () => {
      const records: Record<string, number> = {
        '2024-01-01': 1,
        '2024-01-02': 2,
        '2024-01-03': 3,
        '2024-01-04': 4,
        '2024-01-05': 5,
        '2024-01-06': 6,
        '2024-01-07': 7,
      };
      const result = getSevenDayChartData(records, '2024-01-07');
      expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    /**
     * Property 7: Seven-day footfall zero-fill
     * Feature: smart-health-ai-platform, Property 7: Seven-day footfall zero-fill
     * **Validates: Requirements 4.5**
     */
    it('Property 7: always produces exactly 7 entries with zero-fill for missing days', () => {
      // Generator for sparse footfall records
      const sparseRecordsArb = fc.record({
        endDate: fc.date({
          min: new Date('2020-01-08'),
          max: new Date('2030-12-31'),
        }),
        // Random subset of 0-7 entries within the window
        daysWithData: fc.array(
          fc.record({
            dayOffset: fc.integer({ min: 0, max: 6 }),
            count: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 0, maxLength: 7 }
        ),
      });

      fc.assert(
        fc.property(sparseRecordsArb, ({ endDate, daysWithData }) => {
          // Build records from the generated data
          const records: Record<string, number> = {};
          const endDateStr = formatDate(endDate);

          for (const { dayOffset, count } of daysWithData) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - dayOffset);
            records[formatDate(d)] = count;
          }

          const result = getSevenDayChartData(records, endDateStr);

          // Always exactly 7 entries
          expect(result.labels).toHaveLength(7);
          expect(result.data).toHaveLength(7);

          // Each data entry is either from records or 0
          for (let i = 0; i < 7; i++) {
            const label = result.labels[i];
            if (label in records) {
              expect(result.data[i]).toBe(records[label]);
            } else {
              expect(result.data[i]).toBe(0);
            }
          }

          // Labels should be consecutive dates
          for (let i = 1; i < 7; i++) {
            const prev = new Date(result.labels[i - 1] + 'T00:00:00');
            const curr = new Date(result.labels[i] + 'T00:00:00');
            const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
            expect(diffDays).toBe(1);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * AggregationService — Aggregates footfall data across centres for district totals.
 *
 * Validates: Requirements 4.6
 */

/**
 * Returns the sum of all centre footfall values for a given day.
 * Each entry represents one centre's footfall count.
 *
 * @param centreFootfalls - Array of objects with centreId and count
 * @returns The total footfall across all centres
 */
export function aggregateFootfall(
  centreFootfalls: { centreId: string; count: number }[]
): number {
  return centreFootfalls.reduce((sum, entry) => sum + entry.count, 0);
}

/**
 * ChartDataService — Transforms sparse footfall records into a 7-entry array
 * suitable for rendering a bar chart with zero-fill for missing days.
 *
 * Validates: Requirements 4.5
 */

/**
 * Generates 7 consecutive date labels ending at endDate (defaults to today)
 * and maps each date to the corresponding count from records, defaulting to 0.
 *
 * @param records - A map of date strings (YYYY-MM-DD) to patient count values
 * @param endDate - The last date in the 7-day window (YYYY-MM-DD). Defaults to today.
 * @returns An object with labels (date strings) and data (count values) arrays, each of length 7.
 */
export function getSevenDayChartData(
  records: Record<string, number>,
  endDate?: string
): { labels: string[]; data: number[] } {
  const end = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  // Normalize end date to midnight
  end.setHours(0, 0, 0, 0);

  const labels: string[] = [];
  const data: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const dateStr = formatDate(date);
    labels.push(dateStr);
    data.push(records[dateStr] ?? 0);
  }

  return { labels, data };
}

/**
 * Formats a Date object as YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

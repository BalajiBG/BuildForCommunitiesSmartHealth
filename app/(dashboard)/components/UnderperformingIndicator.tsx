'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface UnderperformingIndicatorProps {
  isUnderperforming: boolean;
  breachedMetrics: string[];
}

const METRIC_LABEL_KEYS: Record<string, string> = {
  stock_below_reorder: 'metricStockBelowReorder',
  attendance_below_50_percent: 'metricAttendanceBelow50',
  beds_at_zero: 'metricBedsAtZero',
  footfall_exceeds_capacity: 'metricFootfallExceedsCapacity',
};

/**
 * UnderperformingIndicator displays a red indicator with a summary of breached
 * metrics when a centre is flagged as underperforming.
 *
 * Validates: Requirements 9.3
 */
export function UnderperformingIndicator({
  isUnderperforming,
  breachedMetrics,
}: UnderperformingIndicatorProps) {
  const t = useTranslations('evaluation');

  if (!isUnderperforming) {
    return null;
  }

  return (
    <div
      className="mt-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded-md"
      role="status"
      aria-label={t('underperformingLabel')}
    >
      <div className="flex items-center gap-1 mb-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" aria-hidden="true" />
        <span className="text-xs font-semibold text-red-700">{t('underperformingLabel')}</span>
      </div>
      <ul className="list-none space-y-0.5">
        {breachedMetrics.map((metric) => (
          <li key={metric} className="text-xs text-red-600 pl-3.5">
            • {t(METRIC_LABEL_KEYS[metric] ?? metric)}
          </li>
        ))}
      </ul>
    </div>
  );
}

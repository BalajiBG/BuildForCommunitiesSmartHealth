'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { UnderperformingIndicator } from './UnderperformingIndicator';

interface CentreCardProps {
  id: string;
  name: string;
  stockColour: 'green' | 'yellow' | 'red';
  availableBeds: number;
  totalBeds: number;
  presentDoctors: number;
  assignedDoctors: number;
  footfallCount: number;
  isUnderperforming?: boolean;
  breachedMetrics?: string[];
  onClick?: (id: string) => void;
  isSelected?: boolean;
}

const STOCK_COLOUR_CONFIG: Record<string, { dot: string; label: string; pulse: boolean }> = {
  green: { dot: 'bg-emerald-500', label: 'statusGreen', pulse: false },
  yellow: { dot: 'bg-amber-400', label: 'statusYellow', pulse: false },
  red: { dot: 'bg-rose-500', label: 'statusRed', pulse: true },
};

/**
 * CentreCard — Modern card displaying a Health Centre's key metrics.
 * Features progress bars, status indicators, and hover animations.
 * Supports interactive selection mode via onClick/isSelected props.
 */
export function CentreCard({
  id,
  name,
  stockColour,
  availableBeds,
  totalBeds,
  presentDoctors,
  assignedDoctors,
  footfallCount,
  isUnderperforming = false,
  breachedMetrics = [],
  onClick,
  isSelected = false,
}: CentreCardProps) {
  const tStock = useTranslations('stock');
  const tBeds = useTranslations('beds');
  const tDoctors = useTranslations('doctors');
  const tDashboard = useTranslations('dashboard');

  const stockConfig = STOCK_COLOUR_CONFIG[stockColour];
  const bedOccupancy = totalBeds > 0 ? ((totalBeds - availableBeds) / totalBeds) * 100 : 0;
  const doctorAttendance = assignedDoctors > 0 ? (presentDoctors / assignedDoctors) * 100 : 0;

  // Determine bed bar color
  const bedBarColor = bedOccupancy >= 90 ? 'bg-rose-500' : bedOccupancy >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  const doctorBarColor = doctorAttendance < 50 ? 'bg-rose-500' : doctorAttendance < 75 ? 'bg-amber-400' : 'bg-emerald-500';

  const selectedStyles = isSelected
    ? 'ring-2 ring-blue-500 border-blue-500 shadow-md'
    : 'border-gray-100 shadow-sm';

  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className={`group block w-full text-left bg-white rounded-xl border p-5 card-hover focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 ${selectedStyles}`}
      aria-label={`${name} - ${tStock(stockConfig.label)}`}
      aria-pressed={isSelected}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
            {name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${stockConfig.dot} ${stockConfig.pulse ? 'animate-pulse-dot' : ''}`}
            title={tStock(stockConfig.label)}
            aria-label={`${tDashboard('summaryStock')}: ${tStock(stockConfig.label)}`}
          />
          <span className="text-xs text-gray-400 font-medium">
            {tStock(stockConfig.label)}
          </span>
        </div>
      </div>

      {/* Bed Occupancy */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">{tBeds('availableBeds')}</span>
          <span className="text-sm font-bold text-gray-900">
            {availableBeds}<span className="text-gray-400 font-normal">/{totalBeds}</span>
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${bedBarColor}`}
            style={{ width: `${bedOccupancy}%` }}
          />
        </div>
      </div>

      {/* Doctor Attendance */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">{tDoctors('present')}</span>
          <span className="text-sm font-bold text-gray-900">
            {presentDoctors}<span className="text-gray-400 font-normal">/{assignedDoctors}</span>
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${doctorBarColor}`}
            style={{ width: `${Math.min(doctorAttendance, 100)}%` }}
          />
        </div>
      </div>

      {/* Footfall */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <span className="text-xs text-gray-500">{tDashboard('summaryFootfall')}</span>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <span className="text-lg font-bold text-gray-900">{footfallCount}</span>
        </div>
      </div>

      {/* Underperforming Indicator */}
      <UnderperformingIndicator
        isUnderperforming={isUnderperforming}
        breachedMetrics={breachedMetrics}
      />
    </button>
  );
}

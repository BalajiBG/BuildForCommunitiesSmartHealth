'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export type AlertType = 'stock_low' | 'full_capacity' | 'understaffed' | 'underperforming';

export interface Alert {
  id: string;
  type: AlertType;
  centreId: string;
  message: string;
}

interface AlertBannerProps {
  alerts: Alert[];
}

const ALERT_STYLES: Record<AlertType, { bg: string; text: string; iconBg: string; icon: string; hoverBg: string }> = {
  stock_low: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    iconBg: 'bg-amber-100',
    icon: '⚠️',
    hoverBg: 'hover:bg-amber-100',
  },
  full_capacity: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    iconBg: 'bg-rose-100',
    icon: '🛏️',
    hoverBg: 'hover:bg-rose-100',
  },
  understaffed: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    iconBg: 'bg-orange-100',
    icon: '👨‍⚕️',
    hoverBg: 'hover:bg-orange-100',
  },
  underperforming: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    iconBg: 'bg-rose-100',
    icon: '🚩',
    hoverBg: 'hover:bg-rose-100',
  },
};

const ALERT_LABEL_KEYS: Record<AlertType, string> = {
  stock_low: 'alertStockLow',
  full_capacity: 'alertFullCapacity',
  understaffed: 'alertUnderstaffed',
  underperforming: 'alertUnderperforming',
};

/** Maps alert type to a user-friendly action hint */
const ALERT_ACTION_HINTS: Record<AlertType, string> = {
  stock_low: 'View medicine stock →',
  full_capacity: 'View bed availability →',
  understaffed: 'View doctor attendance →',
  underperforming: 'View centre details →',
};

/**
 * AlertBanner — Displays active alerts with a count badge.
 * Each alert row is clickable and navigates to the relevant centre detail page.
 * Collapsed by default, expands on click.
 */
export function AlertBanner({ alerts }: AlertBannerProps) {
  const t = useTranslations('dashboard');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(true);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="mb-6 animate-slide-down" role="region" aria-label="Alerts">
      {/* Header with count badge */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-rose-50 border border-rose-200 ${collapsed ? 'rounded-lg' : 'rounded-t-lg'} hover:bg-rose-100 transition-colors`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="text-sm font-semibold text-rose-800">Active Alerts</span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white min-w-[20px]">
            {visibleAlerts.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-rose-600 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Alert list — each row links to the centre */}
      {!collapsed && (
        <div className="border border-t-0 border-rose-200 rounded-b-lg overflow-hidden divide-y divide-rose-100">
          {visibleAlerts.map((alert) => {
            const style = ALERT_STYLES[alert.type];
            return (
              <Link
                key={alert.id}
                href={`/centre/${alert.centreId}`}
                className={`flex items-center gap-3 px-4 py-3 ${style.bg} ${style.hoverBg} transition-colors animate-slide-down group`}
                role="alert"
              >
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full ${style.iconBg} flex items-center justify-center text-sm`}
                  aria-hidden="true"
                >
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div>
                    <span className={`text-sm font-semibold ${style.text}`}>
                      {t(ALERT_LABEL_KEYS[alert.type])}
                    </span>
                    <span className={`text-sm ${style.text} ml-1.5`}>
                      — {alert.message}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 group-hover:text-gray-700 transition-colors">
                    {ALERT_ACTION_HINTS[alert.type]}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDismiss(e, alert.id)}
                  className="flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors"
                  aria-label={`Dismiss alert`}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';

export type CentreTab = 'overview' | 'infrastructure' | 'stock' | 'camps' | 'audit';

interface TabBarProps {
  activeTab: CentreTab;
  onTabChange: (tab: CentreTab) => void;
}

const TABS: { id: CentreTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏥' },
  { id: 'stock', label: 'Medicine Stock', icon: '💊' },
  { id: 'camps', label: 'Health Camps', icon: '🏕️' },
  { id: 'audit', label: 'Audit Log', icon: '📋' },
];

/**
 * TabBar — Horizontal pill navigation for centre detail page.
 * Scrollable on mobile, pill-style on desktop.
 */
export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-200 scrollbar-hide"
      role="tablist"
      aria-label="Centre sections"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors
              ${isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <span className="text-base" aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

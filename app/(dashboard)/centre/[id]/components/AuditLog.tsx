'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { fetchAuditEntries, AuditEntry, AuditCategory } from '@/lib/services/audit';
import { t } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/contexts/AuthProvider';

interface AuditLogProps {
  centreId: string;
}

const CATEGORY_BADGE: Record<AuditCategory, { label: string; className: string }> = {
  stock: { label: 'Stock', className: 'bg-purple-100 text-purple-800' },
  beds: { label: 'Beds', className: 'bg-blue-100 text-blue-800' },
  attendance: { label: 'Attendance', className: 'bg-teal-100 text-teal-800' },
  infrastructure: { label: 'Infrastructure', className: 'bg-orange-100 text-orange-800' },
  visit: { label: 'Visit', className: 'bg-green-100 text-green-800' },
  medicine_added: { label: 'Medicine Added', className: 'bg-indigo-100 text-indigo-800' },
  camp: { label: 'Camp', className: 'bg-rose-100 text-rose-800' },
  directive: { label: 'Directive', className: 'bg-amber-100 text-amber-800' },
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Today, ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${time}`;
  }

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

/**
 * AuditLog — Displays a timeline of audit entries for a centre.
 * Shows most recent first with category badges and load more support.
 */
export default function AuditLog({ centreId }: AuditLogProps) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 50;

  // Real-time listener for the latest entries
  useEffect(() => {
    const auditRef = ref(database, dbPaths.audit(centreId));
    const q = query(auditRef, orderByChild('timestamp'), limitToLast(PAGE_SIZE));

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setEntries([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const entryList: AuditEntry[] = Object.values(data) as AuditEntry[];
      entryList.sort((a, b) => b.timestamp - a.timestamp);
      setEntries(entryList);
      setHasMore(entryList.length >= PAGE_SIZE);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [centreId]);

  const handleLoadMore = useCallback(async () => {
    if (entries.length === 0) return;
    setLoadingMore(true);

    const lastTimestamp = entries[entries.length - 1].timestamp;
    const older = await fetchAuditEntries(centreId, PAGE_SIZE, lastTimestamp);

    if (older.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setEntries((prev) => [...prev, ...older]);
    setLoadingMore(false);
  }, [entries, centreId]);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow" aria-busy="true">
        <p className="text-gray-500">{t('loading_audit', lang)}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <p className="text-gray-500">{t('no_audit_entries', lang)}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{t('activity_log', lang)}</h3>

      <div className="space-y-3">
        {entries.map((entry, idx) => {
          const badge = CATEGORY_BADGE[entry.category] ?? { label: entry.category, className: 'bg-gray-100 text-gray-800' };
          return (
            <div
              key={`${entry.timestamp}-${idx}`}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${badge.className} whitespace-nowrap`}>
                  {badge.label}
                </span>
                <span className="text-sm text-gray-900 truncate">{entry.action}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                <span className="truncate max-w-[180px]" title={entry.userEmail}>
                  {entry.userEmail}
                </span>
                <span className="whitespace-nowrap">{formatTimestamp(entry.timestamp)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? t('loading', lang) : t('load_more', lang)}
          </button>
        </div>
      )}
    </div>
  );
}

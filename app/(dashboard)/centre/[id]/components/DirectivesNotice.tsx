'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { logAudit } from '@/lib/services/audit';
import type { Directive, DirectivePriority } from '@/lib/types';

const PRIORITY_COLOURS: Record<DirectivePriority, { bg: string; text: string; border: string; icon: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🚨' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '⚠️' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'ℹ️' },
};

interface DirectivesNoticeProps {
  centreId: string;
}

/**
 * DirectivesNotice — Shows active directives assigned to this centre.
 * Centre Staff can acknowledge, mark in-progress, or add remarks.
 */
export default function DirectivesNotice({ centreId }: DirectivesNoticeProps) {
  const { profile } = useAuth();
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarksFor, setRemarksFor] = useState<string | null>(null);
  const [remarksText, setRemarksText] = useState('');

  const districtId = profile?.districtId ?? '';

  useEffect(() => {
    if (!districtId) {
      setLoading(false);
      return;
    }

    const directivesRef = ref(database, dbPaths.directives(districtId));
    const unsub = onValue(directivesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setDirectives([]);
        setLoading(false);
        return;
      }

      const allDirectives: Directive[] = Object.entries(data).map(([id, val]) => ({
        ...(val as Directive),
        id,
      }));

      // Filter: directives for this centre (both active and completed)
      const forCentre = allDirectives.filter(
        (d) => d.targetCentreId === centreId
      );

      forCentre.sort((a, b) => {
        const statusOrder: Record<string, number> = { issued: 0, acknowledged: 1, in_progress: 2, completed: 3, rejected: 4 };
        if ((statusOrder[a.status] ?? 9) !== (statusOrder[b.status] ?? 9)) {
          return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        }
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, normal: 2 };
        return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
      });

      setDirectives(forCentre);
      setLoading(false);
    });

    return () => unsub();
  }, [districtId, centreId]);

  const handleAcknowledge = useCallback(async (directive: Directive) => {
    if (!directive.id || !districtId || !profile) return;
    const updates: Partial<Directive> = {
      status: 'acknowledged',
      updatedAt: Date.now(),
    };
    await update(ref(database, dbPaths.directive(districtId, directive.id)), updates);

    await logAudit({
      userEmail: profile.email ?? 'unknown',
      userRole: profile.role ?? 'unknown',
      action: `Acknowledged directive: ${directive.title}`,
      category: 'directive',
      centreId,
    });
  }, [districtId, centreId, profile]);

  const handleInProgress = useCallback(async (directive: Directive) => {
    if (!directive.id || !districtId) return;
    const updates: Partial<Directive> = {
      status: 'in_progress',
      updatedAt: Date.now(),
    };
    await update(ref(database, dbPaths.directive(districtId, directive.id)), updates);
  }, [districtId]);

  const handleAddRemarks = useCallback(async (directive: Directive, remarks: string) => {
    if (!directive.id || !districtId) return;
    const updates: Partial<Directive> = {
      remarks: remarks.trim() || null,
      updatedAt: Date.now(),
    };
    await update(ref(database, dbPaths.directive(districtId, directive.id)), updates);
  }, [districtId]);

  const handleMarkComplete = useCallback(async (directive: Directive) => {
    if (!directive.id || !districtId || !profile) return;
    const updates: Partial<Directive> = {
      status: 'completed',
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await update(ref(database, dbPaths.directive(districtId, directive.id)), updates);

    await logAudit({
      userEmail: profile.email ?? 'unknown',
      userRole: profile.role ?? 'unknown',
      action: `Completed directive: ${directive.title}`,
      category: 'directive',
      centreId,
    });
  }, [districtId, centreId, profile]);

  if (loading || directives.length === 0) return null;

  const activeDirectives = directives.filter(d => d.status !== 'completed' && d.status !== 'rejected');
  const completedDirectives = directives.filter(d => d.status === 'completed' || d.status === 'rejected');

  return (
    <div className="mb-6 space-y-3">
      {/* Active Directives */}
      {activeDirectives.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <h3 className="font-semibold text-amber-800 text-sm">
              Active Directives ({activeDirectives.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {activeDirectives.map((d) => {
              const priority = PRIORITY_COLOURS[d.priority];
              return (
                <div key={d.id} className={`p-4 ${priority.bg}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{priority.icon}</span>
                        <span className={`text-xs font-semibold ${priority.text} uppercase`}>
                          {d.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          • {d.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm">{d.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{d.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Issued by {d.issuedBy} • {new Date(d.issuedAt).toLocaleDateString()}
                      </p>
                      {d.remarks && (
                        <p className="text-xs text-gray-600 mt-1 italic">Remarks: {d.remarks}</p>
                      )}
                    </div>

                    {/* Actions for Centre Staff */}
                    {profile?.role === 'Centre_Staff' && (
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {d.status === 'issued' && (
                          <button
                            onClick={() => handleAcknowledge(d)}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                        {(d.status === 'issued' || d.status === 'acknowledged') && (
                          <button
                            onClick={() => handleInProgress(d)}
                            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            In Progress
                          </button>
                        )}
                        <button
                          onClick={() => handleMarkComplete(d)}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          ✅ Mark Complete
                        </button>
                        <button
                          onClick={() => { setRemarksFor(d.id ?? null); setRemarksText(d.remarks ?? ''); }}
                          className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Add Remarks
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Inline remarks input */}
                  {remarksFor === d.id && (
                    <div className="flex gap-2 mt-3 w-full">
                      <input
                        type="text"
                        value={remarksText}
                        onChange={(e) => setRemarksText(e.target.value)}
                        placeholder="Enter your remarks..."
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { handleAddRemarks(d, remarksText); setRemarksFor(null); }
                          if (e.key === 'Escape') setRemarksFor(null);
                        }}
                      />
                      <button
                        onClick={() => { handleAddRemarks(d, remarksText); setRemarksFor(null); }}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRemarksFor(null)}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Directives — collapsible */}
      {completedDirectives.length > 0 && (
        <details className="bg-white rounded-xl border border-green-200 overflow-hidden shadow-sm">
          <summary className="flex items-center gap-2 px-4 py-3 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors">
            <span className="text-green-600">✅</span>
            <span className="font-semibold text-green-800 text-sm">
              Completed Directives ({completedDirectives.length})
            </span>
          </summary>
          <div className="divide-y divide-gray-100">
            {completedDirectives.map((d) => (
              <div key={d.id} className="p-4 bg-green-50/50">
                <h4 className="font-medium text-gray-700 text-sm line-through opacity-75">{d.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Completed {d.completedAt ? new Date(d.completedAt).toLocaleDateString() : ''}
                  {d.remarks && ` • ${d.remarks}`}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

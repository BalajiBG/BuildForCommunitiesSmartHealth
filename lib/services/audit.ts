'use client';

import { ref, push, query, orderByChild, limitToLast, get, endBefore } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';

export type AuditCategory = 'stock' | 'beds' | 'attendance' | 'infrastructure' | 'visit' | 'medicine_added' | 'camp' | 'directive';

export interface AuditEntry {
  timestamp: number;
  userEmail: string;
  userRole: string;
  action: string;
  category: AuditCategory;
  centreId: string;
}

/**
 * Logs an audit entry to /audit/{centreId}/{auto-id}.
 */
export async function logAudit(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  const auditRef = ref(database, dbPaths.audit(entry.centreId));
  await push(auditRef, {
    ...entry,
    timestamp: Date.now(),
  });
}

/**
 * Fetches audit entries for a centre, ordered by timestamp descending.
 * Supports pagination via lastTimestamp.
 */
export async function fetchAuditEntries(
  centreId: string,
  limit: number = 50,
  lastTimestamp?: number
): Promise<AuditEntry[]> {
  const auditRef = ref(database, dbPaths.audit(centreId));

  let q;
  if (lastTimestamp) {
    q = query(auditRef, orderByChild('timestamp'), endBefore(lastTimestamp), limitToLast(limit));
  } else {
    q = query(auditRef, orderByChild('timestamp'), limitToLast(limit));
  }

  const snapshot = await get(q);
  const data = snapshot.val();

  if (!data) return [];

  const entries: AuditEntry[] = Object.values(data) as AuditEntry[];
  // Sort descending by timestamp
  entries.sort((a, b) => b.timestamp - a.timestamp);

  return entries;
}

'use client';

import { useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { logAudit, AuditCategory } from '@/lib/services/audit';

/**
 * Custom hook that returns a `log` function to record audit entries.
 * Automatically captures the current user's email and role.
 */
export function useAuditLog(centreId: string) {
  const { profile } = useAuth();

  const log = useCallback(
    async (action: string, category: AuditCategory) => {
      if (!profile) return;

      try {
        await logAudit({
          userEmail: profile.email ?? 'unknown',
          userRole: profile.role ?? 'unknown',
          action,
          category,
          centreId,
        });
      } catch (err) {
        // Audit logging should not block user actions — fail silently
        console.error('Audit log failed:', err);
      }
    },
    [centreId, profile]
  );

  return { log };
}

'use client';

import React, { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { UserProfile } from '@/lib/types';

type AllowedRole = NonNullable<UserProfile['role']>;

interface RoleGuardProps {
  children: ReactNode;
  /** Single role or array of roles permitted to access the wrapped content */
  allowedRoles: AllowedRole | AllowedRole[];
}

/**
 * RoleGuard restricts page access based on user role.
 *
 * - If user profile has no role defined → "account not authorized" message
 * - If user role does not match any of the allowedRoles → "not authorized" message
 * - If user role matches → renders children
 */
export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { profile } = useAuth();
  const t = useTranslations('auth');

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // No role defined in user profile — account not authorized
  if (!profile?.role) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="alert">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <p className="text-red-800 font-medium">{t('unauthorized')}</p>
        </div>
      </div>
    );
  }

  // Role doesn't match required roles
  if (!roles.includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="alert">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <p className="text-red-800 font-medium">{t('unauthorized')}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

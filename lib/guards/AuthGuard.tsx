'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/AuthProvider';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard redirects unauthenticated users to the login page.
 * While auth state is loading, a spinner is displayed.
 * Once loading completes, if user is null the guard redirects to /login.
 * If user is authenticated, children are rendered.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations('common');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label={t('loading')}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    // While redirecting, show nothing
    return null;
  }

  return <>{children}</>;
}

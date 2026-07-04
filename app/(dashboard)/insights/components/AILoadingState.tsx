'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

/**
 * AILoadingState — displays a loading spinner with message during AI API calls.
 * The AI service has a 30-second timeout, so this may display for up to 30s.
 */
export function AILoadingState() {
  const t = useTranslations('ai');

  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
      <p className="text-gray-600 text-sm">{t('loading')}</p>
    </div>
  );
}

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface AIErrorStateProps {
  onRetry: () => void;
}

/**
 * AIErrorState — displays an error message with a retry button
 * when the AI service is unavailable or the request fails.
 */
export function AIErrorState({ onRetry }: AIErrorStateProps) {
  const t = useTranslations('ai');

  return (
    <div className="flex flex-col items-center justify-center py-8" role="alert">
      <p className="text-red-600 font-medium mb-4">{t('error')}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        {t('retry')}
      </button>
    </div>
  );
}

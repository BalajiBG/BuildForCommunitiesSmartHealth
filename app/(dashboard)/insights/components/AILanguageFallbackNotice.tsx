'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

/**
 * Displays a notice when AI-generated text falls back to English
 * because Gemini could not generate in the user's selected language.
 *
 * Validates: Requirements 10.5
 */
export function AILanguageFallbackNotice() {
  const t = useTranslations('ai');

  return (
    <div className="border border-blue-200 rounded-md p-3 bg-blue-50 mb-3">
      <p className="text-sm text-blue-700">
        {t('languageFallbackNotice')}
      </p>
    </div>
  );
}

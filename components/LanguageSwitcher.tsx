'use client';

import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import { useLocaleSwitch } from '@/lib/i18n/provider';

/**
 * Dropdown component for switching between English and Hindi.
 * Shows each language in its native script (English, हिंदी).
 */
export function LanguageSwitcher() {
  const { locale, changeLocale } = useLocaleSwitch();

  return (
    <select
      value={locale}
      onChange={(e) => changeLocale(e.target.value as Locale)}
      aria-label="Select language"
      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}

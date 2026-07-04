export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  hi: 'हिंदी',
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Load messages for a given locale.
 * Falls back to English if the locale file cannot be loaded.
 */
export async function getMessages(locale: Locale) {
  try {
    return (await import(`@/messages/${locale}.json`)).default;
  } catch {
    return (await import(`@/messages/en.json`)).default;
  }
}

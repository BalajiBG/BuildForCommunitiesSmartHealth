'use client';

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { defaultLocale, getMessages, isValidLocale, type Locale } from './config';

// Context for locale switching (separate from next-intl's internal context)
import { createContext, useContext } from 'react';

interface IntlLocaleContextValue {
  locale: Locale;
  changeLocale: (locale: Locale) => void;
}

export const IntlLocaleContext = createContext<IntlLocaleContextValue>({
  locale: defaultLocale,
  changeLocale: () => {},
});

export function useLocaleSwitch() {
  return useContext(IntlLocaleContext);
}

/** Callback type for listening to locale changes. */
export type LocaleChangeListener = (locale: Locale) => void;

interface IntlProviderProps {
  children: ReactNode;
}

/**
 * Client-side i18n provider for the MVP.
 * Manages locale state without middleware; locale preference is stored
 * in localStorage and synced to the user profile when authenticated.
 *
 * External listeners (e.g. language persistence hook) can subscribe via
 * `onLocaleChangeRef` to be notified when the user switches language.
 */
export function IntlProvider({ children }: IntlProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<AbstractIntlMessages | null>(null);
  const [isReady, setIsReady] = useState(false);
  const onLocaleChangeRef = useRef<LocaleChangeListener | null>(null);

  const loadMessages = useCallback(async (loc: Locale) => {
    const msgs = await getMessages(loc);
    setMessages(msgs);
    setIsReady(true);
  }, []);

  useEffect(() => {
    // Read locale from localStorage on mount
    const stored = typeof window !== 'undefined' ? localStorage.getItem('locale') : null;
    const initialLocale = stored && isValidLocale(stored) ? stored : defaultLocale;
    setLocale(initialLocale);
    loadMessages(initialLocale);
  }, [loadMessages]);

  const changeLocale = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
      localStorage.setItem('locale', newLocale);
      loadMessages(newLocale);
      // Notify external listener (e.g. RTDB persistence)
      onLocaleChangeRef.current?.(newLocale);
    },
    [loadMessages]
  );

  /**
   * Sets the locale externally (e.g. when loading user profile from RTDB).
   * Does not trigger the onLocaleChange listener to avoid circular writes.
   */
  const setLocaleFromProfile = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
      localStorage.setItem('locale', newLocale);
      loadMessages(newLocale);
    },
    [loadMessages]
  );

  if (!messages) {
    // Show a minimal loading state instead of blank page
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <IntlLocaleContext.Provider value={{ locale, changeLocale }}>
      <IntlInternalContext.Provider value={{ setLocaleFromProfile, onLocaleChangeRef }}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </IntlInternalContext.Provider>
    </IntlLocaleContext.Provider>
  );
}

/** Internal context for auth-level locale syncing (not for general use). */
interface IntlInternalContextValue {
  setLocaleFromProfile: (locale: Locale) => void;
  onLocaleChangeRef: React.MutableRefObject<LocaleChangeListener | null>;
}

export const IntlInternalContext = createContext<IntlInternalContextValue>({
  setLocaleFromProfile: () => {},
  onLocaleChangeRef: { current: null },
});

/**
 * Hook for auth/profile-level components to sync locale from RTDB
 * and register a listener for persisting locale changes back to RTDB.
 */
export function useIntlInternal() {
  return useContext(IntlInternalContext);
}

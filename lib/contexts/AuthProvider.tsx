'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  User,
  AuthError,
} from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { auth, database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { UserProfile } from '@/lib/types';
import { useIntlInternal } from '@/lib/i18n/provider';
import { isValidLocale, type Locale } from '@/lib/i18n/config';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isDemo: boolean;
  signIn: () => Promise<void>;
  signInDemo: (role: 'District_Admin' | 'Centre_Staff') => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  isDemo: false,
  signIn: async () => {},
  signInDemo: () => {},
  signOut: async () => {},
});

/**
 * Maps Firebase auth error codes to i18n translation keys.
 */
function getAuthErrorKey(error: AuthError): string {
  switch (error.code) {
    case 'auth/network-request-failed':
      return 'auth.errorNetwork';
    case 'auth/unauthorized-domain':
    case 'auth/popup-blocked':
      return 'auth.errorPopupBlocked';
    default:
      return 'auth.errorGeneric';
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize demo state synchronously from sessionStorage to prevent race conditions
  const [demoInit] = useState<{ isDemo: boolean; profile: UserProfile | null }>(() => {
    if (typeof window === 'undefined') return { isDemo: false, profile: null };
    const storedDemo = sessionStorage.getItem('demo_profile');
    if (storedDemo) {
      try {
        return { isDemo: true, profile: JSON.parse(storedDemo) as UserProfile };
      } catch {
        sessionStorage.removeItem('demo_profile');
      }
    }
    return { isDemo: false, profile: null };
  });

  const [user, setUser] = useState<User | null>(
    demoInit.profile ? ({ uid: demoInit.profile.uid, email: demoInit.profile.email } as unknown as User) : null
  );
  const [profile, setProfile] = useState<UserProfile | null>(demoInit.profile);
  const [loading, setLoading] = useState(!demoInit.isDemo);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(demoInit.isDemo);
  const router = useRouter();
  const { setLocaleFromProfile, onLocaleChangeRef } = useIntlInternal();

  // Demo user profiles — no Firebase needed
  const DEMO_PROFILES: Record<string, UserProfile> = {
    District_Admin: {
      uid: 'demo-admin',
      email: 'demo.admin@health.gujarat.gov.in',
      role: 'District_Admin',
      districtId: 'district-anand-guj',
      languagePreference: 'en',
    },
    Centre_Staff: {
      uid: 'demo-staff',
      email: 'demo.staff@health.gujarat.gov.in',
      role: 'Centre_Staff',
      districtId: 'district-anand-guj',
      centreId: 'phc-borsad',
      languagePreference: 'en',
    },
  };

  /**
   * Demo sign-in — instantly sets a demo profile without Firebase.
   * Persists to sessionStorage so it survives page navigations.
   */
  const signInDemo = useCallback((role: 'District_Admin' | 'Centre_Staff') => {
    // Get current locale from localStorage (set by LanguageSwitcher)
    const currentLocale = (typeof window !== 'undefined' ? localStorage.getItem('locale') : null) || 'en';
    const demoProfile = { ...DEMO_PROFILES[role], languagePreference: currentLocale as 'en' | 'hi' };
    setProfile(demoProfile);
    setUser({ uid: demoProfile.uid, email: demoProfile.email } as unknown as User);
    setIsDemo(true);
    setLoading(false);
    setError(null);
    sessionStorage.setItem('demo_profile', JSON.stringify(demoProfile));
    router.push('/');
  }, [router]);

  /**
   * Fetch the user profile from RTDB: /users/{uid}
   */
  const fetchUserProfile = useCallback(async (firebaseUser: User): Promise<UserProfile | null> => {
    try {
      const userRef = ref(database, dbPaths.user(firebaseUser.uid));
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          role: data.role,
          districtId: data.districtId,
          centreId: data.centreId,
          languagePreference: data.languagePreference ?? 'en',
        };
      }

      // User exists in Auth but has no profile in RTDB
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        languagePreference: 'en',
      };
    } catch {
      return null;
    }
  }, []);

  /**
   * Persist language preference to RTDB when the user changes it via the UI.
   */
  const persistLanguagePreference = useCallback(
    async (locale: Locale) => {
      if (!user) return;
      try {
        await update(ref(database, dbPaths.user(user.uid)), {
          languagePreference: locale,
        });
        // Also update the local profile state
        setProfile((prev) => (prev ? { ...prev, languagePreference: locale } : prev));
      } catch (error) {
        // Non-critical: language write failed; locale is still active locally
        console.error('Failed to persist language preference to RTDB:', error);
      }
    },
    [user]
  );

  // Register the language persistence callback with the IntlProvider
  useEffect(() => {
    onLocaleChangeRef.current = persistLanguagePreference;
    return () => {
      onLocaleChangeRef.current = null;
    };
  }, [persistLanguagePreference, onLocaleChangeRef]);

  // Listen to auth state changes (skip if in demo mode)
  useEffect(() => {
    if (isDemo) return;

    // Safety timeout: if Firebase auth doesn't respond in 3 seconds, stop loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      if (isDemo) return; // Double-check in case of race condition
      if (firebaseUser) {
        setUser(firebaseUser);
        const userProfile = await fetchUserProfile(firebaseUser);
        setProfile(userProfile);
        // Sync language preference from profile to IntlProvider
        if (userProfile?.languagePreference && isValidLocale(userProfile.languagePreference)) {
          setLocaleFromProfile(userProfile.languagePreference);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [fetchUserProfile, setLocaleFromProfile, isDemo]);

  /**
   * Sign in with Google popup.
   * On success, redirect to dashboard.
   * On failure, set a translatable error key.
   */
  const signIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userProfile = await fetchUserProfile(result.user);
      setUser(result.user);
      setProfile(userProfile);
      // Sync language preference from profile to IntlProvider
      if (userProfile?.languagePreference && isValidLocale(userProfile.languagePreference)) {
        setLocaleFromProfile(userProfile.languagePreference);
      }
      router.push('/');
    } catch (err) {
      const authError = err as AuthError;
      const errorKey = getAuthErrorKey(authError);
      setError(errorKey);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, router, setLocaleFromProfile]);

  /**
   * Sign out and redirect to login.
   */
  const signOut = useCallback(async () => {
    if (isDemo) {
      setUser(null);
      setProfile(null);
      setIsDemo(false);
      sessionStorage.removeItem('demo_profile');
      router.push('/login');
      return;
    }
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
      router.push('/login');
    } catch {
      // Sign out failure is non-critical; clear local state anyway
      setUser(null);
      setProfile(null);
    }
  }, [router, isDemo]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, isDemo, signIn, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

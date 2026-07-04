'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/**
 * Login page — Demo Mode only for hackathon judges.
 * Clean, focused design with the heart health logo.
 */
export default function LoginPage() {
  const { user, loading, signInDemo } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-indigo-600 mb-4 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Smart Health AI Platform
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            AI-powered health centre management for Indian districts
          </p>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 text-center mb-4">
            Select your role to continue
          </p>

          <button
            onClick={() => signInDemo('District_Admin')}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 px-5 py-4 text-left transition-all hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="inline-flex items-center justify-center w-10 h-10 bg-indigo-200 rounded-lg text-indigo-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </span>
            <div>
              <div className="font-semibold text-gray-900">District Admin</div>
              <div className="text-xs text-gray-500">Monitor all centres, issue directives, AI insights</div>
            </div>
          </button>

          <button
            onClick={() => signInDemo('Centre_Staff')}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 px-5 py-4 text-left transition-all hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <span className="inline-flex items-center justify-center w-10 h-10 bg-emerald-200 rounded-lg text-emerald-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </span>
            <div>
              <div className="font-semibold text-gray-900">Centre Staff</div>
              <div className="text-xs text-gray-500">Manage stock, record visits, update daily data</div>
            </div>
          </button>
        </div>

        {/* Language Selection */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-3">
          <span className="text-xs text-gray-400">भाषा / Language:</span>
          <LanguageSwitcher />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Beta</span>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Demo data: Anand District, Gujarat • 5 Health Centres
        </p>
      </div>
    </div>
  );
}

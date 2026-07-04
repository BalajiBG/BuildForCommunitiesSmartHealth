import type { Metadata } from 'next';
import './globals.css';
import { IntlProvider } from '@/lib/i18n/provider';
import { AuthProvider } from '@/lib/contexts/AuthProvider';

export const metadata: Metadata = {
  title: 'Smart Health AI Platform',
  description: 'AI-driven health centre management system for district-level PHCs and CHCs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <IntlProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </IntlProvider>
      </body>
    </html>
  );
}

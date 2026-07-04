import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      loading: 'Loading...',
    };
    return messages[key] ?? key;
  },
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/lib/contexts/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while auth state is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('redirects to /login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      loading: false,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not redirect while still loading even if user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });
});

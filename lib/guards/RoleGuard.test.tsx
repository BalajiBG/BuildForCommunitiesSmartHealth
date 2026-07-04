import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGuard } from './RoleGuard';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      unauthorized: 'You are not authorized to access this page.',
    };
    return messages[key] ?? key;
  },
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/lib/contexts/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('RoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows unauthorized message when user has no role defined', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid' },
      profile: { uid: 'test-uid', email: 'test@example.com', languagePreference: 'en' },
      loading: false,
    });

    render(
      <RoleGuard allowedRoles={['District_Admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('You are not authorized to access this page.')).toBeDefined();
    expect(screen.queryByText('Admin Content')).toBeNull();
  });

  it('shows unauthorized message when user role does not match required role', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid' },
      profile: {
        uid: 'test-uid',
        email: 'test@example.com',
        role: 'Centre_Staff',
        languagePreference: 'en',
      },
      loading: false,
    });

    render(
      <RoleGuard allowedRoles={['District_Admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('You are not authorized to access this page.')).toBeDefined();
    expect(screen.queryByText('Admin Content')).toBeNull();
  });

  it('renders children when user role matches single allowed role', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid' },
      profile: {
        uid: 'test-uid',
        email: 'test@example.com',
        role: 'District_Admin',
        languagePreference: 'en',
      },
      loading: false,
    });

    render(
      <RoleGuard allowedRoles="District_Admin">
        <div>Admin Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Admin Content')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders children when user role matches one of multiple allowed roles', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid' },
      profile: {
        uid: 'test-uid',
        email: 'test@example.com',
        role: 'Centre_Staff',
        languagePreference: 'en',
      },
      loading: false,
    });

    render(
      <RoleGuard allowedRoles={['District_Admin', 'Centre_Staff']}>
        <div>Shared Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Shared Content')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows unauthorized when profile is null', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid' },
      profile: null,
      loading: false,
    });

    render(
      <RoleGuard allowedRoles={['District_Admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('You are not authorized to access this page.')).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock firebase/database
const mockOnValue = vi.fn();
const mockRef = vi.fn();
const mockUpdate = vi.fn();

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  onValue: (refObj: unknown, callback: (snapshot: unknown) => void) => {
    mockOnValue(refObj, callback);
    return vi.fn(); // unsubscribe
  },
  update: (...args: unknown[]) => mockUpdate(...args),
}));

vi.mock('@/lib/firebase/client', () => ({
  database: {},
}));

vi.mock('@/lib/firebase/types', () => ({
  dbPaths: {
    centreMedicines: (id: string) => `medicines/${id}`,
    medicine: (centreId: string, medicineId: string) =>
      `medicines/${centreId}/${medicineId}`,
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      stock: {
        medicineName: 'Medicine Name',
        quantity: 'Quantity',
        reorderLevel: 'Reorder Level',
        expiry: 'Expiry Date',
      },
      common: {
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
      },
    };
    return translations[ns]?.[key] ?? key;
  },
}));

import { StockTable } from '@/app/(dashboard)/centre/[id]/components/StockTable';

describe('StockTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRef.mockReturnValue('mockRef');
    mockUpdate.mockResolvedValue(undefined);
  });

  function triggerSnapshot(data: Record<string, unknown> | null) {
    const callback = mockOnValue.mock.calls[0][1];
    callback({
      val: () => data,
    });
  }

  it('displays loading state initially', () => {
    render(<StockTable centreId="centre-1" />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('displays empty message when no medicines exist', async () => {
    render(<StockTable centreId="centre-1" />);
    triggerSnapshot(null);

    await waitFor(() => {
      expect(screen.getByText('No medicines found for this centre.')).toBeDefined();
    });
  });

  it('displays medicines sorted alphabetically by name', async () => {
    render(<StockTable centreId="centre-1" />);
    triggerSnapshot({
      'med-3': { name: 'Zolpidem', quantity: 100, reorderLevel: 50, expiryDate: '2025-12-01' },
      'med-1': { name: 'Amoxicillin', quantity: 200, reorderLevel: 100, expiryDate: '2025-06-15' },
      'med-2': { name: 'Metformin', quantity: 50, reorderLevel: 80, expiryDate: '2025-09-30' },
    });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // First row is header, then data rows
      const dataRows = rows.slice(1);
      expect(dataRows[0].textContent).toContain('Amoxicillin');
      expect(dataRows[1].textContent).toContain('Metformin');
      expect(dataRows[2].textContent).toContain('Zolpidem');
    });
  });

  it('displays medicine details: name, reorder level, and expiry date', async () => {
    render(<StockTable centreId="centre-1" />);
    triggerSnapshot({
      'med-1': { name: 'Paracetamol', quantity: 150, reorderLevel: 60, expiryDate: '2025-11-20' },
    });

    await waitFor(() => {
      expect(screen.getByText('Paracetamol')).toBeDefined();
      expect(screen.getByText('60')).toBeDefined();
      expect(screen.getByText('2025-11-20')).toBeDefined();
    });
  });

  it('applies green row colour when quantity > reorderLevel', async () => {
    render(<StockTable centreId="centre-1" />);
    triggerSnapshot({
      'med-1': { name: 'Aspirin', quantity: 200, reorderLevel: 100, expiryDate: '2025-12-01' },
    });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      expect(dataRow.className).toContain('bg-green-50');
    });
  });

  it('applies yellow row colour when quantity <= reorderLevel and > 50%', async () => {
    render(<StockTable centreId="centre-1" />);
    triggerSnapshot({
      'med-1': { name: 'Ibuprofen', quantity: 70, reorderLevel: 100, expiryDate: '2025-12-01' },
    });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      expect(dataRow.className).toContain('bg-yellow-50');
    });
  });

  it('applies red row colour when quantity <= 50% of reorderLevel', async () => {
    render(<StockTable centreId="centre-1" />);
    triggerSnapshot({
      'med-1': { name: 'Insulin', quantity: 20, reorderLevel: 100, expiryDate: '2025-12-01' },
    });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      expect(dataRow.className).toContain('bg-red-50');
    });
  });

  it('subscribes to the correct RTDB path for the given centre', () => {
    render(<StockTable centreId="my-centre" />);
    expect(mockRef).toHaveBeenCalledWith({}, 'medicines/my-centre');
  });

  it('updates display when real-time data changes', async () => {
    render(<StockTable centreId="centre-1" />);

    // Initial data
    triggerSnapshot({
      'med-1': { name: 'Aspirin', quantity: 200, reorderLevel: 100, expiryDate: '2025-12-01' },
    });

    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeDefined();
    });

    // Simulate real-time update: new medicine added
    const callback = mockOnValue.mock.calls[0][1];
    callback({
      val: () => ({
        'med-1': { name: 'Aspirin', quantity: 200, reorderLevel: 100, expiryDate: '2025-12-01' },
        'med-2': { name: 'Bandages', quantity: 50, reorderLevel: 30, expiryDate: '2026-01-15' },
      }),
    });

    await waitFor(() => {
      expect(screen.getByText('Bandages')).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock firebase/database
const mockUpdate = vi.fn();
const mockRef = vi.fn();

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
}));

vi.mock('@/lib/firebase/client', () => ({
  database: {},
}));

vi.mock('@/lib/firebase/types', () => ({
  dbPaths: {
    medicine: (centreId: string, medicineId: string) =>
      `medicines/${centreId}/${medicineId}`,
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      save: 'Save',
      cancel: 'Cancel',
    };
    return translations[key] ?? key;
  },
}));

import { StockEditForm } from '@/app/(dashboard)/centre/[id]/components/StockEditForm';

describe('StockEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRef.mockReturnValue('mockRef');
    mockUpdate.mockResolvedValue(undefined);
  });

  it('displays current quantity as a clickable button initially', () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={150} />
    );
    expect(screen.getByRole('button', { name: /edit quantity: 150/i })).toBeDefined();
  });

  it('enters edit mode when quantity button is clicked', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={150} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Medicine quantity')).toBeDefined();
      expect(screen.getByText('Save')).toBeDefined();
      expect(screen.getByText('Cancel')).toBeDefined();
    });
  });

  it('shows validation error for negative values', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Value must be a whole number between 0 and 999,999'
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('shows validation error for decimal values', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '10.5' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Value must be a whole number between 0 and 999,999'
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('shows validation error for values exceeding 999999', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '1000000' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Value must be a whole number between 0 and 999,999'
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('writes valid quantity to RTDB on save', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '250' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('mockRef', { quantity: 250 });
    });
  });

  it('writes to the correct medicine path', async () => {
    render(
      <StockEditForm centreId="centre-1" medicineId="med-42" currentQuantity={50} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockRef).toHaveBeenCalledWith({}, 'medicines/centre-1/med-42');
    });
  });

  it('accepts zero as a valid quantity', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('mockRef', { quantity: 0 });
    });
  });

  it('accepts 999999 as a valid quantity', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '999999' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('mockRef', { quantity: 999999 });
    });
  });

  it('shows error and retains previous value on write failure', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Permission denied'));

    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '300' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Update failed. Please try again.'
      );
    });

    // Value should rollback to previous (100)
    expect((screen.getByLabelText('Medicine quantity') as HTMLInputElement).value).toBe('100');
  });

  it('cancels editing and restores previous value', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      // Should exit edit mode and show button with original value
      expect(screen.getByRole('button', { name: /edit quantity: 100/i })).toBeDefined();
    });
  });

  it('saves on Enter key press', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('mockRef', { quantity: 200 });
    });
  });

  it('cancels on Escape key press', async () => {
    render(
      <StockEditForm centreId="c1" medicineId="m1" currentQuantity={100} />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit quantity/i }));

    const input = screen.getByLabelText('Medicine quantity');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit quantity: 100/i })).toBeDefined();
    });
  });
});

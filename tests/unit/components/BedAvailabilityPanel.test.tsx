import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock firebase/database
const mockOnValue = vi.fn();
const mockUpdate = vi.fn();
const mockRef = vi.fn();

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
    centre: (id: string) => `centres/${id}`,
  },
}));

import BedAvailabilityPanel from '@/app/(dashboard)/centre/[id]/components/BedAvailabilityPanel';

describe('BedAvailabilityPanel', () => {
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
    render(<BedAvailabilityPanel centreId="centre-1" />);
    expect(screen.getByText('Loading bed availability...')).toBeDefined();
  });

  it('displays total beds and available beds from RTDB data', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 50, availableBeds: 30 });

    await waitFor(() => {
      expect(screen.getByTestId('total-beds').textContent).toBe('50');
      expect(screen.getByTestId('available-beds').textContent).toBe('30');
    });
  });

  it('shows full-capacity alert when availableBeds is 0', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 20, availableBeds: 0 });

    await waitFor(() => {
      expect(screen.getByTestId('full-capacity-alert')).toBeDefined();
      expect(screen.getByText(/No beds available/)).toBeDefined();
    });
  });

  it('does NOT show full-capacity alert when availableBeds > 0', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 20, availableBeds: 5 });

    await waitFor(() => {
      expect(screen.queryByTestId('full-capacity-alert')).toBeNull();
    });
  });

  it('removes full-capacity alert when availableBeds increases above zero', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);

    // Initially at full capacity
    triggerSnapshot({ totalBeds: 20, availableBeds: 0 });
    await waitFor(() => {
      expect(screen.getByTestId('full-capacity-alert')).toBeDefined();
    });

    // Now beds become available
    triggerSnapshot({ totalBeds: 20, availableBeds: 3 });
    await waitFor(() => {
      expect(screen.queryByTestId('full-capacity-alert')).toBeNull();
    });
  });

  it('validates and rejects negative bed availability', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 20, availableBeds: 10 });

    await waitFor(() => {
      expect(screen.getByTestId('available-beds').textContent).toBe('10');
    });

    const input = screen.getByLabelText('Update Available Beds');
    fireEvent.change(input, { target: { value: '-1' } });
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(screen.getByTestId('bed-error')).toBeDefined();
      expect(screen.getByTestId('bed-error').textContent).toContain(
        'Available beds must be an integer between 0 and 20'
      );
    });

    // Should not call update
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('validates and rejects bed availability exceeding totalBeds', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 20, availableBeds: 10 });

    await waitFor(() => {
      expect(screen.getByTestId('available-beds').textContent).toBe('10');
    });

    const input = screen.getByLabelText('Update Available Beds');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(screen.getByTestId('bed-error')).toBeDefined();
      expect(screen.getByTestId('bed-error').textContent).toContain(
        'Available beds must be an integer between 0 and 20'
      );
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('calls RTDB update with valid bed availability value', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 20, availableBeds: 10 });

    await waitFor(() => {
      expect(screen.getByTestId('available-beds').textContent).toBe('10');
    });

    const input = screen.getByLabelText('Update Available Beds');
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('mockRef', { availableBeds: 15 });
    });
  });

  it('shows error and retains previous value on write failure', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Permission denied'));

    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 20, availableBeds: 10 });

    await waitFor(() => {
      expect(screen.getByTestId('available-beds').textContent).toBe('10');
    });

    const input = screen.getByLabelText('Update Available Beds');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(screen.getByTestId('bed-error')).toBeDefined();
      expect(screen.getByTestId('bed-error').textContent).toContain(
        'Failed to update bed availability'
      );
    });

    // Input should revert to previous value
    expect((input as HTMLInputElement).value).toBe('10');
  });

  it('accepts zero as a valid bed availability value', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 20, availableBeds: 10 });

    await waitFor(() => {
      expect(screen.getByTestId('available-beds').textContent).toBe('10');
    });

    const input = screen.getByLabelText('Update Available Beds');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('mockRef', { availableBeds: 0 });
    });
  });

  it('accepts totalBeds as a valid bed availability value', async () => {
    render(<BedAvailabilityPanel centreId="centre-1" />);
    triggerSnapshot({ totalBeds: 20, availableBeds: 10 });

    await waitFor(() => {
      expect(screen.getByTestId('available-beds').textContent).toBe('10');
    });

    const input = screen.getByLabelText('Update Available Beds');
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('mockRef', { availableBeds: 20 });
    });
  });
});

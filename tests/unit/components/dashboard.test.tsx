import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      stock: {
        statusGreen: 'Sufficient',
        statusYellow: 'Low Stock',
        statusRed: 'Critical',
      },
      beds: {
        availableBeds: 'Available Beds',
      },
      doctors: {
        present: 'Doctors Present',
      },
      dashboard: {
        summaryFootfall: "Today's Footfall",
        summaryStock: 'Stock Alerts',
        alertStockLow: 'Stock Low',
        alertFullCapacity: 'Full Capacity',
        alertUnderstaffed: 'Understaffed',
        alertUnderperforming: 'Underperforming',
        noData: 'No health centre data is currently available.',
      },
      evaluation: {
        underperformingLabel: 'Underperforming',
        unavailable: 'Centre evaluation is temporarily unavailable',
        metricStockBelowReorder: 'Stock below reorder',
        metricAttendanceBelow50: 'Attendance < 50%',
        metricBedsAtZero: 'Beds at zero',
        metricFootfallExceedsCapacity: 'Footfall exceeds capacity',
      },
    };
    return translations[ns]?.[key] ?? key;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { CentreCard } from '@/app/(dashboard)/components/CentreCard';
import { AlertBanner, Alert } from '@/app/(dashboard)/components/AlertBanner';
import { UnderperformingIndicator } from '@/app/(dashboard)/components/UnderperformingIndicator';

describe('CentreCard', () => {
  const defaultProps = {
    id: 'centre-1',
    name: 'PHC Riverside',
    stockColour: 'green' as const,
    availableBeds: 10,
    totalBeds: 20,
    presentDoctors: 3,
    assignedDoctors: 5,
    footfallCount: 42,
  };

  it('renders centre name', () => {
    render(<CentreCard {...defaultProps} />);
    expect(screen.getByText('PHC Riverside')).toBeDefined();
  });

  it('displays bed availability as available/total', () => {
    render(<CentreCard {...defaultProps} />);
    expect(screen.getByText('10/20')).toBeDefined();
  });

  it('displays doctor attendance as present/assigned', () => {
    render(<CentreCard {...defaultProps} />);
    expect(screen.getByText('3/5')).toBeDefined();
  });

  it('displays footfall count', () => {
    render(<CentreCard {...defaultProps} />);
    expect(screen.getByText('42')).toBeDefined();
  });

  it('links to the correct centre detail page', () => {
    render(<CentreCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/centre/centre-1');
  });

  it('renders green stock indicator for green status', () => {
    const { container } = render(<CentreCard {...defaultProps} stockColour="green" />);
    const indicator = container.querySelector('.bg-green-500');
    expect(indicator).toBeDefined();
    expect(indicator).not.toBeNull();
  });

  it('renders yellow stock indicator for yellow status', () => {
    const { container } = render(<CentreCard {...defaultProps} stockColour="yellow" />);
    const indicator = container.querySelector('.bg-yellow-400');
    expect(indicator).toBeDefined();
    expect(indicator).not.toBeNull();
  });

  it('renders red stock indicator for red status', () => {
    const { container } = render(<CentreCard {...defaultProps} stockColour="red" />);
    const indicator = container.querySelector('.bg-red-500');
    expect(indicator).toBeDefined();
    expect(indicator).not.toBeNull();
  });
});

describe('AlertBanner', () => {
  it('renders nothing when there are no alerts', () => {
    const { container } = render(<AlertBanner alerts={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders stock-low alert', () => {
    const alerts: Alert[] = [
      { id: 'a1', type: 'stock_low', centreId: 'c1', message: 'PHC Alpha' },
    ];
    render(<AlertBanner alerts={alerts} />);
    expect(screen.getByText('Stock Low:')).toBeDefined();
    expect(screen.getByText('PHC Alpha')).toBeDefined();
  });

  it('renders full-capacity alert', () => {
    const alerts: Alert[] = [
      { id: 'a2', type: 'full_capacity', centreId: 'c2', message: 'CHC Beta' },
    ];
    render(<AlertBanner alerts={alerts} />);
    expect(screen.getByText('Full Capacity:')).toBeDefined();
    expect(screen.getByText('CHC Beta')).toBeDefined();
  });

  it('renders understaffed alert', () => {
    const alerts: Alert[] = [
      { id: 'a3', type: 'understaffed', centreId: 'c3', message: 'PHC Gamma' },
    ];
    render(<AlertBanner alerts={alerts} />);
    expect(screen.getByText('Understaffed:')).toBeDefined();
    expect(screen.getByText('PHC Gamma')).toBeDefined();
  });

  it('renders underperforming alert', () => {
    const alerts: Alert[] = [
      { id: 'a4', type: 'underperforming', centreId: 'c4', message: 'PHC Delta' },
    ];
    render(<AlertBanner alerts={alerts} />);
    expect(screen.getByText('Underperforming:')).toBeDefined();
    expect(screen.getByText('PHC Delta')).toBeDefined();
  });

  it('renders multiple alerts', () => {
    const alerts: Alert[] = [
      { id: 'a1', type: 'stock_low', centreId: 'c1', message: 'PHC Alpha' },
      { id: 'a2', type: 'full_capacity', centreId: 'c2', message: 'CHC Beta' },
      { id: 'a3', type: 'understaffed', centreId: 'c3', message: 'PHC Gamma' },
    ];
    render(<AlertBanner alerts={alerts} />);
    expect(screen.getByText('Stock Low:')).toBeDefined();
    expect(screen.getByText('Full Capacity:')).toBeDefined();
    expect(screen.getByText('Understaffed:')).toBeDefined();
  });

  it('has role="alert" on each alert element', () => {
    const alerts: Alert[] = [
      { id: 'a1', type: 'stock_low', centreId: 'c1', message: 'PHC Alpha' },
    ];
    render(<AlertBanner alerts={alerts} />);
    const alertElements = screen.getAllByRole('alert');
    expect(alertElements.length).toBe(1);
  });
});


describe('UnderperformingIndicator', () => {
  it('renders nothing when not underperforming', () => {
    const { container } = render(
      <UnderperformingIndicator isUnderperforming={false} breachedMetrics={[]} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when isUnderperforming is false even with metrics', () => {
    const { container } = render(
      <UnderperformingIndicator
        isUnderperforming={false}
        breachedMetrics={['stock_below_reorder']}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders red indicator when underperforming', () => {
    const { container } = render(
      <UnderperformingIndicator
        isUnderperforming={true}
        breachedMetrics={['stock_below_reorder', 'beds_at_zero']}
      />
    );
    expect(screen.getByText('Underperforming')).toBeDefined();
    const redDot = container.querySelector('.bg-red-600');
    expect(redDot).not.toBeNull();
  });

  it('displays readable labels for each breached metric', () => {
    render(
      <UnderperformingIndicator
        isUnderperforming={true}
        breachedMetrics={[
          'stock_below_reorder',
          'attendance_below_50_percent',
          'beds_at_zero',
          'footfall_exceeds_capacity',
        ]}
      />
    );
    expect(screen.getByText('• Stock below reorder')).toBeDefined();
    expect(screen.getByText('• Attendance < 50%')).toBeDefined();
    expect(screen.getByText('• Beds at zero')).toBeDefined();
    expect(screen.getByText('• Footfall exceeds capacity')).toBeDefined();
  });

  it('has role="status" for accessibility', () => {
    render(
      <UnderperformingIndicator
        isUnderperforming={true}
        breachedMetrics={['stock_below_reorder', 'beds_at_zero']}
      />
    );
    expect(screen.getByRole('status')).toBeDefined();
  });
});

describe('CentreCard with underperforming props', () => {
  const defaultProps = {
    id: 'centre-1',
    name: 'PHC Riverside',
    stockColour: 'green' as const,
    availableBeds: 10,
    totalBeds: 20,
    presentDoctors: 3,
    assignedDoctors: 5,
    footfallCount: 42,
  };

  it('does not render indicator when isUnderperforming is not passed', () => {
    const { container } = render(<CentreCard {...defaultProps} />);
    expect(container.querySelector('.bg-red-600')).toBeNull();
  });

  it('renders underperforming indicator inside the card when flagged', () => {
    render(
      <CentreCard
        {...defaultProps}
        isUnderperforming={true}
        breachedMetrics={['stock_below_reorder', 'beds_at_zero']}
      />
    );
    expect(screen.getByText('Underperforming')).toBeDefined();
    expect(screen.getByText('• Stock below reorder')).toBeDefined();
    expect(screen.getByText('• Beds at zero')).toBeDefined();
  });
});

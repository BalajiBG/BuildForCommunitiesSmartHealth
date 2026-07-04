import { describe, it, expect } from 'vitest';
import {
  CentreData,
  hasSufficientData,
  hasMinimumCentresForComparison,
  INSUFFICIENT_DATA_MESSAGE,
} from '@/lib/services/resource-optimizer';

/**
 * Unit tests for Resource Optimizer data sufficiency check.
 * Validates: Requirements 8.5
 */

function makeCentre(overrides: Partial<CentreData> = {}): CentreData {
  return {
    centreId: overrides.centreId ?? 'centre-1',
    medicines: overrides.medicines ?? [],
    footfall: overrides.footfall ?? [],
    totalBeds: overrides.totalBeds ?? 0,
  };
}

describe('Resource Optimizer - hasSufficientData', () => {
  it('returns false for a centre with no data', () => {
    const centre = makeCentre();
    expect(hasSufficientData(centre)).toBe(false);
  });

  it('returns true when centre has stock data (non-empty medicines)', () => {
    const centre = makeCentre({
      medicines: [
        {
          medicineId: 'm1',
          name: 'Paracetamol',
          quantity: 100,
          reorderLevel: 50,
          expiryDate: '2025-12-01',
          centreId: 'centre-1',
        },
      ],
    });
    expect(hasSufficientData(centre)).toBe(true);
  });

  it('returns true when centre has footfall data', () => {
    const centre = makeCentre({
      footfall: [{ date: '2025-01-01', centreId: 'centre-1', count: 42 }],
    });
    expect(hasSufficientData(centre)).toBe(true);
  });

  it('returns true when centre has bed occupancy data (totalBeds > 0)', () => {
    const centre = makeCentre({ totalBeds: 10 });
    expect(hasSufficientData(centre)).toBe(true);
  });

  it('returns true when centre has all three data types', () => {
    const centre = makeCentre({
      medicines: [
        {
          medicineId: 'm1',
          name: 'Aspirin',
          quantity: 200,
          reorderLevel: 30,
          expiryDate: '2026-01-01',
          centreId: 'centre-1',
        },
      ],
      footfall: [{ date: '2025-03-01', centreId: 'centre-1', count: 100 }],
      totalBeds: 20,
    });
    expect(hasSufficientData(centre)).toBe(true);
  });
});

describe('Resource Optimizer - hasMinimumCentresForComparison', () => {
  it('returns false for 0 centres (empty array)', () => {
    expect(hasMinimumCentresForComparison([])).toBe(false);
  });

  it('returns false for 1 centre with data', () => {
    const centres = [makeCentre({ centreId: 'c1', totalBeds: 5 })];
    expect(hasMinimumCentresForComparison(centres)).toBe(false);
  });

  it('returns true for 2 centres with data', () => {
    const centres = [
      makeCentre({ centreId: 'c1', totalBeds: 5 }),
      makeCentre({
        centreId: 'c2',
        footfall: [{ date: '2025-01-01', centreId: 'c2', count: 20 }],
      }),
    ];
    expect(hasMinimumCentresForComparison(centres)).toBe(true);
  });

  it('returns false when multiple centres exist but only 1 has data', () => {
    const centres = [
      makeCentre({ centreId: 'c1', totalBeds: 10 }),
      makeCentre({ centreId: 'c2' }), // no data
      makeCentre({ centreId: 'c3' }), // no data
    ];
    expect(hasMinimumCentresForComparison(centres)).toBe(false);
  });

  it('returns true when 3 centres all have data', () => {
    const centres = [
      makeCentre({ centreId: 'c1', totalBeds: 5 }),
      makeCentre({
        centreId: 'c2',
        medicines: [
          {
            medicineId: 'm1',
            name: 'Med',
            quantity: 50,
            reorderLevel: 10,
            expiryDate: '2025-06-01',
            centreId: 'c2',
          },
        ],
      }),
      makeCentre({
        centreId: 'c3',
        footfall: [{ date: '2025-02-01', centreId: 'c3', count: 15 }],
      }),
    ];
    expect(hasMinimumCentresForComparison(centres)).toBe(true);
  });

  it('returns true when exactly 2 of many centres have data', () => {
    const centres = [
      makeCentre({ centreId: 'c1' }), // no data
      makeCentre({ centreId: 'c2', totalBeds: 3 }),
      makeCentre({ centreId: 'c3' }), // no data
      makeCentre({ centreId: 'c4', totalBeds: 7 }),
      makeCentre({ centreId: 'c5' }), // no data
    ];
    expect(hasMinimumCentresForComparison(centres)).toBe(true);
  });

  it('returns false when all centres have no data', () => {
    const centres = [
      makeCentre({ centreId: 'c1' }),
      makeCentre({ centreId: 'c2' }),
      makeCentre({ centreId: 'c3' }),
    ];
    expect(hasMinimumCentresForComparison(centres)).toBe(false);
  });
});

describe('Resource Optimizer - INSUFFICIENT_DATA_MESSAGE', () => {
  it('exports a meaningful insufficient data message', () => {
    expect(INSUFFICIENT_DATA_MESSAGE).toContain('at least 2 centres');
    expect(INSUFFICIENT_DATA_MESSAGE).toContain('redistribution');
  });
});

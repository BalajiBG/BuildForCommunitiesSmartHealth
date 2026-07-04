/**
 * Unit tests for the Gemini response validator.
 *
 * Validates: Requirements 8.2, 8.3
 * Property 16: Gemini response structure validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateRedistributionResponse,
  validatePredictionResponse,
} from '@/lib/services/gemini-validator';
import { RedistributionRecommendation, StockPrediction } from '@/lib/types/index';

// --- Helpers ---

function makeRecommendation(
  overrides: Partial<RedistributionRecommendation> = {}
): RedistributionRecommendation {
  return {
    sourceCentreId: 'centre-1',
    sourceCentreName: 'PHC Alpha',
    destinationCentreId: 'centre-2',
    destinationCentreName: 'CHC Beta',
    resourceType: 'medicine',
    resourceName: 'Paracetamol',
    quantity: 100,
    explanation: 'Transfer due to surplus at source and shortage at destination.',
    ...overrides,
  };
}

function makePrediction(
  overrides: Partial<StockPrediction> = {}
): StockPrediction {
  return {
    centreId: 'centre-1',
    centreName: 'PHC Alpha',
    medicineId: 'med-1',
    medicineName: 'Paracetamol',
    currentQuantity: 50,
    predictedStockOutDate: '2025-02-15',
    ...overrides,
  };
}

// --- validateRedistributionResponse ---

describe('validateRedistributionResponse', () => {
  it('accepts a valid array with 1 recommendation', () => {
    const result = validateRedistributionResponse([makeRecommendation()]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a valid array with 10 recommendations', () => {
    const recs = Array.from({ length: 10 }, () => makeRecommendation());
    const result = validateRedistributionResponse(recs);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an empty array (0 recommendations)', () => {
    const result = validateRedistributionResponse([]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('at least 1');
  });

  it('rejects an array with 11 recommendations', () => {
    const recs = Array.from({ length: 11 }, () => makeRecommendation());
    const result = validateRedistributionResponse(recs);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at most 10'))).toBe(true);
  });

  it('accepts recommendations with explanation exactly 500 characters', () => {
    const explanation = 'a'.repeat(500);
    const result = validateRedistributionResponse([
      makeRecommendation({ explanation }),
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a recommendation with explanation exceeding 500 characters', () => {
    const explanation = 'a'.repeat(501);
    const result = validateRedistributionResponse([
      makeRecommendation({ explanation }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('exceeding 500 characters');
  });

  it('reports errors for multiple invalid recommendations', () => {
    const recs = [
      makeRecommendation({ explanation: 'x'.repeat(600) }),
      makeRecommendation({ explanation: 'y'.repeat(700) }),
      makeRecommendation(), // valid
    ];
    const result = validateRedistributionResponse(recs);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('accepts recommendations with empty explanation (within limit)', () => {
    const result = validateRedistributionResponse([
      makeRecommendation({ explanation: '' }),
    ]);
    expect(result.valid).toBe(true);
  });

  it('accepts various valid array sizes (2-9)', () => {
    for (let size = 2; size <= 9; size++) {
      const recs = Array.from({ length: size }, () => makeRecommendation());
      const result = validateRedistributionResponse(recs);
      expect(result.valid).toBe(true);
    }
  });
});

// --- validatePredictionResponse ---

describe('validatePredictionResponse', () => {
  it('accepts a valid prediction with all required fields', () => {
    const result = validatePredictionResponse([makePrediction()]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts multiple valid predictions', () => {
    const preds = [
      makePrediction({ centreId: 'c1', predictedStockOutDate: '2025-03-01' }),
      makePrediction({ centreId: 'c2', predictedStockOutDate: '2025-04-15' }),
    ];
    const result = validatePredictionResponse(preds);
    expect(result.valid).toBe(true);
  });

  it('accepts an empty predictions array (no items to validate)', () => {
    const result = validatePredictionResponse([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a prediction missing centreId', () => {
    const result = validatePredictionResponse([
      makePrediction({ centreId: '' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('centreId');
  });

  it('rejects a prediction missing centreName', () => {
    const result = validatePredictionResponse([
      makePrediction({ centreName: '' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('centreName');
  });

  it('rejects a prediction missing medicineId', () => {
    const result = validatePredictionResponse([
      makePrediction({ medicineId: '' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('medicineId');
  });

  it('rejects a prediction missing medicineName', () => {
    const result = validatePredictionResponse([
      makePrediction({ medicineName: '' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('medicineName');
  });

  it('rejects a prediction missing predictedStockOutDate', () => {
    const result = validatePredictionResponse([
      makePrediction({ predictedStockOutDate: '' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('predictedStockOutDate');
  });

  it('rejects an invalid date format (DD-MM-YYYY)', () => {
    const result = validatePredictionResponse([
      makePrediction({ predictedStockOutDate: '15-02-2025' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('invalid date format');
  });

  it('rejects an invalid date format (plain text)', () => {
    const result = validatePredictionResponse([
      makePrediction({ predictedStockOutDate: 'not-a-date' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('invalid date format');
  });

  it('accepts a valid date at year boundary', () => {
    const result = validatePredictionResponse([
      makePrediction({ predictedStockOutDate: '2025-12-31' }),
    ]);
    expect(result.valid).toBe(true);
  });

  it('accumulates errors from multiple invalid predictions', () => {
    const preds = [
      makePrediction({ centreId: '', medicineId: '' }),
      makePrediction({ predictedStockOutDate: 'bad' }),
    ];
    const result = validatePredictionResponse(preds);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

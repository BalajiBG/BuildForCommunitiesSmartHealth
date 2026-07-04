/**
 * GeminiValidator — validates AI response structures from the Gemini API.
 *
 * Ensures redistribution recommendations meet array length and explanation constraints,
 * and prediction responses contain all required fields with valid formats.
 *
 * Validates: Requirements 8.2, 8.3
 */

import { RedistributionRecommendation, StockPrediction } from '@/lib/types/index';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a redistribution recommendations response from Gemini.
 *
 * Acceptance criteria (Property 16):
 * - Array must contain between 1 and 10 recommendations (inclusive)
 * - Each recommendation's explanation field must be at most 500 characters
 *
 * @param recommendations - Array of redistribution recommendations to validate
 * @returns Validation result with any error descriptions
 */
export function validateRedistributionResponse(
  recommendations: RedistributionRecommendation[]
): ValidationResult {
  const errors: string[] = [];

  // Check array length is between 1 and 10
  if (recommendations.length < 1) {
    errors.push('Recommendations array must contain at least 1 recommendation');
  }

  if (recommendations.length > 10) {
    errors.push(
      `Recommendations array must contain at most 10 recommendations, got ${recommendations.length}`
    );
  }

  // Check each explanation is at most 500 characters
  recommendations.forEach((rec, index) => {
    if (rec.explanation && rec.explanation.length > 500) {
      errors.push(
        `Recommendation at index ${index} has explanation exceeding 500 characters (${rec.explanation.length} chars)`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a stock prediction response from Gemini.
 *
 * Required fields for each prediction:
 * - centreId, centreName, medicineId, medicineName, currentQuantity, predictedStockOutDate
 * - predictedStockOutDate must be a valid ISO 8601 date format (YYYY-MM-DD)
 *
 * @param predictions - Array of stock predictions to validate
 * @returns Validation result with any error descriptions
 */
export function validatePredictionResponse(
  predictions: StockPrediction[]
): ValidationResult {
  const errors: string[] = [];

  const requiredFields: (keyof StockPrediction)[] = [
    'centreId',
    'centreName',
    'medicineId',
    'medicineName',
    'currentQuantity',
    'predictedStockOutDate',
  ];

  predictions.forEach((prediction, index) => {
    // Check required fields are present and non-empty
    for (const field of requiredFields) {
      const value = prediction[field];
      if (value === undefined || value === null || value === '') {
        errors.push(
          `Prediction at index ${index} is missing required field: ${field}`
        );
      }
    }

    // Validate predictedStockOutDate format (YYYY-MM-DD)
    if (prediction.predictedStockOutDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(prediction.predictedStockOutDate)) {
        errors.push(
          `Prediction at index ${index} has invalid date format for predictedStockOutDate: "${prediction.predictedStockOutDate}" (expected YYYY-MM-DD)`
        );
      } else {
        // Also check it's a valid calendar date
        const date = new Date(prediction.predictedStockOutDate);
        if (isNaN(date.getTime())) {
          errors.push(
            `Prediction at index ${index} has invalid date value for predictedStockOutDate: "${prediction.predictedStockOutDate}"`
          );
        }
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

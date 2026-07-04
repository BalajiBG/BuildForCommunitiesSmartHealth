/**
 * Unit tests for GeminiService — covers prompt construction, response parsing,
 * timeout enforcement, and edge cases.
 *
 * Uses vi.mock to stub the @google/generative-ai SDK.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the @google/generative-ai module
const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

import {
  generateStockPredictions,
  generateRedistributionRecommendations,
  MedicineStockInput,
  CentreDataInput,
} from '@/lib/services/gemini';

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateStockPredictions', () => {
    const sampleStockData: MedicineStockInput[] = [
      {
        medicineId: 'med-1',
        medicineName: 'Paracetamol',
        centreId: 'centre-1',
        centreName: 'PHC Anand',
        currentQuantity: 20,
        reorderLevel: 100,
        consumptionHistory: [
          { date: '2024-01-01', consumed: 5 },
          { date: '2024-01-02', consumed: 7 },
        ],
      },
    ];

    it('should return parsed predictions from valid Gemini response', async () => {
      const mockResponse = {
        response: {
          text: () =>
            JSON.stringify({
              predictions: [
                {
                  centreId: 'centre-1',
                  centreName: 'PHC Anand',
                  medicineId: 'med-1',
                  medicineName: 'Paracetamol',
                  currentQuantity: 20,
                  predictedStockOutDate: '2024-02-15',
                  confidence: 'high',
                },
              ],
              insufficientData: [],
            }),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const resultPromise = generateStockPredictions(sampleStockData, 'en');
      vi.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        centreId: 'centre-1',
        centreName: 'PHC Anand',
        medicineId: 'med-1',
        medicineName: 'Paracetamol',
        currentQuantity: 20,
        predictedStockOutDate: '2024-02-15',
      });
    });

    it('should return empty array when stockData is empty', async () => {
      const result = await generateStockPredictions([], 'en');
      expect(result).toEqual([]);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should return empty array when Gemini returns malformed JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'This is not JSON at all' },
      });

      const resultPromise = generateStockPredictions(sampleStockData, 'en');
      vi.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result).toEqual([]);
    });

    it('should handle response wrapped in markdown code fences', async () => {
      const jsonPayload = JSON.stringify({
        predictions: [
          {
            centreId: 'c1',
            centreName: 'Test Centre',
            medicineId: 'm1',
            medicineName: 'Aspirin',
            currentQuantity: 5,
            predictedStockOutDate: '2024-03-01',
            confidence: 'medium',
          },
        ],
        insufficientData: [],
      });

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '```json\n' + jsonPayload + '\n```' },
      });

      const resultPromise = generateStockPredictions(sampleStockData, 'hi');
      vi.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].medicineName).toBe('Aspirin');
    });

    it('should throw timeout error after 30 seconds', async () => {
      mockGenerateContent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 60_000))
      );

      const resultPromise = generateStockPredictions(sampleStockData, 'en');
      vi.advanceTimersByTime(30_000);

      await expect(resultPromise).rejects.toThrow(
        'Gemini API request timed out after 30000ms'
      );
    });

    it('should return empty array when predictions field is missing', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({ something: 'else' }) },
      });

      const resultPromise = generateStockPredictions(sampleStockData, 'en');
      vi.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result).toEqual([]);
    });
  });

  describe('generateRedistributionRecommendations', () => {
    const sampleCentreData: CentreDataInput[] = [
      {
        centreId: 'centre-1',
        centreName: 'PHC Alpha',
        medicines: [{ medicineId: 'm1', name: 'Aspirin', quantity: 500, reorderLevel: 100 }],
        footfall: [{ date: '2024-01-15', count: 80 }],
        totalBeds: 20,
        availableBeds: 5,
        assignedDoctors: 4,
        presentDoctors: 3,
      },
      {
        centreId: 'centre-2',
        centreName: 'CHC Beta',
        medicines: [{ medicineId: 'm1', name: 'Aspirin', quantity: 10, reorderLevel: 100 }],
        footfall: [{ date: '2024-01-15', count: 120 }],
        totalBeds: 30,
        availableBeds: 0,
        assignedDoctors: 6,
        presentDoctors: 2,
      },
    ];

    it('should return parsed recommendations from valid response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              recommendations: [
                {
                  sourceCentreId: 'centre-1',
                  sourceCentreName: 'PHC Alpha',
                  destinationCentreId: 'centre-2',
                  destinationCentreName: 'CHC Beta',
                  resourceType: 'medicine',
                  resourceName: 'Aspirin',
                  quantity: 200,
                  explanation: 'CHC Beta is critically low on Aspirin while PHC Alpha has surplus.',
                },
              ],
            }),
        },
      });

      const resultPromise = generateRedistributionRecommendations(sampleCentreData, 'en');
      vi.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sourceCentreId: 'centre-1',
        sourceCentreName: 'PHC Alpha',
        destinationCentreId: 'centre-2',
        destinationCentreName: 'CHC Beta',
        resourceType: 'medicine',
        resourceName: 'Aspirin',
        quantity: 200,
        explanation: 'CHC Beta is critically low on Aspirin while PHC Alpha has surplus.',
      });
    });

    it('should return empty array when centreData is empty', async () => {
      const result = await generateRedistributionRecommendations([], 'en');
      expect(result).toEqual([]);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should truncate explanation to 500 characters', async () => {
      const longExplanation = 'A'.repeat(600);

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              recommendations: [
                {
                  sourceCentreId: 'c1',
                  sourceCentreName: 'Centre 1',
                  destinationCentreId: 'c2',
                  destinationCentreName: 'Centre 2',
                  resourceType: 'staff',
                  quantity: 1,
                  explanation: longExplanation,
                },
              ],
            }),
        },
      });

      const resultPromise = generateRedistributionRecommendations(sampleCentreData, 'hi');
      vi.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result[0].explanation).toHaveLength(500);
    });

    it('should default invalid resourceType to medicine', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              recommendations: [
                {
                  sourceCentreId: 'c1',
                  sourceCentreName: 'Centre 1',
                  destinationCentreId: 'c2',
                  destinationCentreName: 'Centre 2',
                  resourceType: 'invalid_type',
                  quantity: 5,
                  explanation: 'Some reason',
                },
              ],
            }),
        },
      });

      const resultPromise = generateRedistributionRecommendations(sampleCentreData, 'en');
      vi.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result[0].resourceType).toBe('medicine');
    });

    it('should throw timeout error after 30 seconds', async () => {
      mockGenerateContent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 60_000))
      );

      const resultPromise = generateRedistributionRecommendations(sampleCentreData, 'en');
      vi.advanceTimersByTime(30_000);

      await expect(resultPromise).rejects.toThrow(
        'Gemini API request timed out after 30000ms'
      );
    });

    it('should return empty array when response has no recommendations array', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({ data: [] }) },
      });

      const resultPromise = generateRedistributionRecommendations(sampleCentreData, 'en');
      vi.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result).toEqual([]);
    });
  });
});

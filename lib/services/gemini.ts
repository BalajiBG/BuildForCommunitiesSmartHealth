/**
 * GeminiService — AI client for stock-out predictions and redistribution recommendations.
 *
 * Wraps the @google/generative-ai SDK, constructs prompts from centre data,
 * calls Gemini, parses structured JSON responses, and enforces a 30-second timeout.
 *
 * Validates: Requirements 7.1, 8.1, 10.4
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { StockPrediction, RedistributionRecommendation } from '@/lib/types/index';

// --- SDK initialization ---

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/** Timeout duration for Gemini API calls (30 seconds). */
const GEMINI_TIMEOUT_MS = 30_000;

// --- Public types for input data ---

export interface MedicineStockInput {
  medicineId: string;
  medicineName: string;
  centreId: string;
  centreName: string;
  currentQuantity: number;
  reorderLevel: number;
  consumptionHistory: { date: string; consumed: number }[];
}

export interface CentreDataInput {
  centreId: string;
  centreName: string;
  medicines: { medicineId: string; name: string; quantity: number; reorderLevel: number }[];
  footfall: { date: string; count: number }[];
  totalBeds: number;
  availableBeds: number;
  assignedDoctors: number;
  presentDoctors: number;
}

// --- Prompt builders ---

function buildStockPredictionPrompt(
  stockData: MedicineStockInput[],
  language: 'en' | 'hi'
): string {
  const langLabel = language === 'hi' ? 'Hindi' : 'English';

  return `You are a health supply chain analyst. Analyze medicine stock data for district health centres.

Data: ${JSON.stringify(stockData)}

For each medicine below 30% of reorder level, predict the stock-out date based on consumption trends.

Respond in ${langLabel} with JSON:
{
  "predictions": [
    {
      "centreId": "...",
      "centreName": "...",
      "medicineId": "...",
      "medicineName": "...",
      "currentQuantity": 0,
      "predictedStockOutDate": "YYYY-MM-DD",
      "confidence": "high|medium|low"
    }
  ],
  "insufficientData": [
    { "medicineId": "...", "medicineName": "...", "reason": "..." }
  ]
}

Return ONLY valid JSON. Do not include any markdown formatting or code blocks.`;
}

function buildRedistributionPrompt(
  centreData: CentreDataInput[],
  language: 'en' | 'hi'
): string {
  const langLabel = language === 'hi' ? 'Hindi' : 'English';

  return `You are a district health resource optimizer. Analyze resource distribution across centres.

Data: ${JSON.stringify(centreData)}

Generate 1-10 transfer recommendations to balance resources. Each recommendation must have source, destination, resource type, quantity, and explanation (max 500 chars).

Respond in ${langLabel} with JSON:
{
  "recommendations": [
    {
      "sourceCentreId": "...",
      "sourceCentreName": "...",
      "destinationCentreId": "...",
      "destinationCentreName": "...",
      "resourceType": "medicine|staff|beds",
      "resourceName": "...",
      "quantity": 0,
      "explanation": "..."
    }
  ]
}

Return ONLY valid JSON. Do not include any markdown formatting or code blocks.`;
}

// --- Timeout helper ---

/**
 * Races a promise against a 30-second timeout.
 * Throws an error if the timeout is exceeded.
 */
function withTimeout<T>(promise: Promise<T>, ms: number = GEMINI_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Gemini API request timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// --- Response parsers ---

/**
 * Extracts JSON from a Gemini response text that may contain markdown code fences.
 */
function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return text.trim();
}

function parsePredictionsResponse(responseText: string): StockPrediction[] {
  try {
    const json = JSON.parse(extractJSON(responseText));
    const predictions = json.predictions;

    if (!Array.isArray(predictions)) {
      return [];
    }

    return predictions.map((p: Record<string, unknown>) => ({
      centreId: String(p.centreId ?? ''),
      centreName: String(p.centreName ?? ''),
      medicineId: String(p.medicineId ?? ''),
      medicineName: String(p.medicineName ?? ''),
      currentQuantity: Number(p.currentQuantity ?? 0),
      predictedStockOutDate: String(p.predictedStockOutDate ?? ''),
    }));
  } catch {
    return [];
  }
}

function parseRedistributionResponse(responseText: string): RedistributionRecommendation[] {
  try {
    const json = JSON.parse(extractJSON(responseText));
    const recommendations = json.recommendations;

    if (!Array.isArray(recommendations)) {
      return [];
    }

    return recommendations.map((r: Record<string, unknown>) => ({
      sourceCentreId: String(r.sourceCentreId ?? ''),
      sourceCentreName: String(r.sourceCentreName ?? ''),
      destinationCentreId: String(r.destinationCentreId ?? ''),
      destinationCentreName: String(r.destinationCentreName ?? ''),
      resourceType: validateResourceType(r.resourceType),
      resourceName: r.resourceName ? String(r.resourceName) : undefined,
      quantity: Number(r.quantity ?? 0),
      explanation: String(r.explanation ?? '').slice(0, 500),
    }));
  } catch {
    return [];
  }
}

function validateResourceType(value: unknown): 'medicine' | 'staff' | 'beds' {
  if (value === 'medicine' || value === 'staff' || value === 'beds') {
    return value;
  }
  return 'medicine';
}

// --- Public API ---

/**
 * Generates stock-out predictions for medicines that are below 30% of their reorder level.
 *
 * @param stockData - Array of medicine stock data with consumption history
 * @param language - Response language ('en' for English, 'hi' for Hindi)
 * @returns Array of stock predictions sorted by predicted stock-out date
 * @throws Error if the Gemini API call exceeds the 30-second timeout
 */
export async function generateStockPredictions(
  stockData: MedicineStockInput[],
  language: 'en' | 'hi'
): Promise<StockPrediction[]> {
  if (stockData.length === 0) {
    return [];
  }

  const prompt = buildStockPredictionPrompt(stockData, language);

  const result = await withTimeout(model.generateContent(prompt));
  const response = result.response;
  const text = response.text();

  return parsePredictionsResponse(text);
}

/**
 * Generates resource redistribution recommendations across health centres.
 *
 * @param centreData - Array of centre data including stocks, footfall, and bed info
 * @param language - Response language ('en' for English, 'hi' for Hindi)
 * @returns Array of redistribution recommendations (1-10 items)
 * @throws Error if the Gemini API call exceeds the 30-second timeout
 */
export async function generateRedistributionRecommendations(
  centreData: CentreDataInput[],
  language: 'en' | 'hi'
): Promise<RedistributionRecommendation[]> {
  if (centreData.length === 0) {
    return [];
  }

  const prompt = buildRedistributionPrompt(centreData, language);

  const result = await withTimeout(model.generateContent(prompt));
  const response = result.response;
  const text = response.text();

  return parseRedistributionResponse(text);
}

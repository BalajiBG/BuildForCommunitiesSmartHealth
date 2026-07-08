/**
 * POST /api/ai/predictions
 *
 * Fetches stock data from Firebase RTDB for all centres in a district,
 * filters medicines for prediction, calls GeminiService, and returns
 * sorted predictions (nearest stock-out date first — Property 14).
 *
 * On Gemini error: returns 503 with AI_UNAVAILABLE code.
 * Includes languageFallback: true when response is in English but user requested Hindi.
 *
 * Validates: Requirements 7.1, 7.3, 8.1, 8.4, 10.4, 10.5
 */

import { NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/firebase/admin';
import { dbPaths } from '@/lib/firebase/types';
import { filterMedicinesForPrediction, hasInsufficientData } from '@/lib/services/stock-analysis';
import { generateStockPredictions, MedicineStockInput } from '@/lib/services/gemini';
import { generateMockPredictions } from '@/lib/services/mock-ai';
import { MedicineStock, StockPrediction } from '@/lib/types';
import { detectLanguageFallback } from '@/lib/services/language-fallback';

interface PredictionRequestBody {
  districtId: string;
  language: 'en' | 'hi';
}

export async function POST(request: Request) {
  try {
    const body: PredictionRequestBody = await request.json();
    const { districtId, language } = body;

    if (!districtId || !language) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'districtId and language are required.' } },
        { status: 400 }
      );
    }

    // Fetch all centre IDs in the district
    const centresSnapshot = await adminDatabase
      .ref(dbPaths.districtCentres(districtId))
      .once('value');
    const centresMap = centresSnapshot.val();

    if (!centresMap) {
      return NextResponse.json({ predictions: [] });
    }

    const centreIds = Object.keys(centresMap);

    // Fetch all centre data in parallel
    const stockInputs: MedicineStockInput[] = [];

    await Promise.all(centreIds.map(async (centreId) => {
      // Fetch centre info and medicines in parallel
      const [centreSnapshot, medicinesSnapshot] = await Promise.all([
        adminDatabase.ref(dbPaths.centre(centreId)).once('value'),
        adminDatabase.ref(dbPaths.centreMedicines(centreId)).once('value'),
      ]);

      const centreData = centreSnapshot.val();
      if (!centreData) return;
      const centreName = centreData.name || centreId;

      const medicinesMap = medicinesSnapshot.val();
      if (!medicinesMap) return;

      const medicines: MedicineStock[] = Object.entries(medicinesMap).map(
        ([medicineId, data]: [string, unknown]) => {
          const med = data as Record<string, unknown>;
          return {
            medicineId,
            name: String(med.name ?? ''),
            quantity: Number(med.quantity ?? 0),
            reorderLevel: Number(med.reorderLevel ?? 0),
            expiryDate: String(med.expiryDate ?? ''),
            centreId,
          };
        }
      );

      const candidates = filterMedicinesForPrediction(medicines);

      // Fetch all consumption data for all candidates in parallel
      await Promise.all(candidates.map(async (medicine) => {
        // Fetch entire consumption path for this medicine at once instead of 30 individual calls
        const consumptionSnap = await adminDatabase
          .ref(`consumption/${centreId}/${medicine.medicineId}`)
          .limitToLast(30)
          .once('value');

        const consumptionMap = consumptionSnap.val() as Record<string, number> | null;
        const consumptionHistory: { date: string; consumed: number }[] = consumptionMap
          ? Object.entries(consumptionMap).map(([date, consumed]) => ({ date, consumed: Number(consumed) }))
          : [];

        if (hasInsufficientData(consumptionHistory.length)) return;

        stockInputs.push({
          medicineId: medicine.medicineId,
          medicineName: medicine.name,
          centreId,
          centreName,
          currentQuantity: medicine.quantity,
          reorderLevel: medicine.reorderLevel,
          consumptionHistory,
        });
      }));
    }));

    if (stockInputs.length === 0) {
      return NextResponse.json({ predictions: [], languageFallback: false });
    }

    // Try Gemini first, fall back to local prediction engine
    let predictions: StockPrediction[];
    let usedFallback = false;

    try {
      predictions = await generateStockPredictions(stockInputs, language);
    } catch {
      // Gemini unavailable — use local prediction engine (linear projection)
      console.log('Gemini unavailable, using local prediction engine');
      predictions = generateMockPredictions(
        stockInputs.map(s => ({
          medicineId: s.medicineId,
          medicineName: s.medicineName,
          centreId: s.centreId,
          centreName: s.centreName,
          currentQuantity: s.currentQuantity,
          reorderLevel: s.reorderLevel,
          dailyConsumption: s.consumptionHistory.length > 0
            ? Math.round(s.consumptionHistory.reduce((sum, d) => sum + d.consumed, 0) / s.consumptionHistory.length)
            : undefined,
        }))
      );
      usedFallback = true;
    }

    // Sort by predictedStockOutDate ascending (nearest date first — Property 14)
    const sortedPredictions = predictions.sort((a, b) =>
      a.predictedStockOutDate.localeCompare(b.predictedStockOutDate)
    );

    // Detect if AI fell back to English when user requested Hindi (Requirement 10.5)
    const languageFallback = !usedFallback && language !== 'en' && sortedPredictions.length > 0
      ? detectLanguageFallback(sortedPredictions.map(p => p.centreName + ' ' + p.medicineName).join(' '))
      : false;

    return NextResponse.json({ predictions: sortedPredictions, languageFallback, aiSource: usedFallback ? 'local' : 'gemini' });
  } catch (error) {
    // Complete failure — return 503
    console.error('AI Predictions error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'AI_UNAVAILABLE',
          message:
            'AI prediction service is currently unavailable. Previous results are retained. Please try again later.',
        },
      },
      { status: 503 }
    );
  }
}

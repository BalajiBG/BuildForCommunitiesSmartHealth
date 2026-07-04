/**
 * POST /api/ai/redistribution
 *
 * Fetches multi-centre data from Firebase RTDB, checks data sufficiency,
 * calls GeminiService for redistribution recommendations.
 *
 * On insufficient data: returns 400 with INSUFFICIENT_DATA message.
 * On Gemini error: returns 503 with AI_UNAVAILABLE code and retry prompt.
 * Includes languageFallback: true when response is in English but user requested Hindi.
 *
 * Validates: Requirements 7.5, 8.1, 8.4, 8.5, 10.4, 10.5
 */

import { NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/firebase/admin';
import { dbPaths } from '@/lib/firebase/types';
import {
  hasMinimumCentresForComparison,
  INSUFFICIENT_DATA_MESSAGE,
  CentreData,
} from '@/lib/services/resource-optimizer';
import {
  generateRedistributionRecommendations,
  CentreDataInput,
} from '@/lib/services/gemini';
import { generateMockRecommendations } from '@/lib/services/mock-ai';
import { MedicineStock, PatientFootfall, RedistributionRecommendation } from '@/lib/types';
import { detectLanguageFallback } from '@/lib/services/language-fallback';

interface RedistributionRequestBody {
  districtId: string;
  language: 'en' | 'hi';
}

export async function POST(request: Request) {
  try {
    const body: RedistributionRequestBody = await request.json();
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
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_DATA', message: INSUFFICIENT_DATA_MESSAGE } },
        { status: 400 }
      );
    }

    const centreIds = Object.keys(centresMap);

    // Gather data for all centres
    const centreDataForSufficiency: CentreData[] = [];
    const centreDataForGemini: CentreDataInput[] = [];

    for (const centreId of centreIds) {
      // Fetch centre info
      const centreSnapshot = await adminDatabase
        .ref(dbPaths.centre(centreId))
        .once('value');
      const centreInfo = centreSnapshot.val();
      if (!centreInfo) continue;

      const centreName = centreInfo.name || centreId;
      const totalBeds = Number(centreInfo.totalBeds ?? 0);
      const availableBeds = Number(centreInfo.availableBeds ?? 0);
      const assignedDoctors = Number(centreInfo.assignedDoctors ?? 0);

      // Fetch medicines
      const medicinesSnapshot = await adminDatabase
        .ref(dbPaths.centreMedicines(centreId))
        .once('value');
      const medicinesMap = medicinesSnapshot.val() || {};

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

      // Fetch footfall (last 7 days)
      const footfallSnapshot = await adminDatabase
        .ref(dbPaths.centreFootfall(centreId))
        .limitToLast(7)
        .once('value');
      const footfallMap = footfallSnapshot.val() || {};

      const footfall: PatientFootfall[] = Object.entries(footfallMap).map(
        ([date, data]: [string, unknown]) => {
          const entry = data as Record<string, unknown>;
          return {
            date,
            centreId,
            count: Number(entry.count ?? entry ?? 0),
          };
        }
      );

      // Fetch current attendance (today)
      const today = new Date().toISOString().split('T')[0];
      const attendanceSnapshot = await adminDatabase
        .ref(dbPaths.attendance(centreId, today))
        .once('value');
      const attendanceData = attendanceSnapshot.val();
      const presentDoctors = attendanceData
        ? Number((attendanceData as Record<string, unknown>).presentCount ?? 0)
        : 0;

      // Build sufficiency check data
      centreDataForSufficiency.push({
        centreId,
        medicines,
        footfall,
        totalBeds,
      });

      // Build Gemini input data
      centreDataForGemini.push({
        centreId,
        centreName,
        medicines: medicines.map((m) => ({
          medicineId: m.medicineId,
          name: m.name,
          quantity: m.quantity,
          reorderLevel: m.reorderLevel,
        })),
        footfall: footfall.map((f) => ({ date: f.date, count: f.count })),
        totalBeds,
        availableBeds,
        assignedDoctors,
        presentDoctors,
      });
    }

    // Check data sufficiency (Property 17)
    if (!hasMinimumCentresForComparison(centreDataForSufficiency)) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_DATA', message: INSUFFICIENT_DATA_MESSAGE } },
        { status: 400 }
      );
    }

    // Try Gemini first, fall back to local recommendation engine
    let recommendations: RedistributionRecommendation[];
    let usedFallback = false;

    try {
      recommendations = await generateRedistributionRecommendations(
        centreDataForGemini,
        language
      );
    } catch {
      // Gemini unavailable — use local recommendation engine
      console.log('Gemini unavailable, using local recommendation engine');
      recommendations = generateMockRecommendations(
        centreDataForGemini.map(c => ({
          centreId: c.centreId,
          centreName: c.centreName,
          medicines: c.medicines,
          totalBeds: c.totalBeds,
          availableBeds: c.availableBeds,
          assignedDoctors: c.assignedDoctors,
          presentDoctors: c.presentDoctors,
          avgFootfall: c.footfall.length > 0
            ? Math.round(c.footfall.reduce((sum, f) => sum + f.count, 0) / c.footfall.length)
            : 0,
        }))
      );
      usedFallback = true;
    }

    // Detect if AI fell back to English when user requested Hindi (Requirement 10.5)
    const languageFallback = !usedFallback && language !== 'en' && recommendations.length > 0
      ? detectLanguageFallback(recommendations.map(r => r.explanation).join(' '))
      : false;

    return NextResponse.json({ recommendations, languageFallback, aiSource: usedFallback ? 'local' : 'gemini' });
  } catch (error) {
    // Complete failure — return 503
    console.error('AI Redistribution error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'AI_UNAVAILABLE',
          message:
            'AI redistribution service is currently unavailable. Previous results are retained. Please try again later.',
        },
      },
      { status: 503 }
    );
  }
}

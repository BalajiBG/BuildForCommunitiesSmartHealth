/**
 * POST /api/ai/evaluate-centres
 *
 * Evaluates each centre in a district for underperformance flags.
 * Gathers metrics (stock, attendance, beds, footfall) and calls
 * evaluateCentre for each centre.
 *
 * On error: returns 503 with AI_UNAVAILABLE code.
 *
 * Validates: Requirements 9.1, 9.2
 */

import { NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/firebase/admin';
import { dbPaths } from '@/lib/firebase/types';
import { evaluateCentre, CentreInfo, CentreMetrics } from '@/lib/services/evaluation';

interface EvaluateCentresRequestBody {
  districtId: string;
}

interface CentreEvaluationResult {
  centreId: string;
  centreName: string;
  isUnderperforming: boolean;
  breachedMetrics: string[];
}

export async function POST(request: Request) {
  try {
    const body: EvaluateCentresRequestBody = await request.json();
    const { districtId } = body;

    if (!districtId) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'districtId is required.' } },
        { status: 400 }
      );
    }

    // Fetch all centre IDs in the district
    const centresSnapshot = await adminDatabase
      .ref(dbPaths.districtCentres(districtId))
      .once('value');
    const centresMap = centresSnapshot.val();

    if (!centresMap) {
      return NextResponse.json({ evaluations: [] });
    }

    const centreIds = Object.keys(centresMap);
    const results: CentreEvaluationResult[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const centreId of centreIds) {
      // Fetch centre info
      const centreSnapshot = await adminDatabase
        .ref(dbPaths.centre(centreId))
        .once('value');
      const centreData = centreSnapshot.val();
      if (!centreData) continue;

      const centreName = centreData.name || centreId;
      const assignedDoctors = Number(centreData.assignedDoctors ?? 0);
      const maxPatientCapacity = Number(centreData.maxPatientCapacity ?? 0);
      const availableBeds = Number(centreData.availableBeds ?? 0);

      const centreInfo: CentreInfo = {
        assignedDoctors,
        maxPatientCapacity,
      };

      // Check if any medicine is below reorder level
      const medicinesSnapshot = await adminDatabase
        .ref(dbPaths.centreMedicines(centreId))
        .once('value');
      const medicinesMap = medicinesSnapshot.val() || {};

      let hasLowStock = false;
      for (const data of Object.values(medicinesMap)) {
        const med = data as Record<string, unknown>;
        const quantity = Number(med.quantity ?? 0);
        const reorderLevel = Number(med.reorderLevel ?? 0);
        if (quantity < reorderLevel) {
          hasLowStock = true;
          break;
        }
      }

      // Fetch doctor attendance for today
      const attendanceSnapshot = await adminDatabase
        .ref(dbPaths.attendance(centreId, today))
        .once('value');
      const attendanceData = attendanceSnapshot.val();
      const presentDoctors = attendanceData
        ? Number((attendanceData as Record<string, unknown>).presentCount ?? 0)
        : 0;

      // Fetch today's footfall
      const footfallSnapshot = await adminDatabase
        .ref(dbPaths.footfall(centreId, today))
        .once('value');
      const footfallData = footfallSnapshot.val();
      const dailyFootfall = footfallData
        ? Number((footfallData as Record<string, unknown>).count ?? footfallData ?? 0)
        : 0;

      const metrics: CentreMetrics = {
        hasLowStock,
        presentDoctors,
        availableBeds,
        dailyFootfall,
      };

      // Evaluate underperformance (Property 18)
      const evaluation = evaluateCentre(centreInfo, metrics);

      results.push({
        centreId,
        centreName,
        isUnderperforming: evaluation.isUnderperforming,
        breachedMetrics: evaluation.breachedMetrics,
      });
    }

    return NextResponse.json({ evaluations: results });
  } catch (error) {
    console.error('AI Evaluate Centres error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'AI_UNAVAILABLE',
          message:
            'Centre evaluation service is currently unavailable. Please try again later.',
        },
      },
      { status: 503 }
    );
  }
}

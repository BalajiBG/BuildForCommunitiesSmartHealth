/**
 * Mock AI Service — Generates realistic AI predictions and recommendations
 * based on actual data when Gemini API is unavailable.
 *
 * For hackathon demo purposes. Uses simple heuristics (linear consumption projection)
 * that approximate what Gemini would generate — giving judges a real sense of the
 * AI features without requiring API connectivity.
 */

import { StockPrediction, RedistributionRecommendation } from '@/lib/types/index';

interface MockStockInput {
  medicineId: string;
  medicineName: string;
  centreId: string;
  centreName: string;
  currentQuantity: number;
  reorderLevel: number;
  dailyConsumption?: number;
}

interface MockCentreInput {
  centreId: string;
  centreName: string;
  medicines: { medicineId: string; name: string; quantity: number; reorderLevel: number }[];
  totalBeds: number;
  availableBeds: number;
  assignedDoctors: number;
  presentDoctors: number;
  avgFootfall: number;
}

/**
 * Generates stock-out predictions using linear projection.
 * Projects stock-out date = today + (currentQuantity / estimatedDailyConsumption)
 */
export function generateMockPredictions(inputs: MockStockInput[]): StockPrediction[] {
  const today = new Date();

  return inputs.map((input) => {
    // Estimate daily consumption from reorder level (assume 30-day reorder cycle)
    const estimatedDaily = input.dailyConsumption ?? Math.max(1, Math.round(input.reorderLevel / 30));
    const daysUntilStockOut = Math.max(1, Math.round(input.currentQuantity / estimatedDaily));

    const stockOutDate = new Date(today);
    stockOutDate.setDate(stockOutDate.getDate() + daysUntilStockOut);

    return {
      centreId: input.centreId,
      centreName: input.centreName,
      medicineId: input.medicineId,
      medicineName: input.medicineName,
      currentQuantity: input.currentQuantity,
      predictedStockOutDate: stockOutDate.toISOString().split('T')[0],
    };
  }).sort((a, b) => a.predictedStockOutDate.localeCompare(b.predictedStockOutDate));
}

/**
 * Generates redistribution recommendations based on stock imbalances.
 * Identifies centres with surplus and centres with deficit, then suggests transfers.
 */
export function generateMockRecommendations(centres: MockCentreInput[]): RedistributionRecommendation[] {
  const recommendations: RedistributionRecommendation[] = [];

  if (centres.length < 2) return recommendations;

  // Medicine redistribution — find surplus and deficit centres for each medicine
  const medicineMap = new Map<string, { surplusCentres: MockCentreInput[]; deficitCentres: MockCentreInput[] }>();

  for (const centre of centres) {
    for (const med of centre.medicines) {
      if (!medicineMap.has(med.name)) {
        medicineMap.set(med.name, { surplusCentres: [], deficitCentres: [] });
      }
      const entry = medicineMap.get(med.name)!;
      const ratio = med.quantity / med.reorderLevel;
      if (ratio > 2.0) {
        entry.surplusCentres.push(centre);
      } else if (ratio < 0.5) {
        entry.deficitCentres.push(centre);
      }
    }
  }

  // Generate recommendations for top imbalances
  for (const [medName, { surplusCentres, deficitCentres }] of medicineMap.entries()) {
    if (surplusCentres.length > 0 && deficitCentres.length > 0) {
      const source = surplusCentres[0];
      const dest = deficitCentres[0];
      const sourceMed = source.medicines.find(m => m.name === medName);
      const destMed = dest.medicines.find(m => m.name === medName);

      if (sourceMed && destMed) {
        const transferQty = Math.round((sourceMed.quantity - sourceMed.reorderLevel) * 0.3);
        if (transferQty > 0) {
          recommendations.push({
            sourceCentreId: source.centreId,
            sourceCentreName: source.centreName,
            destinationCentreId: dest.centreId,
            destinationCentreName: dest.centreName,
            resourceType: 'medicine',
            resourceName: medName,
            quantity: transferQty,
            explanation: `${source.centreName} has surplus ${medName} (${sourceMed.quantity} units, ${Math.round(sourceMed.quantity / sourceMed.reorderLevel * 100)}% of reorder level) while ${dest.centreName} is critically low (${destMed.quantity} units, ${Math.round(destMed.quantity / destMed.reorderLevel * 100)}% of reorder level). Transferring ${transferQty} units balances supply.`,
          });
        }
      }
    }

    if (recommendations.length >= 5) break;
  }

  // Staff redistribution — centres with excess staff to understaffed ones
  const overstaffed = centres.filter(c => c.presentDoctors / c.assignedDoctors > 0.8 && c.assignedDoctors > 2);
  const understaffed = centres.filter(c => c.presentDoctors / c.assignedDoctors < 0.5 && c.assignedDoctors > 0);

  if (overstaffed.length > 0 && understaffed.length > 0 && recommendations.length < 8) {
    const source = overstaffed[0];
    const dest = understaffed[0];
    recommendations.push({
      sourceCentreId: source.centreId,
      sourceCentreName: source.centreName,
      destinationCentreId: dest.centreId,
      destinationCentreName: dest.centreName,
      resourceType: 'staff',
      quantity: 1,
      explanation: `${dest.centreName} is critically understaffed (${dest.presentDoctors}/${dest.assignedDoctors} doctors present, ${Math.round(dest.presentDoctors / dest.assignedDoctors * 100)}% attendance) while ${source.centreName} has adequate staffing (${source.presentDoctors}/${source.assignedDoctors}). Temporary staff rotation recommended.`,
    });
  }

  // Truncate explanations to 500 chars
  return recommendations.map(r => ({
    ...r,
    explanation: r.explanation.slice(0, 500),
  }));
}

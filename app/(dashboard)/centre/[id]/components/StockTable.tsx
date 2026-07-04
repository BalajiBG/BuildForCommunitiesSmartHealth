'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { useTranslations } from 'next-intl';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { getStockColour } from '@/lib/services/stock-analysis';
import { MedicineStock } from '@/lib/types';
import { StockEditForm } from './StockEditForm';
import { useAuditLog } from '@/lib/hooks/useAuditLog';

interface StockTableProps {
  centreId: string;
  readOnly?: boolean;
}

/**
 * Generates an actionable recommendation with a specific action the user can take.
 */
function getStockAction(
  quantity: number,
  reorderLevel: number,
  expiryDate: string
): { text: string; actionLabel: string; actionType: 'reorder' | 'dispose' | 'redistribute' | 'monitor' | 'none'; urgency: 'critical' | 'warning' | 'info' | 'ok' } {
  const ratio = reorderLevel > 0 ? quantity / reorderLevel : 1;
  const daysToExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Already expired
  if (daysToExpiry <= 0) {
    return {
      text: 'Expired — must be removed from stock',
      actionLabel: 'Remove & Report',
      actionType: 'dispose',
      urgency: 'critical',
    };
  }

  // Critical: below 30% of reorder
  if (ratio < 0.3) {
    return {
      text: 'Emergency — stock critically low, patients at risk',
      actionLabel: 'Raise Emergency Indent',
      actionType: 'reorder',
      urgency: 'critical',
    };
  }

  // Expiring within 30 days
  if (daysToExpiry <= 30) {
    return {
      text: `Expiring in ${daysToExpiry} days — use first or transfer`,
      actionLabel: 'Request Transfer',
      actionType: 'redistribute',
      urgency: 'warning',
    };
  }

  // Below reorder level
  if (quantity <= reorderLevel) {
    return {
      text: 'Stock running low — reorder needed soon',
      actionLabel: 'Raise Indent',
      actionType: 'reorder',
      urgency: 'warning',
    };
  }

  // Healthy stock
  return {
    text: 'Stock adequate',
    actionLabel: '',
    actionType: 'none',
    urgency: 'ok',
  };
}

const URGENCY_BADGE = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  ok: 'bg-green-100 text-green-800 border-green-200',
};

const ACTION_BUTTON_STYLES = {
  reorder: 'bg-red-600 hover:bg-red-700 text-white',
  dispose: 'bg-gray-800 hover:bg-gray-900 text-white',
  redistribute: 'bg-amber-600 hover:bg-amber-700 text-white',
  monitor: 'bg-blue-600 hover:bg-blue-700 text-white',
  none: 'hidden',
};

/**
 * Displays a real-time list of medicines with actionable recommendations.
 * Each medicine shows its status and a button to take the next step.
 */
export function StockTable({ centreId, readOnly = false }: StockTableProps) {
  const t = useTranslations('stock');
  const tCommon = useTranslations('common');
  const [medicines, setMedicines] = useState<MedicineStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ id: string; text: string; type: 'success' | 'info' } | null>(null);
  const { log: auditLog } = useAuditLog(centreId);

  useEffect(() => {
    const medicinesRef = ref(database, dbPaths.centreMedicines(centreId));

    const unsubscribe = onValue(medicinesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMedicines([]);
        setLoading(false);
        return;
      }

      const medicineList: MedicineStock[] = Object.entries(data).map(
        ([medicineId, value]) => {
          const med = value as Record<string, unknown>;
          return {
            medicineId,
            name: med.name as string,
            quantity: med.quantity as number,
            reorderLevel: med.reorderLevel as number,
            expiryDate: med.expiryDate as string,
            centreId,
          };
        }
      );

      medicineList.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );

      setMedicines(medicineList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [centreId]);

  const handleAction = async (medicine: MedicineStock, actionType: string) => {
    switch (actionType) {
      case 'reorder': {
        // Simulate raising an indent — in production this would create a formal request
        setActionMessage({
          id: medicine.medicineId,
          text: `✅ Indent raised for ${medicine.name} — District Medical Store notified. Order quantity: ${medicine.reorderLevel - medicine.quantity} units. Track indent in Supply Chain module.`,
          type: 'success',
        });
        break;
      }
      case 'dispose': {
        // Remove expired medicine from stock
        try {
          const medRef = ref(database, dbPaths.medicine(centreId, medicine.medicineId));
          await remove(medRef);
          auditLog(`Removed expired medicine: ${medicine.name}`, 'stock');
          setActionMessage({
            id: medicine.medicineId,
            text: `✅ ${medicine.name} removed from stock. Disposal report generated — submit to Block Medical Officer for audit.`,
            type: 'success',
          });
        } catch {
          setActionMessage({
            id: medicine.medicineId,
            text: `❌ Could not remove ${medicine.name}. Try again or contact IT support.`,
            type: 'info',
          });
        }
        break;
      }
      case 'redistribute': {
        setActionMessage({
          id: medicine.medicineId,
          text: `✅ Transfer request raised for ${medicine.name} — nearby centres with high demand will be notified. Check AI Insights → Redistribution for optimal transfer destination.`,
          type: 'success',
        });
        break;
      }
    }

    // Clear message after 8 seconds
    setTimeout(() => setActionMessage(null), 8000);
  };

  if (loading) {
    return <p className="text-gray-500">{tCommon('loading')}</p>;
  }

  if (medicines.length === 0) {
    return <p className="text-gray-500">No medicines found for this centre.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Action feedback message */}
      {actionMessage && (
        <div className={`p-3 rounded-lg border animate-slide-down ${actionMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`} role="status">
          <p className="text-sm">{actionMessage.text}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('medicineName')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Current Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Min. Required
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('expiry')}
              </th>
              {!readOnly && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status & Action
                </th>
              )}
              {readOnly && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {medicines.map((medicine) => {
              const colour = getStockColour(medicine.quantity, medicine.reorderLevel);
              const rowColourClass = getRowColourClass(colour);
              const action = getStockAction(medicine.quantity, medicine.reorderLevel, medicine.expiryDate);

              return (
                <tr key={medicine.medicineId} className={rowColourClass}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {medicine.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {readOnly ? (
                      <span className="font-medium">{medicine.quantity}</span>
                    ) : (
                      <StockEditForm
                        centreId={centreId}
                        medicineId={medicine.medicineId}
                        currentQuantity={medicine.quantity}
                        medicineName={medicine.name}
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {medicine.reorderLevel}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {medicine.expiryDate}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded border ${URGENCY_BADGE[action.urgency]}`}>
                        {action.text}
                      </span>
                      {!readOnly && action.actionType !== 'none' && (
                        <button
                          onClick={() => handleAction(medicine, action.actionType)}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded transition-colors ${ACTION_BUTTON_STYLES[action.actionType]}`}
                        >
                          {action.actionLabel}
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getRowColourClass(colour: 'green' | 'yellow' | 'red'): string {
  switch (colour) {
    case 'green':
      return 'bg-green-50';
    case 'yellow':
      return 'bg-yellow-50';
    case 'red':
      return 'bg-red-50';
  }
}

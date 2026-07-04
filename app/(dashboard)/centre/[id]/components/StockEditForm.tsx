'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { useTranslations } from 'next-intl';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { validateMedicineQuantity } from '@/lib/services/validation';
import { useAuditLog } from '@/lib/hooks/useAuditLog';

interface StockEditFormProps {
  centreId: string;
  medicineId: string;
  currentQuantity: number;
  medicineName?: string;
}

/**
 * Inline quantity editor for a medicine.
 * Validates input using `validateMedicineQuantity`, writes to RTDB on confirm.
 * Implements optimistic UI with rollback on write failure.
 *
 * Validates: Requirements 3.2, 3.3
 */
export function StockEditForm({
  centreId,
  medicineId,
  currentQuantity,
  medicineName,
}: StockEditFormProps) {
  const t = useTranslations('common');
  const { log: auditLog } = useAuditLog(centreId);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(currentQuantity));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display value when real-time data changes (and not currently editing)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(currentQuantity));
    }
  }, [currentQuantity, isEditing]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
    // Focus input on next tick
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setInputValue(String(currentQuantity));
    setError(null);
  }, [currentQuantity]);

  const handleSave = useCallback(async () => {
    const parsed = Number(inputValue);

    if (!validateMedicineQuantity(parsed)) {
      setError('Value must be a whole number between 0 and 999,999');
      return;
    }

    setError(null);
    setSaving(true);

    // Optimistic UI: we keep the new value displayed
    const previousQuantity = currentQuantity;

    try {
      const medicinePath = dbPaths.medicine(centreId, medicineId);
      const medicineRef = ref(database, medicinePath);
      await update(medicineRef, { quantity: parsed });
      auditLog(`Updated ${medicineName ?? 'medicine'} quantity: ${currentQuantity} → ${parsed}`, 'stock');
      setIsEditing(false);
    } catch {
      // Rollback: restore the previously stored value
      setInputValue(String(previousQuantity));
      setError('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [inputValue, centreId, medicineId, currentQuantity]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (!isEditing) {
    return (
      <button
        onClick={handleEdit}
        className="cursor-pointer rounded px-2 py-1 text-left hover:bg-gray-100"
        aria-label={`Edit quantity: ${currentQuantity}`}
      >
        {currentQuantity}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          min="0"
          max="999999"
          step="1"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          aria-label="Medicine quantity"
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('save')}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

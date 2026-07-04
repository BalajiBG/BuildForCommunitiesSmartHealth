'use client';

import React, { useState } from 'react';
import { ref, push } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { useAuditLog } from '@/lib/hooks/useAuditLog';

interface AddMedicineFormProps {
  centreId: string;
}

/**
 * AddMedicineForm — Allows Centre Staff to add a new medicine to inventory.
 * Writes to /medicines/{centreId}/{generated-id} using push().
 */
export default function AddMedicineForm({ centreId }: AddMedicineFormProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { log: auditLog } = useAuditLog(centreId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate fields
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Medicine name is required.');
      return;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      setError('Initial quantity must be a non-negative integer.');
      return;
    }

    const reorder = Number(reorderLevel);
    if (!Number.isInteger(reorder) || reorder < 0) {
      setError('Minimum required must be a non-negative integer.');
      return;
    }

    if (!expiryDate) {
      setError('Expiry date is required.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (expiryDate <= today) {
      setError('Expiry date must be in the future.');
      return;
    }

    setSubmitting(true);
    try {
      const medicinesRef = ref(database, dbPaths.centreMedicines(centreId));
      await push(medicinesRef, {
        name: trimmedName,
        quantity: qty,
        reorderLevel: reorder,
        expiryDate,
      });
      auditLog(`Added new medicine: ${trimmedName} (qty: ${qty})`, 'medicine_added');
      setSuccess(`✅ "${trimmedName}" added to inventory successfully.`);
      // Reset form
      setName('');
      setQuantity('');
      setReorderLevel('');
      setExpiryDate('');
    } catch {
      setError('Failed to add medicine. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3">Add New Medicine</h3>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm" role="status">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="med-name" className="block text-sm font-medium text-gray-700 mb-1">
            Medicine Name
          </label>
          <input
            id="med-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Paracetamol 500mg"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="med-qty" className="block text-sm font-medium text-gray-700 mb-1">
              Initial Quantity
            </label>
            <input
              id="med-qty"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="med-reorder" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Required (Reorder Level)
            </label>
            <input
              id="med-reorder"
              type="number"
              min={0}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="med-expiry" className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Date
          </label>
          <input
            id="med-expiry"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Adding...' : 'Add Medicine'}
        </button>
      </form>
    </div>
  );
}

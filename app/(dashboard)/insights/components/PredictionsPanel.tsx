'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { StockPrediction } from '@/lib/types';
import { AILoadingState } from './AILoadingState';
import { AIErrorState } from './AIErrorState';
import { AILanguageFallbackNotice } from './AILanguageFallbackNotice';

interface InsufficientDataItem {
  medicineId: string;
  medicineName: string;
  reason: string;
}

interface PredictionsResponse {
  predictions: StockPrediction[];
  insufficientData?: InsufficientDataItem[];
  languageFallback?: boolean;
}

interface PredictionsPanelProps {
  districtId: string;
  language: 'en' | 'hi';
}

/**
 * PredictionsPanel — shows a "Generate Predictions" button and displays
 * stock-out predictions ranked by urgency (nearest stock-out date first).
 * Items with insufficient data show an inline message.
 *
 * Validates: Requirements 7.2, 7.3, 7.4, 7.5
 */
export function PredictionsPanel({ districtId, language }: PredictionsPanelProps) {
  const t = useTranslations('ai');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [predictions, setPredictions] = useState<StockPrediction[] | null>(null);
  const [insufficientData, setInsufficientData] = useState<InsufficientDataItem[]>([]);
  const [languageFallback, setLanguageFallback] = useState(false);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(false);
    setPredictions(null);
    setInsufficientData([]);
    setLanguageFallback(false);

    try {
      const response = await fetch('/api/ai/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId, language }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const data: PredictionsResponse = await response.json();

      // Sort by predicted stock-out date (nearest first / most urgent)
      const sorted = [...data.predictions].sort(
        (a, b) => new Date(a.predictedStockOutDate).getTime() - new Date(b.predictedStockOutDate).getTime()
      );

      setPredictions(sorted);
      setInsufficientData(data.insufficientData ?? []);
      setLanguageFallback(data.languageFallback ?? false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('predictionsTitle')}</h2>

      {!loading && !error && predictions === null && (
        <div className="flex justify-center">
          <button
            onClick={fetchPredictions}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Generate Predictions
          </button>
        </div>
      )}

      {loading && <AILoadingState />}

      {error && <AIErrorState onRetry={fetchPredictions} />}

      {predictions !== null && !loading && !error && (
        <div className="space-y-3">
          {languageFallback && <AILanguageFallbackNotice />}

          {predictions.length === 0 && insufficientData.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No predictions to display.</p>
          )}

          {predictions.map((prediction) => (
            <div
              key={`${prediction.centreId}-${prediction.medicineId}`}
              className="border border-gray-100 rounded-md p-4 bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{prediction.centreName}</p>
                  <p className="text-sm text-gray-600">{prediction.medicineName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Qty: {prediction.currentQuantity}</p>
                  <p className="text-sm font-medium text-red-600">
                    Stock-out: {prediction.predictedStockOutDate}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {insufficientData.map((item) => (
            <div
              key={item.medicineId}
              className="border border-yellow-200 rounded-md p-4 bg-yellow-50"
            >
              <p className="font-medium text-gray-900">{item.medicineName}</p>
              <p className="text-sm text-yellow-700 mt-1">{t('insufficientData')}</p>
              {item.reason && (
                <p className="text-xs text-yellow-600 mt-1">{item.reason}</p>
              )}
            </div>
          ))}

          <div className="flex justify-center pt-4">
            <button
              onClick={fetchPredictions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

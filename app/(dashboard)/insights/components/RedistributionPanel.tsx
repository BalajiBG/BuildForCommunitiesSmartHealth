'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RedistributionRecommendation } from '@/lib/types';
import { AILoadingState } from './AILoadingState';
import { AIErrorState } from './AIErrorState';
import { AILanguageFallbackNotice } from './AILanguageFallbackNotice';

interface RedistributionResponse {
  recommendations: RedistributionRecommendation[];
  insufficientData?: string;
  languageFallback?: boolean;
}

interface RedistributionPanelProps {
  districtId: string;
  language: 'en' | 'hi';
}

/**
 * RedistributionPanel — shows a "Generate Recommendations" button and displays
 * 1-10 recommendation cards showing source → destination transfers with explanations.
 *
 * Validates: Requirements 8.2, 8.3, 8.4, 8.5
 */
export function RedistributionPanel({ districtId, language }: RedistributionPanelProps) {
  const t = useTranslations('ai');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [recommendations, setRecommendations] = useState<RedistributionRecommendation[] | null>(null);
  const [insufficientDataMessage, setInsufficientDataMessage] = useState<string | null>(null);
  const [languageFallback, setLanguageFallback] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(false);
    setRecommendations(null);
    setInsufficientDataMessage(null);
    setLanguageFallback(false);

    try {
      const response = await fetch('/api/ai/redistribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId, language }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data: RedistributionResponse = await response.json();

      setRecommendations(data.recommendations);
      setInsufficientDataMessage(data.insufficientData ?? null);
      setLanguageFallback(data.languageFallback ?? false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const resourceTypeLabel = (type: 'medicine' | 'staff' | 'beds') => {
    switch (type) {
      case 'medicine':
        return 'Medicine';
      case 'staff':
        return 'Staff';
      case 'beds':
        return 'Beds';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('redistributionTitle')}</h2>

      {!loading && !error && recommendations === null && (
        <div className="flex justify-center">
          <button
            onClick={fetchRecommendations}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Generate Recommendations
          </button>
        </div>
      )}

      {loading && <AILoadingState />}

      {error && <AIErrorState onRetry={fetchRecommendations} />}

      {recommendations !== null && !loading && !error && (
        <div className="space-y-3">
          {languageFallback && <AILanguageFallbackNotice />}

          {insufficientDataMessage && (
            <div className="border border-yellow-200 rounded-md p-4 bg-yellow-50">
              <p className="text-sm text-yellow-700">{t('insufficientData')}</p>
              <p className="text-xs text-yellow-600 mt-1">{insufficientDataMessage}</p>
            </div>
          )}

          {recommendations.length === 0 && !insufficientDataMessage && (
            <p className="text-gray-500 text-sm text-center py-4">No recommendations to display.</p>
          )}

          {recommendations.map((rec, index) => (
            <div
              key={`${rec.sourceCentreId}-${rec.destinationCentreId}-${index}`}
              className="border border-gray-100 rounded-md p-4 bg-gray-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {resourceTypeLabel(rec.resourceType)}
                </span>
                {rec.resourceName && (
                  <span className="text-sm text-gray-600">{rec.resourceName}</span>
                )}
                <span className="ml-auto text-sm font-medium text-gray-900">
                  Qty: {rec.quantity}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-800">{rec.sourceCentreName}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-gray-800">{rec.destinationCentreName}</span>
              </div>

              <p className="text-sm text-gray-600 mt-2">{rec.explanation}</p>
            </div>
          ))}

          <div className="flex justify-center pt-4">
            <button
              onClick={fetchRecommendations}
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

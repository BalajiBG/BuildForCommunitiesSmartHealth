'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { t as tr } from '@/lib/i18n/translations';
import { StockPrediction, RedistributionRecommendation } from '@/lib/types';

interface PredictionsResponse {
  predictions: StockPrediction[];
  insufficientData?: { medicineId: string; medicineName: string; reason: string }[];
  languageFallback?: boolean;
}

interface RedistributionResponse {
  recommendations: RedistributionRecommendation[];
  insufficientData?: string;
  languageFallback?: boolean;
}

interface EvaluationResult {
  centreId: string;
  centreName: string;
  isUnderperforming: boolean;
  breachedMetrics: string[];
}

interface EvaluationsResponse {
  evaluations: EvaluationResult[];
}

/**
 * Compute days remaining until a stock-out date from today.
 */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Get urgency level based on days remaining.
 */
function getUrgency(days: number): { label: string; labelHi: string; badge: string; color: string; bgColor: string; borderColor: string } {
  if (days < 7) {
    return { label: 'Critical', labelHi: 'गंभीर', badge: '🔴', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
  }
  if (days <= 14) {
    return { label: 'Warning', labelHi: 'चेतावनी', badge: '🟠', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
  }
  return { label: 'Caution', labelHi: 'सावधानी', badge: '🟡', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
}

/**
 * AI Insights Dashboard — auto-loads predictions, redistributions, and evaluations
 * to present a comprehensive analytics view of district health data.
 */
export default function AIInsightsPage() {
  const { profile } = useAuth();
  const t = useTranslations('navigation');

  const districtId = profile?.districtId ?? '';
  const language = profile?.languagePreference ?? 'en';

  // State
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [recommendations, setRecommendations] = useState<RedistributionRecommendation[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [evaluationsLoading, setEvaluationsLoading] = useState(true);
  const [predictionsError, setPredictionsError] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(false);

  // Auto-load predictions
  const fetchPredictions = useCallback(async () => {
    if (!districtId) return;
    setPredictionsLoading(true);
    setPredictionsError(false);
    try {
      const response = await fetch('/api/ai/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId, language }),
      });
      if (!response.ok) throw new Error('Failed');
      const data: PredictionsResponse = await response.json();
      const sorted = [...data.predictions].sort(
        (a, b) => new Date(a.predictedStockOutDate).getTime() - new Date(b.predictedStockOutDate).getTime()
      );
      setPredictions(sorted);
    } catch {
      setPredictionsError(true);
    } finally {
      setPredictionsLoading(false);
    }
  }, [districtId, language]);

  // Auto-load recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!districtId) return;
    setRecommendationsLoading(true);
    setRecommendationsError(false);
    try {
      const response = await fetch('/api/ai/redistribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId, language }),
      });
      if (!response.ok) throw new Error('Failed');
      const data: RedistributionResponse = await response.json();
      setRecommendations(data.recommendations);
    } catch {
      setRecommendationsError(true);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [districtId, language]);

  // Auto-load evaluations
  const fetchEvaluations = useCallback(async () => {
    if (!districtId) return;
    setEvaluationsLoading(true);
    try {
      const response = await fetch('/api/ai/evaluate-centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId }),
      });
      if (!response.ok) throw new Error('Failed');
      const data: EvaluationsResponse = await response.json();
      setEvaluations(data.evaluations);
    } catch {
      // Non-critical — just show 0
    } finally {
      setEvaluationsLoading(false);
    }
  }, [districtId]);

  useEffect(() => {
    fetchPredictions();
    fetchRecommendations();
    fetchEvaluations();
  }, [fetchPredictions, fetchRecommendations, fetchEvaluations]);

  // Computed summary values
  const criticalAlerts = predictions.filter((p) => daysUntil(p.predictedStockOutDate) < 3).length;
  const stockOutRisk = predictions.filter((p) => daysUntil(p.predictedStockOutDate) <= 7).length;
  const pendingRedistributions = recommendations.length;
  const underperformingCentres = evaluations.filter((e) => e.isUnderperforming).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('insights')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'hi'
              ? 'AI-संचालित विश्लेषण और अनुशंसाएं'
              : (profile?.role === 'Centre_Staff'
                ? 'AI-powered analytics and recommendations for your centre'
                : 'AI-powered analytics and recommendations for your district')}
          </p>
        </div>
        <button
          onClick={() => { fetchPredictions(); fetchRecommendations(); fetchEvaluations(); }}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {language === 'hi' ? 'सभी रिफ्रेश करें' : 'Refresh All'}
        </button>
      </div>

      {/* Responsible AI Disclaimer */}
      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p>
          {language === 'hi'
            ? <><strong>AI-जनित अंतर्दृष्टि:</strong> पूर्वानुमान ऐतिहासिक उपभोग पैटर्न पर आधारित हैं। महत्वपूर्ण निर्णयों को ज़मीनी डेटा से सत्यापित करें। सभी कार्रवाइयां ऑडिट-लॉग की जाती हैं।</>
            : <><strong>AI-Generated Insights:</strong> Predictions are based on historical consumption patterns and may not account for unexpected events. Always verify critical decisions with on-ground data. All actions are audit-logged for accountability.</>}
        </p>
      </div>

      {/* Section A: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon="🚨"
          label={tr('critical_alerts', language)}
          value={criticalAlerts}
          subtitle={language === 'hi' ? 'आपातकालीन क्षेत्र में दवाएं' : 'Medicines in emergency zone'}
          loading={predictionsLoading}
          color="red"
        />
        <SummaryCard
          icon="📈"
          label={tr('stock_out_risk', language)}
          value={stockOutRisk}
          subtitle={language === 'hi' ? '≤7 दिनों में खत्म हो रही' : 'Running out in ≤7 days'}
          loading={predictionsLoading}
          color="orange"
        />
        <SummaryCard
          icon="🔄"
          label={tr('pending_redistributions', language)}
          value={pendingRedistributions}
          subtitle={language === 'hi' ? 'अनुशंसित स्थानांतरण' : 'Recommended transfers'}
          loading={recommendationsLoading}
          color="blue"
        />
        <SummaryCard
          icon="🏥"
          label={tr('underperforming_centres', language)}
          value={underperformingCentres}
          subtitle={language === 'hi' ? 'चिह्नित केंद्र' : 'Flagged centres'}
          loading={evaluationsLoading}
          color="purple"
        />
      </div>

      {/* Section B: Stock-Out Predictions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{tr('stock_out_predictions', language)}</h2>
          {!predictionsLoading && (
            <span className="text-xs text-gray-500">{predictions.length} {language === 'hi' ? 'आइटम ट्रैक किए गए' : 'items tracked'}</span>
          )}
        </div>

        {predictionsLoading && <LoadingSkeleton count={3} />}

        {predictionsError && (
          <ErrorCard message="Unable to load predictions" onRetry={fetchPredictions} />
        )}

        {!predictionsLoading && !predictionsError && predictions.length === 0 && (
          <EmptyState message={language === 'hi' ? 'कोई स्टॉक-आउट जोखिम नहीं। सभी दवाएं सुरक्षित स्तर पर हैं।' : 'No stock-out risks detected. All medicines are at safe levels.'} />
        )}

        {!predictionsLoading && !predictionsError && predictions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((prediction) => {
              const days = daysUntil(prediction.predictedStockOutDate);
              const urgency = getUrgency(days);
              return (
                <div
                  key={`${prediction.centreId}-${prediction.medicineId}`}
                  className={`rounded-lg border p-4 ${urgency.bgColor} ${urgency.borderColor} transition-shadow hover:shadow-md`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${urgency.color} bg-white/80`}>
                      {urgency.badge} {language === 'hi' ? urgency.labelHi : urgency.label}
                    </span>
                    <span className={`text-sm font-bold ${urgency.color}`}>
                      {days}{language === 'hi' ? ' दिन शेष' : 'd left'}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">{prediction.centreName}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{prediction.medicineName}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/50">
                    <span className="text-xs text-gray-500">{language === 'hi' ? 'वर्तमान:' : 'Current:'} {prediction.currentQuantity} {language === 'hi' ? 'यूनिट' : 'units'}</span>
                    <span className="text-xs text-gray-500">
                      {language === 'hi' ? 'स्टॉक-आउट:' : 'Stock-out:'} {new Date(prediction.predictedStockOutDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section C: Redistribution Recommendations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{tr('redistribution', language)}</h2>
          {!recommendationsLoading && (
            <span className="text-xs text-gray-500">{recommendations.length} {language === 'hi' ? 'स्थानांतरण सुझाए गए' : 'transfers suggested'}</span>
          )}
        </div>

        {recommendationsLoading && <LoadingSkeleton count={2} />}

        {recommendationsError && (
          <ErrorCard message="Unable to load recommendations" onRetry={fetchRecommendations} />
        )}

        {!recommendationsLoading && !recommendationsError && recommendations.length === 0 && (
          <EmptyState message="No redistributions needed. Resources are well-balanced across centres." />
        )}

        {!recommendationsLoading && !recommendationsError && recommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, index) => (
              <div
                key={`${rec.sourceCentreId}-${rec.destinationCentreId}-${index}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                {/* Resource badge */}
                <div className="flex items-center gap-2 mb-3">
                  <ResourceBadge type={rec.resourceType} />
                  {rec.resourceName && (
                    <span className="text-sm font-medium text-gray-700">{rec.resourceName}</span>
                  )}
                  <span className="ml-auto text-sm font-bold text-indigo-600">
                    {language === 'hi' ? 'मात्रा:' : 'Qty:'} {rec.quantity}
                  </span>
                </div>

                {/* Transfer visual */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">{language === 'hi' ? 'से' : 'From'}</p>
                    <p className="text-sm font-semibold text-gray-900">{rec.sourceCentreName}</p>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">{language === 'hi' ? 'को' : 'To'}</p>
                    <p className="text-sm font-semibold text-gray-900">{rec.destinationCentreName}</p>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-xs text-gray-600 mt-3 leading-relaxed line-clamp-2">
                  {rec.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// --- Sub-components ---

function SummaryCard({
  icon,
  label,
  value,
  subtitle,
  loading,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  subtitle: string;
  loading: boolean;
  color: 'red' | 'orange' | 'blue' | 'purple';
}) {
  const colorMap = {
    red: 'border-red-200 bg-red-50',
    orange: 'border-orange-200 bg-orange-50',
    blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
  };
  const valueColorMap = {
    red: 'text-red-700',
    orange: 'text-orange-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold ${valueColorMap[color]}`}>{value}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function ResourceBadge({ type }: { type: 'medicine' | 'staff' | 'beds' }) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const config = {
    medicine: { label: lang === 'hi' ? 'दवा' : 'Medicine', bg: 'bg-green-100', text: 'text-green-700', icon: '💊' },
    staff: { label: lang === 'hi' ? 'स्टाफ' : 'Staff', bg: 'bg-blue-100', text: 'text-blue-700', icon: '👨‍⚕️' },
    beds: { label: lang === 'hi' ? 'बिस्तर' : 'Beds', bg: 'bg-purple-100', text: 'text-purple-700', icon: '🛏️' },
  };
  const c = config[type] || config.medicine;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon} {c.label}
    </span>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
          <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-3 w-full bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-red-700 font-medium mb-3">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
      <span className="text-2xl">✅</span>
      <p className="text-green-700 text-sm mt-2">{message}</p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { dbPaths } from '@/lib/firebase/types';
import { getSevenDayChartData } from '@/lib/services/chart-data';
import { t } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface FootfallChartProps {
  centreId: string;
}

/**
 * FootfallChart — Client component that displays a 7-day bar chart of patient footfall.
 * - Subscribes to the last 7 days of footfall data from RTDB
 * - Uses getSevenDayChartData() for zero-fill transformation
 * - Renders a bar chart using react-chartjs-2
 *
 * Validates: Requirements 4.5
 */
export default function FootfallChart({ centreId }: FootfallChartProps) {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({
    labels: [],
    data: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const footfallRef = ref(database, dbPaths.centreFootfall(centreId));

    const unsubscribe = onValue(footfallRef, (snapshot) => {
      const rawData = snapshot.val() as Record<string, { count: number }> | null;

      // Transform RTDB data into a flat record of date -> count
      const records: Record<string, number> = {};
      if (rawData) {
        Object.entries(rawData).forEach(([date, value]) => {
          if (value && typeof value.count === 'number') {
            records[date] = value.count;
          }
        });
      }

      const transformed = getSevenDayChartData(records);
      setChartData(transformed);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [centreId]);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow-sm animate-pulse" aria-busy="true">
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: t('patient_footfall', lang),
        data: chartData.data,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: t('patient_footfall_last_7', lang),
        font: { size: 14 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        title: {
          display: true,
          text: t('patients', lang),
        },
      },
      x: {
        title: {
          display: true,
          text: t('date', lang),
        },
      },
    },
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="h-64" role="img" aria-label="Bar chart showing patient footfall for the last 7 days">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

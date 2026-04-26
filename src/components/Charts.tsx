/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { DailyRecord, ServiceType } from '../types';
import { SERVICES } from '../constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export function RevenueChart({ history }: { history: DailyRecord[] }) {
  const sortedData = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  
  const data = {
    labels: sortedData.map(d => new Date(d.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })),
    datasets: [
      {
        label: 'الصافي النهائي',
        data: sortedData.map(d => d.totalNetRevenue),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return <Line data={data} options={options} />;
}

export function ServiceDistributionChart({ record }: { record: DailyRecord }) {
  const labels = Object.entries(SERVICES).map(([_, label]) => label);
  const dataValues = Object.keys(SERVICES).map(key => record.revenueByService[key as ServiceType] || 0);

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: [
          '#4f46e5',
          '#0ea5e9',
          '#f59e0b',
          '#10b981',
          '#8b5cf6',
          '#64748b',
        ],
        borderWidth: 0,
      },
    ],
  };

  return <Pie data={data} options={{ plugins: { legend: { position: 'bottom' as const } } }} />;
}

export function MonthlyComparisonChart({ history }: { history: DailyRecord[] }) {
  // Group by month
  const monthlyData: Record<string, number> = {};
  history.forEach(record => {
    const month = record.date.substring(0, 7); // YYYY-MM
    monthlyData[month] = (monthlyData[month] || 0) + record.totalNetRevenue;
  });

  const months = Object.keys(monthlyData).sort().slice(-6);
  
  const data = {
    labels: months.map(m => {
      const [year, month] = m.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('ar-EG', { month: 'long' });
    }),
    datasets: [
      {
        label: 'إيرادات الشهر',
        data: months.map(m => monthlyData[m]),
        backgroundColor: '#4f46e5',
        borderRadius: 8,
      },
    ],
  };

  return <Bar data={data} options={{ plugins: { legend: { display: false } } }} />;
}

export function ClinicComparisonChart({ history }: { history: DailyRecord[] }) {
  const clinicStats = {
    MINIA: 0,
    BENI_AHMED: 0
  };

  history.forEach(record => {
    if (record.revenueByClinic) {
      const miniaGross = record.revenueByClinic.MINIA || 0;
      const beniGross = record.revenueByClinic.BENI_AHMED || 0;
      
      const miniaManagement = record.managementByClinic?.MINIA || 0;
      const beniManagement = record.managementByClinic?.BENI_AHMED || 0;

       clinicStats.MINIA += (miniaGross - miniaManagement);
       clinicStats.BENI_AHMED += (beniGross - beniManagement);
    }
  });

  const data = {
    labels: ['المنيا', 'بني أحمد'],
    datasets: [
      {
        data: [clinicStats.MINIA, clinicStats.BENI_AHMED],
        backgroundColor: ['#0ea5e9', '#4f46e5'],
        borderWidth: 0,
      },
    ],
  };

  return <Bar 
    data={data} 
    options={{ 
      indexAxis: 'y' as const,
      plugins: { 
        legend: { display: false },
        title: { display: true, text: 'مقارنة صافي الربح حسب العيادة (قبل العشور)', font: { family: 'inherit', weight: 'bold' } }
      } 
    }} 
  />;
}

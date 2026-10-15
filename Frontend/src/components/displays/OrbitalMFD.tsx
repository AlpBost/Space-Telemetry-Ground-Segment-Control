import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Compass } from 'lucide-react';
import type { TrajectorySubsystem, HistoryPoint } from '../../types/telemetry';
import { useLanguage } from '../../i18n/LanguageContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface OrbitalMFDProps {
  trajectory: TrajectorySubsystem | undefined;
  history: HistoryPoint[];
  isLOS?: boolean;
  isConnected?: boolean;
}

export const OrbitalMFD: React.FC<OrbitalMFDProps> = ({ trajectory, history, isLOS }) => {
  const { t } = useLanguage();
  const labels = history.map((h) => h.timeLabel);
  const altitudeData = history.map((h) => h.altitude);
  const velocityData = history.map((h) => h.velocity);

  const chartData = {
    labels,
    datasets: [
      {
        label: t.mfd.trajectory.altitudeLabel,
        data: altitudeData,
        borderColor: '#93c5fd', // Pastel Buz Mavisi
        backgroundColor: 'rgba(147, 197, 253, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: t.mfd.trajectory.velocityLabel,
        data: velocityData,
        borderColor: '#6ee7b7', // Pastel Mint
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'JetBrains Mono', size: 10 },
          boxWidth: 12,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        type: 'linear',
        position: 'left',
        min: 0,
        max: 450,
        grid: { color: 'rgba(51, 65, 85, 0.25)' },
        ticks: { color: '#93c5fd', font: { family: 'JetBrains Mono', size: 10 } },
      },
      y1: {
        type: 'linear',
        position: 'right',
        min: 0,
        max: 10,
        grid: { drawOnChartArea: false },
        ticks: { color: '#6ee7b7', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  const rawFlightPhase = trajectory?.flight_phase || 'NOMINAL';
  const phaseLabel = (t.phases as Record<string, string>)[rawFlightPhase] || rawFlightPhase;

  return (
    <div className="mcc-panel p-4 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-sky-300" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {t.mfd.trajectory.title}
          </h2>
        </div>
        <span className="text-[11px] font-mono-numbers px-2 py-0.5 rounded bg-slate-800/80 text-sky-300 border border-slate-700/80">
          {phaseLabel}
        </span>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono-numbers">
        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">{t.mfd.trajectory.altitude}</span>
          <span className="text-base font-semibold text-sky-200">
            {trajectory?.altitude_km?.toFixed(1) ?? '120.0'}{' '}
            <span className="text-xs font-normal text-slate-400">km</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">{t.mfd.trajectory.velocity}</span>
          <span className="text-base font-semibold text-emerald-200">
            {trajectory?.velocity_kms?.toFixed(2) ?? '2.40'}{' '}
            <span className="text-xs font-normal text-slate-400">km/s</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">{t.mfd.trajectory.apogee}</span>
          <span className="text-base font-semibold text-slate-300">
            {trajectory?.apogee_km?.toFixed(0) ?? '412'}{' '}
            <span className="text-xs font-normal text-slate-400">km</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">{t.mfd.trajectory.perigee}</span>
          <span className="text-base font-semibold text-slate-300">
            {trajectory?.perigee_km?.toFixed(0) ?? '180'}{' '}
            <span className="text-xs font-normal text-slate-400">km</span>
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-44 w-full pt-1 relative">
        {isLOS && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px] flex items-center justify-center z-10 rounded">
            <span className="text-[11px] font-mono-numbers px-2.5 py-1 rounded bg-rose-950/90 border border-rose-500/60 text-rose-300 font-semibold animate-pulse">
              📡 {t.mfd.trajectory.signalLostOverlay}
            </span>
          </div>
        )}
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

import { Line } from 'react-chartjs-2';
import { Flame } from 'lucide-react';
import type { PropulsionSubsystem, HistoryPoint } from '../../types/telemetry';

interface PropulsionMFDProps {
  propulsion: PropulsionSubsystem | undefined;
  history: HistoryPoint[];
}

export const PropulsionMFD: React.FC<PropulsionMFDProps> = ({ propulsion, history }) => {
  const labels = history.map((h) => h.timeLabel);
  const pressureData = history.map((h) => h.chamberPressure);

  const isLowPressure = (propulsion?.chamber_pressure_bar ?? 120) < 90.0 && (propulsion?.chamber_pressure_bar ?? 0) > 0;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Yanma Odası Basıncı (bar)',
        data: pressureData,
        borderColor: isLowPressure ? '#fda4af' : '#fdba74', // Pastel Şeftali veya Gül Kurusu
        backgroundColor: isLowPressure ? 'rgba(253, 164, 175, 0.08)' : 'rgba(253, 186, 116, 0.08)',
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
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
      },
    },
    scales: {
      x: { display: false },
      y: {
        min: 0,
        max: 180,
        grid: { color: 'rgba(51, 65, 85, 0.25)' },
        ticks: { color: '#fdba74', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  const fuelPct = propulsion?.fuel_remaining_pct ?? 85.0;

  return (
    <div className="mcc-panel p-4 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-300" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            MFD 2: İTKİ & MOTOR BASINCI (PROPULSION)
          </h2>
        </div>
        <span
          className={`text-[11px] font-mono-numbers px-2 py-0.5 rounded border ${
            isLowPressure
              ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
              : 'bg-slate-800/80 text-amber-300 border-slate-700/80'
          }`}
        >
          {propulsion?.engine_state || 'ARMED'}
        </span>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono-numbers">
        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">YANMA BASINCI</span>
          <span
            className={`text-base font-semibold ${
              isLowPressure ? 'text-rose-300' : 'text-amber-200'
            }`}
          >
            {propulsion?.chamber_pressure_bar?.toFixed(1) ?? '---'}{' '}
            <span className="text-xs font-normal text-slate-400">bar</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">İTKİ KUVVETİ</span>
          <span className="text-base font-semibold text-slate-200">
            {propulsion?.thrust_kn?.toFixed(1) ?? '---'}{' '}
            <span className="text-xs font-normal text-slate-400">kN</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">YAKIT SICAKLIĞI</span>
          <span className="text-base font-semibold text-sky-200">
            {propulsion?.propellant_temp_c?.toFixed(1) ?? '---'}{' '}
            <span className="text-xs font-normal text-slate-400">°C</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">KALAN YAKIT</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${fuelPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-300">{fuelPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-44 w-full pt-1">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

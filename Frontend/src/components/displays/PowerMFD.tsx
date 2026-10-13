import { Line } from 'react-chartjs-2';
import { Zap } from 'lucide-react';
import type { ElectricalSubsystem, HistoryPoint } from '../../types/telemetry';

interface PowerMFDProps {
  electrical: ElectricalSubsystem | undefined;
  history: HistoryPoint[];
}

export const PowerMFD: React.FC<PowerMFDProps> = ({ electrical, history }) => {
  const labels = history.map((h) => h.timeLabel);
  const voltageData = history.map((h) => h.busVoltage);

  const busVoltage = electrical?.bus_voltage_v ?? 28.2;
  const isLowVoltage = busVoltage < 24.0;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ana Bara Gerilimi (V)',
        data: voltageData,
        borderColor: isLowVoltage ? '#fda4af' : '#c4b5fd', // Pastel Leylak veya Rose
        backgroundColor: isLowVoltage ? 'rgba(253, 164, 175, 0.08)' : 'rgba(196, 181, 253, 0.08)',
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
        min: 18,
        max: 34,
        grid: { color: 'rgba(51, 65, 85, 0.25)' },
        ticks: { color: '#c4b5fd', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  const soc = electrical?.battery_soc_pct ?? 92.0;

  return (
    <div className="mcc-panel p-4 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-300" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            MFD 4: GÜÇ SİSTEMİ (ELECTRICAL POWER - EPS)
          </h2>
        </div>
        <span
          className={`text-[11px] font-mono-numbers px-2 py-0.5 rounded border ${
            isLowVoltage
              ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 animate-pulse'
              : 'bg-slate-800/80 text-purple-300 border-slate-700/80'
          }`}
        >
          {isLowVoltage ? 'UNDER-VOLTAGE ALARM' : 'BUS NOMINAL (28V)'}
        </span>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono-numbers">
        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">BARA VOLTAJI</span>
          <span
            className={`text-base font-semibold ${
              isLowVoltage ? 'text-rose-300' : 'text-purple-200'
            }`}
          >
            {busVoltage.toFixed(1)} <span className="text-xs font-normal text-slate-400">V</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">BARA AKIMI</span>
          <span className="text-base font-semibold text-slate-200">
            {electrical?.bus_current_a?.toFixed(1) ?? '---'}{' '}
            <span className="text-xs font-normal text-slate-400">A</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">BATARYA DOLULUK</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-300 h-full rounded-full transition-all duration-300"
                style={{ width: `${soc}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-purple-200">{soc.toFixed(0)}%</span>
          </div>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">GÜNEŞ PANEL ÜRETİMİ</span>
          <span className="text-base font-semibold text-slate-300">
            {electrical?.solar_generation_w?.toFixed(0) ?? '---'}{' '}
            <span className="text-xs font-normal text-slate-400">W</span>
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-44 w-full pt-1">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

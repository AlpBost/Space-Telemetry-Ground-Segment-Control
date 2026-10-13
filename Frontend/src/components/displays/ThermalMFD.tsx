import { Line } from 'react-chartjs-2';
import { Thermometer, Sun, Cpu, Battery } from 'lucide-react';
import type { ThermalSubsystem, HistoryPoint } from '../../types/telemetry';

interface ThermalMFDProps {
  thermal: ThermalSubsystem | undefined;
  history: HistoryPoint[];
}

export const ThermalMFD: React.FC<ThermalMFDProps> = ({ thermal, history }) => {
  const labels = history.map((h) => h.timeLabel);
  const solarTempData = history.map((h) => h.solarTemp);

  const solarTemp = thermal?.solar_array_temp_c ?? 52.0;
  const isSolarHot = solarTemp >= 75.0;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Güneş Paneli Sıcaklığı (°C)',
        data: solarTempData,
        borderColor: isSolarHot ? '#fda4af' : '#6ee7b7', // Pastel Rose veya Pastel Mint
        backgroundColor: isSolarHot ? 'rgba(253, 164, 175, 0.08)' : 'rgba(110, 231, 183, 0.08)',
        fill: true,
        tension: 0.3,
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
        min: 30,
        max: 100,
        grid: { color: 'rgba(51, 65, 85, 0.25)' },
        ticks: { color: '#6ee7b7', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  return (
    <div className="mcc-panel p-4 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-emerald-300" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            MFD 3: TERMAL DAĞILIM (THERMAL MATRIX)
          </h2>
        </div>
        <span
          className={`text-[11px] font-mono-numbers px-2 py-0.5 rounded border ${
            isSolarHot
              ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 animate-pulse'
              : 'bg-slate-800/80 text-emerald-300 border-slate-700/80'
          }`}
        >
          {isSolarHot ? 'ALARM: >75.0°C' : 'THERMAL NOMINAL'}
        </span>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono-numbers">
        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px] flex items-center gap-1">
            <Sun className="w-3 h-3 text-amber-300" /> GÜNEŞ PANELİ
          </span>
          <span
            className={`text-base font-semibold ${
              isSolarHot ? 'text-rose-300' : 'text-emerald-200'
            }`}
          >
            {solarTemp.toFixed(1)} <span className="text-xs font-normal text-slate-400">°C</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px] flex items-center gap-1">
            <Cpu className="w-3 h-3 text-sky-300" /> AVİYONİK
          </span>
          <span className="text-base font-semibold text-slate-200">
            {thermal?.avionics_temp_c?.toFixed(1) ?? '---'}{' '}
            <span className="text-xs font-normal text-slate-400">°C</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px] flex items-center gap-1">
            <Battery className="w-3 h-3 text-purple-300" /> BATARYA HÜCRESİ
          </span>
          <span className="text-base font-semibold text-purple-200">
            {thermal?.battery_cell_temp_c?.toFixed(1) ?? '---'}{' '}
            <span className="text-xs font-normal text-slate-400">°C</span>
          </span>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">NOZUL BOĞAZI</span>
          <span className="text-base font-semibold text-slate-300">
            {thermal?.nozzle_throat_temp_c?.toFixed(0) ?? '---'}{' '}
            <span className="text-xs font-normal text-slate-400">°C</span>
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

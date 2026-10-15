import { useState, useEffect } from 'react';
import { Radio, Clock, Satellite } from 'lucide-react';
import type { TelemetryPacket } from '../../types/telemetry';
import { useLanguage } from '../../i18n/LanguageContext';

interface MissionHeaderProps {
  packet: TelemetryPacket | null;
  isConnected: boolean;
  isLOS: boolean;
  packetCount: number;
}

export const MissionHeader: React.FC<MissionHeaderProps> = ({
  packet,
  isConnected,
  isLOS,
  packetCount,
}) => {
  const { t } = useLanguage();
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setUtcTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = packet?.fdir.overall_status || 'NOMINAL';
  const rawFlightPhase = packet?.trajectory.flight_phase || 'STANDBY';
  const flightPhaseLabel = (t.phases as Record<string, string>)[rawFlightPhase] || rawFlightPhase;
  const distanceKm = packet?.header.simulated_distance_km ?? 420.5;
  const owltMs = packet?.header.one_way_light_time_ms ?? 26.4;
  const driftPpm = packet?.header.clock_drift_ppm ?? 2.4;

  const getStatusBadge = () => {
    if (isLOS) {
      return {
        bg: 'bg-rose-950/40 border-rose-400/40 text-rose-300',
        dot: 'bg-rose-400 animate-pulse',
        label: t.common.losDown,
      };
    }
    if (overallStatus === 'CRITICAL') {
      return {
        bg: 'bg-rose-950/40 border-rose-400/50 text-rose-300',
        dot: 'bg-rose-400 animate-ping',
        label: t.common.critical,
      };
    }
    if (overallStatus === 'WARNING') {
      return {
        bg: 'bg-amber-950/40 border-amber-300/40 text-amber-200',
        dot: 'bg-amber-300 animate-pulse',
        label: t.common.warning,
      };
    }
    if (overallStatus === 'CAUTION') {
      return {
        bg: 'bg-amber-950/30 border-amber-200/30 text-amber-100',
        dot: 'bg-amber-200',
        label: t.common.caution,
      };
    }
    return {
      bg: 'bg-emerald-950/30 border-emerald-400/30 text-emerald-200',
      dot: 'bg-emerald-300',
      label: t.common.nominal,
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <header className="mcc-panel px-5 py-3 mb-4 flex items-center justify-between gap-4 border-b border-slate-800 whitespace-nowrap overflow-x-auto min-w-0">
      {/* 1. Left: Title & Callsign */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sky-300">
          <Satellite className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-wider text-slate-100 uppercase">
              {t.common.appName}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono-numbers bg-slate-800 text-sky-300 border border-slate-700">
              {t.common.satelliteName}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono-numbers">
            {t.common.station}: {t.common.stationName} &bull; {t.common.phase}:{' '}
            <span className="text-slate-200 font-semibold">{flightPhaseLabel}</span>
          </p>
        </div>
      </div>

      {/* 2. Middle: Telemetry Flight Metrics */}
      <div className="flex items-center gap-6 text-xs shrink-0">
        {/* Slant Range */}
        <div className="flex flex-col">
          <span className="text-slate-400 font-mono-numbers">{t.header.slantRange}</span>
          <span className="text-sky-200 font-mono-numbers font-medium text-sm">
            {distanceKm.toFixed(1)} km
          </span>
        </div>

        {/* OWLT Light Delay */}
        <div className="flex flex-col">
          <span className="text-slate-400 font-mono-numbers">{t.header.owlt}</span>
          <span className="text-sky-200 font-mono-numbers font-medium text-sm">
            &tau; = {owltMs.toFixed(2)} ms
          </span>
        </div>

        {/* Clock Drift */}
        <div className="flex flex-col">
          <span className="text-slate-400 font-mono-numbers">{t.header.clockDrift}</span>
          <span className="text-purple-200 font-mono-numbers font-medium text-sm">
            &Delta;t: {driftPpm} ppm
          </span>
        </div>

        {/* Master UTC Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="font-mono-numbers font-semibold text-sm tracking-wider">{utcTime}</span>
        </div>
      </div>

      {/* 3. Right: Link Status & Alarm Pill */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Link Quality Lock Badge */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono-numbers border ${
            isConnected && !isLOS
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>{isConnected && !isLOS ? t.common.aosLock : t.common.losDown}</span>
          <span className="text-slate-400">
            ({packetCount.toLocaleString()} {t.common.pkts})
          </span>
        </div>

        {/* System FDIR Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono-numbers border ${statusBadge.bg}`}
        >
          <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
          <span className="font-semibold tracking-wide">{statusBadge.label}</span>
        </div>
      </div>
    </header>
  );
};

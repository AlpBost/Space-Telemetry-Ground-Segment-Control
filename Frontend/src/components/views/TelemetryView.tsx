import React, { useState } from 'react';
import { OrbitalMFD } from '../displays/OrbitalMFD';
import { PropulsionMFD } from '../displays/PropulsionMFD';
import { ThermalMFD } from '../displays/ThermalMFD';
import { PowerMFD } from '../displays/PowerMFD';
import { TacticalCommandPad } from '../controls/TacticalCommandPad';
import type { TelemetryPacket, HistoryPoint } from '../../types/telemetry';
import type { CommandResult } from '../../hooks/useTelemetryStream';
import { Clock } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TelemetryViewProps {
  packet: TelemetryPacket | null;
  history: HistoryPoint[];
  isConnected: boolean;
  isLOS: boolean;
  currentMode: 'LIVE_SIMULATION' | 'CSV_REPLAY';
  onSwitchMode: (mode: 'LIVE_SIMULATION' | 'CSV_REPLAY') => Promise<CommandResult>;
  onRestartReplay: () => Promise<CommandResult>;
  onSetRate: (hz: number) => Promise<CommandResult>;
  onInjectAnomaly: (type: string) => Promise<CommandResult>;
  onClearAnomaly: (type?: string) => Promise<CommandResult>;
  onArmCommand: (cmd: string) => Promise<any>;
  onFireCommand: (req: any) => Promise<any>;
}

export const TelemetryView: React.FC<TelemetryViewProps> = ({
  packet,
  history,
  isConnected,
  isLOS,
  currentMode,
  onSwitchMode,
  onRestartReplay,
  onSetRate,
  onInjectAnomaly,
  onClearAnomaly,
  onArmCommand,
  onFireCommand,
}) => {
  const { t, language } = useLanguage();
  const [historyWindow, setHistoryWindow] = useState<number>(100);

  // Filter history points based on selected time window
  const visibleHistory = history.slice(-historyWindow);

  const windowOptions = [
    { label: language === 'tr' ? 'Son 30 sn' : 'Last 30s', points: 40 },
    { label: language === 'tr' ? 'Son 1 dk' : 'Last 1m', points: 80 },
    { label: language === 'tr' ? 'Son 2.5 dk' : 'Last 2.5m', points: 160 },
  ];

  return (
    <div className="space-y-4">
      {/* View Sub-Header with Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono-numbers">
            {language === 'tr' ? 'CANLI ZAMAN SERİSİ TELEMETRİSİ' : 'LIVE TIME-SERIES TELEMETRY'}
          </h2>
          <p className="text-xs text-slate-400">
            {language === 'tr'
              ? 'Yörünge mekaniği, itki yanma odası dinamikleri, termal matris ve bara gerilimi.'
              : 'Orbital dynamics, propulsion chamber performance, thermal matrix, and electrical bus.'}
          </p>
        </div>

        {/* Time Window Zoom Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono-numbers">
          <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />{' '}
            {language === 'tr' ? 'ZAMAN PENCERESİ:' : 'TIME WINDOW:'}
          </span>
          {windowOptions.map((item) => (
            <button
              key={item.points}
              onClick={() => setHistoryWindow(item.points)}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                historyWindow === item.points
                  ? 'bg-sky-950/80 border border-sky-500/50 text-sky-200 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Multi-Function Displays (MFD Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OrbitalMFD trajectory={packet?.trajectory} history={visibleHistory} />
        <PropulsionMFD propulsion={packet?.propulsion} history={visibleHistory} />
        <ThermalMFD thermal={packet?.thermal} history={visibleHistory} />
        <PowerMFD electrical={packet?.electrical} history={visibleHistory} />
      </div>

      {/* Tactical Uplink Command & Test-Rig Console */}
      <TacticalCommandPad
        currentMode={currentMode}
        isConnected={isConnected}
        isLOS={isLOS}
        onSwitchMode={onSwitchMode}
        onRestartReplay={onRestartReplay}
        onSetRate={onSetRate}
        onInjectAnomaly={onInjectAnomaly}
        onClearAnomaly={onClearAnomaly}
        onArmCommand={onArmCommand}
        onFireCommand={onFireCommand}
      />
    </div>
  );
};

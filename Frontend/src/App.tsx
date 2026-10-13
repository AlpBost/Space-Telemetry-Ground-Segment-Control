import { useTelemetryStream } from './hooks/useTelemetryStream';
import { MissionHeader } from './components/header/MissionHeader';
import { AlarmBanner } from './components/fdir/AlarmBanner';
import { OrbitalMFD } from './components/displays/OrbitalMFD';
import { PropulsionMFD } from './components/displays/PropulsionMFD';
import { ThermalMFD } from './components/displays/ThermalMFD';
import { PowerMFD } from './components/displays/PowerMFD';
import { TacticalCommandPad } from './components/controls/TacticalCommandPad';
import { Binary, ShieldCheck } from 'lucide-react';

export function App() {
  const {
    packet,
    isConnected,
    isLOS,
    packetCount,
    corruptedPackets,
    history,
    ackAlarm,
    injectAnomaly,
    clearAnomaly,
    setStreamRate,
    switchMode,
    armCommand,
    fireCommand,
  } = useTelemetryStream();

  const alarms = packet?.fdir.active_alarms || [];
  const currentMode = (packet?.source_mode as any) || 'LIVE_SIMULATION';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#e2e8f0] p-4 lg:p-6 font-sans">
      <div className="max-w-[1720px] mx-auto">
        {/* Top Mission Control Status Header */}
        <MissionHeader
          packet={packet}
          isConnected={isConnected}
          isLOS={isLOS}
          packetCount={packetCount}
        />

        {/* FDIR Alarms Banner (Active when limits breached) */}
        <AlarmBanner alarms={alarms} onAcknowledge={ackAlarm} />

        {/* 4-Multi-Function Displays (MFD Grid) */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OrbitalMFD trajectory={packet?.trajectory} history={history} />
          <PropulsionMFD propulsion={packet?.propulsion} history={history} />
          <ThermalMFD thermal={packet?.thermal} history={history} />
          <PowerMFD electrical={packet?.electrical} history={history} />
        </main>

        {/* Tactical Uplink Command & Test-Rig Console */}
        <TacticalCommandPad
          currentMode={currentMode}
          onSwitchMode={switchMode}
          onSetRate={setStreamRate}
          onInjectAnomaly={injectAnomaly}
          onClearAnomaly={clearAnomaly}
          onArmCommand={armCommand}
          onFireCommand={fireCommand}
        />

        {/* Bottom CCSDS Telemetry Frame Inspector */}
        <footer className="mcc-panel p-3.5 mt-4 text-xs font-mono-numbers flex flex-wrap items-center justify-between gap-4 border border-slate-800 text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Binary className="w-3.5 h-3.5 text-sky-400" />
              <span>SYNC WORD: <strong className="text-white">{packet?.header.sync_word || '0x1ACFFC1D'}</strong></span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>SEQ ID: <strong className="text-slate-200">{packet?.header.sequence_id ?? '---'}</strong></span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>CRC32: <strong className="text-emerald-300">{packet?.header.crc32_checksum || '0x4F12B890'}</strong></span>
            </div>

            {corruptedPackets > 0 && (
              <span className="text-amber-300 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-600/40">
                ⚠️ Bozuk Paketler: {corruptedPackets}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              FDIR Evaluator Cycles: <strong className="text-slate-200">{packet?.fdir.fdir_cycles_evaluated ?? 0}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Protocol: <strong className="text-sky-300">RFC 6455 Persistent WebSocket (Downlink)</strong>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;

import { useState } from 'react';
import { useTelemetryStream } from './hooks/useTelemetryStream';
import { MissionHeader } from './components/header/MissionHeader';
import { AlarmBanner } from './components/fdir/AlarmBanner';
import { Sidebar, type NavTab } from './components/sidebar/Sidebar';
import { TelemetryView } from './components/views/TelemetryView';
import { PropulsionPIDView } from './components/views/PropulsionPIDView';
import { FDIREngineView } from './components/views/FDIREngineView';
import { PacketInspectorView } from './components/views/PacketInspectorView';
import { Binary, ShieldCheck } from 'lucide-react';
import { useLanguage } from './i18n/LanguageContext';

export function App() {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState<NavTab>('telemetry');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const {
    packet,
    isConnected,
    isLOS,
    packetCount,
    corruptedPackets,
    history,
    packetLogs,
    clearPacketLogs,
    ackAlarm,
    injectAnomaly,
    clearAnomaly,
    setStreamRate,
    switchMode,
    restartReplay,
    armCommand,
    fireCommand,
  } = useTelemetryStream();

  const alarms = packet?.fdir.active_alarms || [];
  const currentMode = (packet?.source_mode as any) || 'LIVE_SIMULATION';
  const flightPhase = packet?.trajectory.flight_phase || 'STANDBY';

  return (
    <div className="min-h-screen bg-[#070b12] text-[#e2e8f0] flex font-sans">
      {/* 1. Left Collapsible Mission Control Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isConnected={isConnected}
        isLOS={isLOS}
        activeAlarmCount={alarms.length}
        flightPhase={flightPhase}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <div className="max-w-[1780px] w-full mx-auto p-4 lg:p-6 space-y-4">
          {/* Universal Mission Control Status Header */}
          <MissionHeader
            packet={packet}
            isConnected={isConnected}
            isLOS={isLOS}
            packetCount={packetCount}
          />

          {/* FDIR Alarms Banner (Active when limits breached) */}
          <AlarmBanner alarms={alarms} onAcknowledge={ackAlarm} />

          {/* Dynamic Module Views based on Sidebar Selection */}
          <main className="transition-all duration-200">
            {currentTab === 'telemetry' && (
              <TelemetryView
                packet={packet}
                history={history}
                isConnected={isConnected}
                isLOS={isLOS}
                currentMode={currentMode}
                onSwitchMode={switchMode}
                onRestartReplay={restartReplay}
                onSetRate={setStreamRate}
                onInjectAnomaly={injectAnomaly}
                onClearAnomaly={clearAnomaly}
                onArmCommand={armCommand}
                onFireCommand={fireCommand}
              />
            )}

            {currentTab === 'pid' && <PropulsionPIDView packet={packet} />}

            {currentTab === 'fdir' && (
              <FDIREngineView
                packet={packet}
                onAcknowledge={ackAlarm}
                onInjectAnomaly={injectAnomaly}
                onClearAnomaly={clearAnomaly}
              />
            )}

            {currentTab === 'packets' && (
              <PacketInspectorView
                packets={packetLogs}
                corruptedCount={corruptedPackets}
                onClearLogs={clearPacketLogs}
              />
            )}
          </main>

          {/* Bottom CCSDS Telemetry Frame Inspector Footer */}
          <footer className="mcc-panel p-3.5 text-xs font-mono-numbers flex flex-wrap items-center justify-between gap-4 border border-slate-800 text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Binary className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  SYNC WORD:{' '}
                  <strong className="text-white">
                    {packet?.header.sync_word || '0x1ACFFC1D'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span>
                  SEQ ID:{' '}
                  <strong className="text-slate-200">
                    {packet?.header.sequence_id ?? '---'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span>
                  CRC32:{' '}
                  <strong className="text-emerald-300">
                    {packet?.header.crc32_checksum || '0x4F12B890'}
                  </strong>
                </span>
              </div>

              {corruptedPackets > 0 && (
                <span className="text-amber-300 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-600/40">
                  ⚠️ {t.common.corruptedPackets}: {corruptedPackets}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {t.common.fdirCycles}:{' '}
                <strong className="text-slate-200">
                  {packet?.fdir.fdir_cycles_evaluated ?? 0}
                </strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                {t.common.activeModule}:{' '}
                <strong className="text-sky-300 uppercase font-bold">
                  {currentTab === 'telemetry'
                    ? `1. ${t.nav.telemetry}`
                    : currentTab === 'pid'
                    ? `2. ${t.nav.pid}`
                    : currentTab === 'fdir'
                    ? `3. ${t.nav.fdir}`
                    : `4. ${t.nav.packets}`}
                </strong>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;

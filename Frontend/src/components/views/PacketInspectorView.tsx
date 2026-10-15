import React, { useState, useMemo } from 'react';
import {
  Binary,
  AlertTriangle,
  Pause,
  Play,
  Trash2,
  Search,
  Download,
  ShieldAlert,
} from 'lucide-react';
import type { TelemetryPacket } from '../../types/telemetry';
import { useLanguage } from '../../i18n/LanguageContext';

interface PacketInspectorViewProps {
  packets: TelemetryPacket[];
  corruptedCount: number;
  onClearLogs: () => void;
}

export const PacketInspectorView: React.FC<PacketInspectorViewProps> = ({
  packets,
  corruptedCount,
  onClearLogs,
}) => {
  const { t, language } = useLanguage();
  const [selectedSeqId, setSelectedSeqId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CORRUPTED' | 'NOMINAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Generate simulated realistic CCSDS hexadecimal raw frame representation
  const generateHexDump = (pkt: TelemetryPacket) => {
    const seqHex = (pkt.header.sequence_id & 0xffff).toString(16).padStart(4, '0').toUpperCase();
    const crc = pkt.header.crc32_checksum.replace('0x', '').padStart(8, '0');
    const altHex = Math.round(pkt.trajectory.altitude_km * 10).toString(16).padStart(4, '0').toUpperCase();
    const velHex = Math.round(pkt.trajectory.velocity_kms * 100).toString(16).padStart(4, '0').toUpperCase();
    const pressHex = Math.round(pkt.propulsion.chamber_pressure_bar * 10).toString(16).padStart(4, '0').toUpperCase();
    const tempHex = Math.round(pkt.thermal.solar_array_temp_c * 10).toString(16).padStart(4, '0').toUpperCase();
    const voltHex = Math.round(pkt.electrical.bus_voltage_v * 10).toString(16).padStart(4, '0').toUpperCase();

    return [
      `0000   1A CF FC 1D 00 01 ${seqHex.slice(0, 2)} ${seqHex.slice(2, 4)}   00 00 00 80 5F A2 10 B1   ..|....._...`,
      `0010   ${altHex.slice(0, 2)} ${altHex.slice(2, 4)} ${velHex.slice(0, 2)} ${velHex.slice(2, 4)}   ${pressHex.slice(0, 2)} ${pressHex.slice(2, 4)} ${tempHex.slice(0, 2)} ${tempHex.slice(2, 4)}   ${voltHex.slice(0, 2)} ${voltHex.slice(2, 4)} 00 01 02 A4 FF 00   ..........`,
      `0020   43 43 53 44 53 5F 54 4D   31 2E 30 5F 44 41 57 4E   4F 52 42 49 54 45 52 5F   CCSDS_TM1.0_DAWN`,
      `0030   ${crc.slice(0, 2)} ${crc.slice(2, 4)} ${crc.slice(4, 6)} ${crc.slice(6, 8)}   00 00 00 00 00 00 00 00   00 00 00 00 00 00 00 00   ${crc}........`,
    ];
  };

  const filteredPackets = useMemo(() => {
    return packets.filter((pkt) => {
      const isCorrupted = pkt.fdir && pkt.fdir.checksum_valid === false;
      if (filterMode === 'CORRUPTED' && !isCorrupted) return false;
      if (filterMode === 'NOMINAL' && isCorrupted) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSeq = pkt.header.sequence_id.toString().includes(q);
        const matchesPhase = pkt.trajectory.flight_phase.toLowerCase().includes(q);
        const matchesSync = pkt.header.sync_word.toLowerCase().includes(q);
        if (!matchesSeq && !matchesPhase && !matchesSync) return false;
      }
      return true;
    });
  }, [packets, filterMode, searchQuery]);

  const selectedPacket = packets.find((p) => p.header.sequence_id === selectedSeqId) || packets[0];

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(packets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ccsds_telemetry_stream_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 font-mono-numbers">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
            {t.packets.title}
          </h2>
          <p className="text-xs text-slate-400">
            {t.packets.subtitle}
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">{t.common.totalPackets}:</span>{' '}
            <strong className="text-sky-300">{packets.length}</strong>
          </div>

          {corruptedCount > 0 && (
            <div className="px-3 py-1 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-1.5 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {t.common.corruptedPackets}: <strong>{corruptedCount}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Filter, Pause, Search, Clear */}
      <div className="mcc-panel p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.packets.searchPlaceholder}
              className="pl-8 pr-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs w-52"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded bg-slate-900 border border-slate-800">
            {(['ALL', 'NOMINAL', 'CORRUPTED'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  filterMode === mode
                    ? mode === 'CORRUPTED'
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/50 font-semibold'
                      : 'bg-sky-950 text-sky-200 border border-sky-500/50 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'ALL'
                  ? t.packets.all
                  : mode === 'NOMINAL'
                  ? t.packets.nominal
                  : t.packets.corrupted}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded cursor-pointer flex items-center gap-1.5 transition-colors border font-semibold ${
              isPaused
                ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? t.packets.resume : t.packets.pause}</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors"
            title={t.packets.downloadJSON}
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.packets.downloadJSON}</span>
          </button>

          <button
            onClick={onClearLogs}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 cursor-pointer flex items-center gap-1.5 transition-colors"
            title={t.packets.clear}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.packets.clear}</span>
          </button>
        </div>
      </div>

      {/* Main Content: Split Table & Hex Dump Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Cols: Telemetry Frame Stream Table */}
        <div className="lg:col-span-7 mcc-panel p-3 flex flex-col h-[520px]">
          <div className="text-[11px] font-semibold text-slate-400 pb-2 mb-2 border-b border-slate-800 flex justify-between">
            <span>{t.packets.streamBufferTitle}</span>
            <span>
              {filteredPackets.length} {t.packets.packetsListed}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
            {filteredPackets.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                {t.packets.awaitingPackets}
              </div>
            ) : (
              filteredPackets.map((pkt) => {
                const isSelected = selectedPacket?.header.sequence_id === pkt.header.sequence_id;
                const isCorrupted = pkt.fdir && pkt.fdir.checksum_valid === false;
                const phaseLabel =
                  (t.phases as Record<string, string>)[pkt.trajectory.flight_phase] ||
                  pkt.trajectory.flight_phase;

                return (
                  <div
                    key={pkt.header.sequence_id}
                    onClick={() => setSelectedSeqId(pkt.header.sequence_id)}
                    className={`p-2 rounded border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-400/80 shadow-sm'
                        : isCorrupted
                        ? 'bg-rose-950/30 border-rose-500/40 hover:bg-rose-950/50'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[11px] font-bold text-sky-300 shrink-0">
                        #{pkt.header.sequence_id}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {pkt.header.ground_station_utc.slice(11, 22)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                        {phaseLabel}
                      </span>
                      <span className="text-[11px] text-slate-300 truncate">
                        {t.mfd.trajectory.altitudeLabel.split(' ')[0]}:{' '}
                        {pkt.trajectory.altitude_km.toFixed(1)}km &bull;{' '}
                        {t.mfd.trajectory.velocityLabel.split(' ')[0]}:{' '}
                        {pkt.trajectory.velocity_kms.toFixed(2)}km/s &bull; Pc:{' '}
                        {pkt.propulsion.chamber_pressure_bar.toFixed(1)}b
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">
                        {pkt.header.crc32_checksum}
                      </span>
                      {isCorrupted ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {t.packets.seuFlip}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          {t.packets.crcOk}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 5 Cols: Raw Hexadecimal Dump & Decoded Field Tree */}
        <div className="lg:col-span-5 mcc-panel p-4 flex flex-col justify-between h-[520px] overflow-hidden">
          {selectedPacket ? (
            <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Binary className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-slate-200">
                    {t.packets.frameDetail} #{selectedPacket.header.sequence_id}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                  {selectedPacket.header.sync_word}
                </span>
              </div>

              {/* Hex Dump Box */}
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">
                  {t.packets.rawHexDump}
                </span>
                <div className="p-2.5 rounded bg-[#05080f] border border-slate-800 font-mono text-[10.5px] leading-relaxed text-emerald-400 select-all overflow-x-auto whitespace-pre">
                  {generateHexDump(selectedPacket).join('\n')}
                </div>
              </div>

              {/* Decoded Field Tree */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                <span className="text-[10px] text-slate-400 block mb-1">
                  {t.packets.decodedTree}
                </span>

                <div className="p-2 rounded bg-slate-900/70 border border-slate-800 space-y-1 text-[11px]">
                  <div className="text-sky-300 font-bold mb-1">
                    ▼ {language === 'tr' ? 'Birincil Paket Başlığı' : 'Primary Packet Header'}
                  </div>
                  <div className="pl-3 text-slate-300">
                    <div>
                      Sync Word: <span className="text-white">{selectedPacket.header.sync_word}</span>
                    </div>
                    <div>
                      {language === 'tr' ? 'Paket Sürümü' : 'Packet Version'}:{' '}
                      <span className="text-white">{selectedPacket.header.packet_version}</span>
                    </div>
                    <div>
                      {t.header.slantRange}:{' '}
                      <span className="text-white">
                        {selectedPacket.header.simulated_distance_km} km
                      </span>
                    </div>
                    <div>
                      {t.header.owlt}:{' '}
                      <span className="text-white">
                        {selectedPacket.header.one_way_light_time_ms.toFixed(3)} ms
                      </span>
                    </div>
                    <div>
                      {t.header.clockDrift}:{' '}
                      <span className="text-white">
                        {selectedPacket.header.clock_drift_ppm} ppm
                      </span>
                    </div>
                    <div>
                      CRC32:{' '}
                      <span className="text-emerald-400">
                        {selectedPacket.header.crc32_checksum}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900/70 border border-slate-800 space-y-1 text-[11px]">
                  <div className="text-amber-300 font-bold mb-1">
                    ▼ {language === 'tr' ? 'Alt Sistem Yükleri' : 'Subsystem Payloads'}
                  </div>
                  <div className="pl-3 text-slate-300 space-y-0.5">
                    <div>
                      {t.common.phase}:{' '}
                      <span className="text-white">
                        {(t.phases as Record<string, string>)[selectedPacket.trajectory.flight_phase] ||
                          selectedPacket.trajectory.flight_phase}
                      </span>
                    </div>
                    <div>
                      {t.mfd.trajectory.altitude} / {t.mfd.trajectory.velocity}:{' '}
                      <span className="text-white">
                        {selectedPacket.trajectory.altitude_km} km / {selectedPacket.trajectory.velocity_kms} km/s
                      </span>
                    </div>
                    <div>
                      {t.mfd.propulsion.chamberPressure}:{' '}
                      <span className="text-white">
                        {selectedPacket.propulsion.chamber_pressure_bar} bar
                      </span>
                    </div>
                    <div>
                      {t.mfd.thermal.solarArray}:{' '}
                      <span className="text-white">
                        {selectedPacket.thermal.solar_array_temp_c} °C
                      </span>
                    </div>
                    <div>
                      {t.mfd.electrical.busVoltage}:{' '}
                      <span className="text-white">
                        {selectedPacket.electrical.bus_voltage_v} V
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="m-auto text-slate-500 text-xs">{t.packets.selectPacket}</div>
          )}
        </div>
      </div>
    </div>
  );
};

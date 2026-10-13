import React, { useState } from 'react';
import {
  Sliders,
  AlertOctagon,
  ShieldAlert,
  FileSpreadsheet,
  Lock,
  Unlock,
} from 'lucide-react';

interface TacticalCommandPadProps {
  currentMode: 'LIVE_SIMULATION' | 'CSV_REPLAY';
  onSwitchMode: (mode: 'LIVE_SIMULATION' | 'CSV_REPLAY') => void;
  onSetRate: (hz: number) => void;
  onInjectAnomaly: (type: string) => void;
  onClearAnomaly: (type?: string) => void;
  onArmCommand: (cmd: string) => Promise<any>;
  onFireCommand: (req: any) => Promise<any>;
}

export const TacticalCommandPad: React.FC<TacticalCommandPadProps> = ({
  currentMode,
  onSwitchMode,
  onSetRate,
  onInjectAnomaly,
  onClearAnomaly,
  onArmCommand,
  onFireCommand,
}) => {
  const [selectedRate, setSelectedRate] = useState<number>(10);
  const [armedToken, setArmedToken] = useState<string | null>(null);
  const [armCountdown, setArmCountdown] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const handleArmAbort = async () => {
    const res = await onArmCommand('EMERGENCY_ABORT');
    if (res && res.armed_token) {
      setArmedToken(res.armed_token);
      setArmCountdown(30);
      setFeedbackMsg(`SİSTEM SİLAHLANDIRILDI (ARMED). Anahtar: ${res.armed_token}`);

      const timer = setInterval(() => {
        setArmCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setArmedToken(null);
            setFeedbackMsg('ARM süresi doldu. Sistem otomatik kilitlendi.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleFireAbort = async () => {
    if (!armedToken) return;
    const res = await onFireCommand({
      command_type: 'EMERGENCY_ABORT',
      armed_token: armedToken,
    });
    setArmedToken(null);
    setArmCountdown(0);
    if (res) {
      setFeedbackMsg(res.message || 'Acil durum iptali yürütüldü.');
    }
  };

  const handleRateChange = (hz: number) => {
    setSelectedRate(hz);
    onSetRate(hz);
  };

  return (
    <div className="mcc-panel p-4 mt-4 border-t border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-300" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            KOMUTA KONTROL & DONANIM TEST DÜZENEĞİ (TC UPLINK & TEST-RIG)
          </h2>
        </div>

        {/* Source Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono-numbers">
          <button
            onClick={() => onSwitchMode('LIVE_SIMULATION')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors ${
              currentMode === 'LIVE_SIMULATION'
                ? 'bg-sky-900/60 text-sky-200 border border-sky-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CANLI FİZİK SİMÜLASYONU
          </button>
          <button
            onClick={() => onSwitchMode('CSV_REPLAY')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
              currentMode === 'CSV_REPLAY'
                ? 'bg-purple-900/60 text-purple-200 border border-purple-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV FLIGHT REPLAY
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-numbers">
        {/* Stream Frequency Controls */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
          <span className="text-slate-400 block mb-2 text-[11px]">TELEMETRİ YAYIN FREKANSI</span>
          <div className="flex gap-2">
            {[5, 10, 20, 50].map((hz) => (
              <button
                key={hz}
                onClick={() => handleRateChange(hz)}
                className={`flex-1 py-1.5 rounded cursor-pointer transition-colors border ${
                  selectedRate === hz
                    ? 'bg-sky-950/60 border-sky-400/50 text-sky-200 font-semibold'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {hz} Hz
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            {selectedRate === 50
              ? '50Hz: Gerçek zamanlı yüksek frekanslı test rigor'
              : 'Standart yer istasyonu downlink hızı'}
          </span>
        </div>

        {/* Fault Injection Panel */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
          <span className="text-slate-400 block mb-2 text-[11px]">ANOMALİ & ARIZA ENJEKSİYONU</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onInjectAnomaly('THERMAL_RUNAWAY')}
              className="px-2 py-1.5 rounded bg-slate-800/80 hover:bg-rose-950/50 border border-slate-700/80 hover:border-rose-400/40 text-slate-300 hover:text-rose-200 transition-colors text-left text-[11px] cursor-pointer"
            >
              🔥 Termal Kaçak (&gt;75°C)
            </button>
            <button
              onClick={() => onInjectAnomaly('PRESSURE_DROP')}
              className="px-2 py-1.5 rounded bg-slate-800/80 hover:bg-amber-950/50 border border-slate-700/80 hover:border-amber-400/40 text-slate-300 hover:text-amber-200 transition-colors text-left text-[11px] cursor-pointer"
            >
              📉 İtki Kaybı (&lt;90 bar)
            </button>
            <button
              onClick={() => onInjectAnomaly('VOLTAGE_SAG')}
              className="px-2 py-1.5 rounded bg-slate-800/80 hover:bg-purple-950/50 border border-slate-700/80 hover:border-purple-400/40 text-slate-300 hover:text-purple-200 transition-colors text-left text-[11px] cursor-pointer"
            >
              ⚡ Düşük Voltaj (&lt;24V)
            </button>
            <button
              onClick={() => onInjectAnomaly('PROPAGATION_BLACKOUT')}
              className="px-2 py-1.5 rounded bg-slate-800/80 hover:bg-rose-950/50 border border-slate-700/80 hover:border-rose-400/40 text-slate-300 hover:text-rose-200 transition-colors text-left text-[11px] cursor-pointer"
            >
              📡 Sinyal Kaybı (LOS)
            </button>
            <button
              onClick={() => onInjectAnomaly('CORRUPTED_PACKET')}
              className="px-2 py-1.5 rounded bg-slate-800/80 hover:bg-amber-950/50 border border-slate-700/80 hover:border-amber-400/40 text-slate-300 hover:text-amber-200 transition-colors text-left text-[11px] cursor-pointer"
            >
              🎲 Bit-Flip (CRC32)
            </button>
            <button
              onClick={() => onClearAnomaly()}
              className="px-2 py-1.5 rounded bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 transition-colors text-left text-[11px] cursor-pointer font-semibold"
            >
              ✅ Tüm Arızaları Temizle
            </button>
          </div>
        </div>

        {/* Two-Man Rule Emergency Abort */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 block text-[11px]">TWO-MAN RULE UPLINK</span>
              {armedToken ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 animate-pulse flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> SİLAHSIZLANDIRMA: {armCountdown}s
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> KİLİTLİ
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mb-2">
              Kritik uçuş manevraları için iki adımlı güvenlik doğrulaması (Arm &amp; Fire).
            </p>
          </div>

          {!armedToken ? (
            <button
              onClick={handleArmAbort}
              className="w-full py-2 rounded bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-400/40 text-slate-300 hover:text-rose-200 transition-colors flex items-center justify-center gap-2 cursor-pointer font-semibold"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>ACİL DURUM İPTALİNİ SİLAHLANDIR (ARM ABORT)</span>
            </button>
          ) : (
            <button
              onClick={handleFireAbort}
              className="w-full py-2 rounded bg-rose-800 hover:bg-rose-700 border border-rose-600 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer font-bold animate-pulse shadow-lg"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>ONAYLA &amp; FIRLAT (CONFIRM FIRE ABORT)</span>
            </button>
          )}

          {feedbackMsg && (
            <span className="text-[10px] text-slate-400 mt-1 block truncate">
              {feedbackMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

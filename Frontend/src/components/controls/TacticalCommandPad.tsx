import React, { useState } from 'react';
import {
  Sliders,
  AlertOctagon,
  ShieldAlert,
  FileSpreadsheet,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  TrendingDown,
  Zap,
  Radio,
  Dice5,
  RotateCcw,
} from 'lucide-react';
import type { CommandResult } from '../../hooks/useTelemetryStream';
import { useLanguage } from '../../i18n/LanguageContext';

interface TacticalCommandPadProps {
  currentMode: 'LIVE_SIMULATION' | 'CSV_REPLAY';
  isConnected: boolean;
  isLOS: boolean;
  onSwitchMode: (mode: 'LIVE_SIMULATION' | 'CSV_REPLAY') => Promise<CommandResult>;
  onRestartReplay?: () => Promise<CommandResult>;
  onSetRate: (hz: number) => Promise<CommandResult>;
  onInjectAnomaly: (type: string) => Promise<CommandResult>;
  onClearAnomaly: (type?: string) => Promise<CommandResult>;
  onArmCommand: (cmd: string) => Promise<any>;
  onFireCommand: (req: any) => Promise<any>;
}

export const TacticalCommandPad: React.FC<TacticalCommandPadProps> = ({
  currentMode,
  isConnected,
  isLOS,
  onSwitchMode,
  onRestartReplay,
  onSetRate,
  onInjectAnomaly,
  onClearAnomaly,
  onArmCommand,
  onFireCommand,
}) => {
  const { t, language } = useLanguage();
  const [selectedRate, setSelectedRate] = useState<number>(10);
  const [armedToken, setArmedToken] = useState<string | null>(null);
  const [armCountdown, setArmCountdown] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeAnomaly, setActiveAnomaly] = useState<string | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const handleArmAbort = async () => {
    if (!isConnected) {
      showFeedback(
        language === 'tr'
          ? 'Hata: Yer İstasyonu sunucusuna bağlanılamadı. Lütfen Backend/run.py dosyasını çalıştırın.'
          : 'Error: Cannot connect to Backend server. Please ensure Backend/run.py is running.',
        'error'
      );
      return;
    }
    const res = await onArmCommand('EMERGENCY_ABORT');
    if (res && res.armed_token) {
      setArmedToken(res.armed_token);
      setArmCountdown(30);
      showFeedback(
        language === 'tr'
          ? `SİSTEM ETKİNLEŞTİRİLDİ (Onay Kodu: ${res.armed_token})`
          : `SYSTEM ARMED (Confirmation Token: ${res.armed_token})`,
        'error'
      );

      const timer = setInterval(() => {
        setArmCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setArmedToken(null);
            showFeedback(
              language === 'tr'
                ? 'Doğrulama süresi doldu. Sistem güvenliğe alındı.'
                : 'Arm window timed out. System auto-locked.',
              'info'
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      showFeedback(
        language === 'tr' ? 'Komut gönderilemedi. Sunucu hatası.' : 'Failed to send arm command. Server error.',
        'error'
      );
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
    if (res && res.status === 'EXECUTED') {
      showFeedback(
        res.message ||
          (language === 'tr'
            ? 'ACİL DURUM İPTAL MANEVRASI GERÇEKLEŞTİRİLDİ.'
            : 'EMERGENCY ABORT MANEUVER EXECUTED.'),
        'success'
      );
    } else {
      showFeedback(
        language === 'tr' ? 'Fırlatma onayı başarısız veya reddedildi.' : 'Execution failed or rejected.',
        'error'
      );
    }
  };

  const handleRateChange = async (hz: number) => {
    setSelectedRate(hz);
    const res = await onSetRate(hz);
    showFeedback(res.message, res.success ? 'success' : 'error');
  };

  const handleModeChange = async (mode: 'LIVE_SIMULATION' | 'CSV_REPLAY') => {
    const res = await onSwitchMode(mode);
    showFeedback(res.message, res.success ? 'success' : 'error');
  };

  const handleRestart = async () => {
    if (onRestartReplay) {
      const res = await onRestartReplay();
      showFeedback(res.message, res.success ? 'success' : 'error');
    }
  };

  const handleInject = async (type: string, descTr: string, descEn: string) => {
    setActiveAnomaly(type);
    const res = await onInjectAnomaly(type);
    if (res.success) {
      showFeedback(
        language === 'tr' ? `[ANOMALİ DEVREDE] ${descTr}` : `[FAULT INJECTED] ${descEn}`,
        'error'
      );
    } else {
      showFeedback(res.message, 'error');
    }
  };

  const handleClear = async () => {
    setActiveAnomaly(null);
    const res = await onClearAnomaly();
    if (res.success) {
      showFeedback(
        language === 'tr'
          ? 'Tüm anomaliler temizlendi. Sistem normale dönüyor.'
          : 'All anomalies cleared. Systems returning to nominal.',
        'success'
      );
    } else {
      showFeedback(res.message, 'error');
    }
  };

  return (
    <div className="mcc-panel p-4 mt-4 border-t border-slate-800">
      {/* Offline Status Warning Bar */}
      {!isConnected && (
        <div className="mb-3 px-3 py-2 rounded bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono-numbers flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>
              <strong>{language === 'tr' ? 'DİKKAT:' : 'WARNING:'}</strong> {t.commands.offlineWarning}{' '}
              {language === 'tr'
                ? 'Komutların çalışması için Backend terminalden başlatılmalıdır.'
                : 'Start the Backend server via terminal for controls to respond.'}
            </span>
          </div>
          <span className="text-[11px] underline">python run.py</span>
        </div>
      )}

      {/* Top Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-300" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {t.commands.title}
          </h2>
        </div>

        {/* Source Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono-numbers">
          <button
            onClick={() => handleModeChange('LIVE_SIMULATION')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors ${
              currentMode === 'LIVE_SIMULATION'
                ? 'bg-sky-900/60 text-sky-200 border border-sky-600/50 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.commands.liveSim}
          </button>
          <button
            onClick={() => handleModeChange('CSV_REPLAY')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
              currentMode === 'CSV_REPLAY'
                ? 'bg-purple-900/60 text-purple-200 border border-purple-600/50 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {t.commands.csvReplay}
          </button>
          {currentMode === 'CSV_REPLAY' && onRestartReplay && (
            <button
              onClick={handleRestart}
              title={t.commands.restartReplay}
              className="px-2 py-1 rounded cursor-pointer transition-colors bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 flex items-center gap-1 border border-slate-700"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.commands.restartReplay}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Interactive Toast / Status Notification */}
      {feedback && (
        <div
          className={`mb-3 px-3 py-2 rounded text-xs font-mono-numbers flex items-center gap-2 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/60 border border-rose-500/50 text-rose-200'
              : 'bg-sky-950/60 border border-sky-500/50 text-sky-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-numbers">
        {/* Stream Frequency Controls */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 block mb-2 text-[11px] uppercase tracking-wider">
              {t.commands.streamFrequency}
            </span>
            <div className="flex gap-2">
              {[5, 10, 20, 50].map((hz) => (
                <button
                  key={hz}
                  onClick={() => handleRateChange(hz)}
                  className={`flex-1 py-1.5 rounded cursor-pointer transition-all border ${
                    selectedRate === hz
                      ? 'bg-sky-950/80 border-sky-400 text-sky-200 font-bold shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {hz} Hz
                </button>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            {selectedRate === 50 ? `⚡ ${t.commands.hz50Note}` : `🛰️ ${t.commands.hzNote}`}
          </span>
        </div>

        {/* Fault Injection Panel */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
          <span className="text-slate-400 block mb-2 text-[11px] uppercase tracking-wider">
            {t.commands.anomalyTitle}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() =>
                handleInject(
                  'THERMAL_RUNAWAY',
                  'Termal kaçak (>75°C) tetiklendi.',
                  'Thermal runaway (>75°C) triggered.'
                )
              }
              className={`px-2 py-1.5 rounded transition-all text-left text-[11px] cursor-pointer flex items-center gap-1.5 border ${
                activeAnomaly === 'THERMAL_RUNAWAY'
                  ? 'bg-rose-950 text-rose-200 border-rose-400 font-semibold animate-pulse'
                  : 'bg-slate-800/80 hover:bg-rose-950/40 border-slate-700/80 text-slate-300 hover:text-rose-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{t.commands.thermalRunaway}</span>
            </button>

            <button
              onClick={() =>
                handleInject(
                  'PRESSURE_DROP',
                  'Yanma odası basınç kaybı (<90 bar) tetiklendi.',
                  'Chamber pressure loss (<90 bar) triggered.'
                )
              }
              className={`px-2 py-1.5 rounded transition-all text-left text-[11px] cursor-pointer flex items-center gap-1.5 border ${
                activeAnomaly === 'PRESSURE_DROP'
                  ? 'bg-amber-950 text-amber-200 border-amber-400 font-semibold animate-pulse'
                  : 'bg-slate-800/80 hover:bg-amber-950/40 border-slate-700/80 text-slate-300 hover:text-amber-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t.commands.pressureDrop}</span>
            </button>

            <button
              onClick={() =>
                handleInject(
                  'VOLTAGE_SAG',
                  'Ana bara düşük gerilim (<24V) tetiklendi.',
                  'Main bus voltage sag (<24V) triggered.'
                )
              }
              className={`px-2 py-1.5 rounded transition-all text-left text-[11px] cursor-pointer flex items-center gap-1.5 border ${
                activeAnomaly === 'VOLTAGE_SAG'
                  ? 'bg-purple-950 text-purple-200 border-purple-400 font-semibold animate-pulse'
                  : 'bg-slate-800/80 hover:bg-purple-950/40 border-slate-700/80 text-slate-300 hover:text-purple-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{t.commands.voltageSag}</span>
            </button>

            <button
              onClick={() =>
                handleInject(
                  'PROPAGATION_BLACKOUT',
                  'Sinyal kaybı (LOS) başlatıldı.',
                  'Signal loss (LOS) initiated.'
                )
              }
              className={`px-2 py-1.5 rounded transition-all text-left text-[11px] cursor-pointer flex items-center gap-1.5 border ${
                activeAnomaly === 'PROPAGATION_BLACKOUT' || isLOS
                  ? 'bg-rose-950 text-rose-200 border-rose-400 font-semibold animate-pulse'
                  : 'bg-slate-800/80 hover:bg-rose-950/40 border-slate-700/80 text-slate-300 hover:text-rose-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{t.commands.propagationBlackout}</span>
            </button>

            <button
              onClick={() =>
                handleInject(
                  'CORRUPTED_PACKET',
                  'CRC32 bit hatası enjekte edildi.',
                  'CRC32 bit error injected.'
                )
              }
              className={`px-2 py-1.5 rounded transition-all text-left text-[11px] cursor-pointer flex items-center gap-1.5 border ${
                activeAnomaly === 'CORRUPTED_PACKET'
                  ? 'bg-amber-950 text-amber-200 border-amber-400 font-semibold'
                  : 'bg-slate-800/80 hover:bg-amber-950/40 border-slate-700/80 text-slate-300 hover:text-amber-200'
              }`}
            >
              <Dice5 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t.commands.corruptedPacket}</span>
            </button>

            <button
              onClick={handleClear}
              className="px-2 py-1.5 rounded bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 transition-colors text-left text-[11px] cursor-pointer font-semibold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{t.commands.clearAll}</span>
            </button>
          </div>
        </div>

        {/* Two-Man Rule Emergency Abort */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider">
                {t.commands.twoManRule}
              </span>
              {armedToken ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 animate-pulse flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> {t.commands.disarmIn} {armCountdown}s
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {t.commands.locked}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mb-2">
              {t.commands.twoManDesc}
            </p>
          </div>

          {!armedToken ? (
            <button
              onClick={handleArmAbort}
              className="w-full py-2 rounded bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-400/40 text-slate-300 hover:text-rose-200 transition-colors flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-sm"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>{t.commands.armAbort}</span>
            </button>
          ) : (
            <button
              onClick={handleFireAbort}
              className="w-full py-2 rounded bg-rose-800 hover:bg-rose-700 border border-rose-600 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer font-bold animate-pulse shadow-lg"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{t.commands.fireAbort}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


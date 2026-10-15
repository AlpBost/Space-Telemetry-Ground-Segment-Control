import React from 'react';
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  BellOff,
  Flame,
  TrendingDown,
  Zap,
  Radio,
  Dice5,
  RotateCcw,
  Sliders,
  Activity,
} from 'lucide-react';
import type { TelemetryPacket } from '../../types/telemetry';
import type { CommandResult } from '../../hooks/useTelemetryStream';
import { useLanguage } from '../../i18n/LanguageContext';

interface FDIREngineViewProps {
  packet: TelemetryPacket | null;
  onAcknowledge: (alarmId: string) => Promise<CommandResult>;
  onInjectAnomaly: (type: string) => Promise<CommandResult>;
  onClearAnomaly: (type?: string) => Promise<CommandResult>;
}

export const FDIREngineView: React.FC<FDIREngineViewProps> = ({
  packet,
  onAcknowledge,
  onInjectAnomaly,
  onClearAnomaly,
}) => {
  const { t, language } = useLanguage();
  const alarms = packet?.fdir.active_alarms || [];
  const solarTemp = packet?.thermal.solar_array_temp_c ?? 52.0;
  const chamberPress = packet?.propulsion.chamber_pressure_bar ?? 125.0;
  const busVolt = packet?.electrical.bus_voltage_v ?? 28.2;
  const cycles = packet?.fdir.fdir_cycles_evaluated ?? 0;

  const isSolarAlarming = alarms.some((a) => a.parameter === 'solar_array_temp_c');
  const isPressAlarming = alarms.some((a) => a.parameter === 'chamber_pressure_bar');
  const isVoltAlarming = alarms.some((a) => a.parameter === 'bus_voltage_v');

  return (
    <div className="space-y-4 font-mono-numbers">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
            {t.fdir.title}
          </h2>
          <p className="text-xs text-slate-400">
            {t.fdir.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">{t.fdir.evaluatorCycles}</span>
          <span className="font-bold text-sky-300">{cycles.toLocaleString()}</span>
        </div>
      </div>

      {/* 1. Schmidt Trigger Engineering Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Solar Panel Thermal Hysteresis */}
        <div className="mcc-panel p-4 flex flex-col justify-between border-t-2 border-t-amber-400">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                {t.fdir.thermalCard}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  isSolarAlarming
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isSolarAlarming ? t.fdir.alarmActive : t.fdir.alarmNominal}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">{t.fdir.thermalDesc}</p>

            {/* Visual Gauge Bar */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0°C</span>
                <span className="text-emerald-400">71.5°C</span>
                <span className="text-rose-400">75.0°C</span>
                <span>100°C</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-amber-500/30 border-x border-amber-400/50"
                  style={{ left: '71.5%', width: '3.5%' }}
                  title="Hysteresis Deadband (71.5°C - 75.0°C)"
                />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    solarTemp >= 75.0 ? 'bg-rose-500' : isSolarAlarming ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, solarTemp))}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">{t.fdir.currentTemp}</span>
              <span
                className={`text-base font-bold ${
                  solarTemp >= 75.0 ? 'text-rose-400' : isSolarAlarming ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {solarTemp.toFixed(1)} °C
              </span>
            </div>
          </div>

          <div className="mt-3 p-2 rounded bg-slate-900/50 border border-slate-800/80 text-[10px] text-slate-400">
            {t.fdir.thermalChattering}
          </div>
        </div>

        {/* Card 2: Chamber Pressure Loss Hysteresis */}
        <div className="mcc-panel p-4 flex flex-col justify-between border-t-2 border-t-sky-400">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-200 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-sky-400" />
                {t.fdir.pressureCard}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  isPressAlarming
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isPressAlarming ? t.mfd.propulsion.lowPressure : t.fdir.alarmNominal}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">{t.fdir.pressureDesc}</p>

            {/* Visual Gauge Bar */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 bar</span>
                <span className="text-rose-400">90 bar</span>
                <span className="text-emerald-400">95 bar</span>
                <span>150 bar</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-sky-500/30 border-x border-sky-400/50"
                  style={{ left: '60%', width: '3.3%' }}
                  title="Hysteresis Deadband (90 - 95 bar)"
                />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    chamberPress < 90.0 && chamberPress > 0 ? 'bg-rose-500' : 'bg-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, (chamberPress / 150) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">{t.fdir.currentPress}</span>
              <span className="text-base font-bold text-sky-200">
                {chamberPress.toFixed(1)} bar
              </span>
            </div>
          </div>

          <div className="mt-3 p-2 rounded bg-slate-900/50 border border-slate-800/80 text-[10px] text-slate-400">
            {t.fdir.pressureNote}
          </div>
        </div>

        {/* Card 3: Bus Voltage Sag Hysteresis */}
        <div className="mcc-panel p-4 flex flex-col justify-between border-t-2 border-t-purple-400">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                {t.fdir.voltageCard}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  isVoltAlarming
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isVoltAlarming ? t.mfd.electrical.underVoltageAlarm : t.mfd.electrical.nominal}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">{t.fdir.voltageDesc}</p>

            {/* Visual Gauge Bar */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>18 V</span>
                <span className="text-rose-400">24 V</span>
                <span className="text-emerald-400">25 V</span>
                <span>32 V</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-purple-500/30 border-x border-purple-400/50"
                  style={{ left: '42.8%', width: '7.1%' }}
                  title="Hysteresis Deadband (24V - 25V)"
                />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    busVolt < 24.0 ? 'bg-rose-500' : 'bg-purple-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, ((busVolt - 18) / 14) * 100))}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">{t.fdir.currentVolt}</span>
              <span className="text-base font-bold text-purple-200">
                {busVolt.toFixed(1)} V
              </span>
            </div>
          </div>

          <div className="mt-3 p-2 rounded bg-slate-900/50 border border-slate-800/80 text-[10px] text-slate-400">
            {t.fdir.voltageNote}
          </div>
        </div>
      </div>

      {/* 2. Active Alarms Queue (Operator Desk) */}
      <div className="mcc-panel p-4">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              {t.fdir.queueTitle}
            </h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {t.fdir.totalActive} {alarms.length} {t.fdir.activeAlarmCount}
          </span>
        </div>

        {alarms.length === 0 ? (
          <div className="py-8 text-center bg-slate-900/40 rounded border border-slate-800 text-slate-400 text-xs">
            <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <span className="text-slate-200 font-semibold block">{t.fdir.allNominal}</span>
            <span className="text-[11px] text-slate-500">
              {t.fdir.allNominalDesc}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {alarms.map((alarm) => (
              <div
                key={alarm.alarm_id}
                className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
                  alarm.severity === 'CRITICAL'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100">
                        {alarm.alarm_id}
                      </span>
                      <span className="text-xs uppercase font-semibold">[{alarm.subsystem}]</span>
                      <span className="text-xs font-bold text-white">&bull; {alarm.parameter}</span>
                    </div>
                    <p className="text-xs mt-1 text-slate-200">
                      {alarm.message} &bull; {language === 'tr' ? 'Güncel' : 'Current'}:{' '}
                      <strong>
                        {alarm.current_value} {alarm.unit}
                      </strong>{' '}
                      ({language === 'tr' ? 'Eşik' : 'Threshold'}: {alarm.threshold_value} {alarm.unit})
                    </p>
                  </div>
                </div>

                <div>
                  {alarm.acknowledged ? (
                    <span className="px-3 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> {t.fdir.acknowledged}
                    </span>
                  ) : (
                    <button
                      onClick={() => onAcknowledge(alarm.alarm_id)}
                      className="px-3 py-1.5 rounded bg-rose-800 hover:bg-rose-700 border border-rose-600 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <BellOff className="w-3.5 h-3.5" /> {t.fdir.ackBtn}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Fault Injection Test-Bed (Test Düzenegi) */}
      <div className="mcc-panel p-4">
        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-800">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {t.fdir.rigTitle}
          </h3>
        </div>

        <p className="text-xs text-slate-400 mb-3">{t.fdir.rigDesc}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <button
            onClick={() => onInjectAnomaly('THERMAL_RUNAWAY')}
            className="p-2.5 rounded bg-slate-800/80 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/50 text-slate-200 hover:text-rose-200 text-left cursor-pointer transition-all flex flex-col justify-between gap-2"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span className="font-semibold block">{t.commands.thermalRunaway}</span>
            <span className="text-[10px] text-slate-400">&gt; 75.0°C</span>
          </button>

          <button
            onClick={() => onInjectAnomaly('PRESSURE_DROP')}
            className="p-2.5 rounded bg-slate-800/80 hover:bg-amber-950/50 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-200 text-left cursor-pointer transition-all flex flex-col justify-between gap-2"
          >
            <TrendingDown className="w-4 h-4 text-amber-400" />
            <span className="font-semibold block">{t.commands.pressureDrop}</span>
            <span className="text-[10px] text-slate-400">&lt; 90.0 bar</span>
          </button>

          <button
            onClick={() => onInjectAnomaly('VOLTAGE_SAG')}
            className="p-2.5 rounded bg-slate-800/80 hover:bg-purple-950/50 border border-slate-700 hover:border-purple-500/50 text-slate-200 hover:text-purple-200 text-left cursor-pointer transition-all flex flex-col justify-between gap-2"
          >
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="font-semibold block">{t.commands.voltageSag}</span>
            <span className="text-[10px] text-slate-400">&lt; 24.0 V</span>
          </button>

          <button
            onClick={() => onInjectAnomaly('PROPAGATION_BLACKOUT')}
            className="p-2.5 rounded bg-slate-800/80 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/50 text-slate-200 hover:text-rose-200 text-left cursor-pointer transition-all flex flex-col justify-between gap-2"
          >
            <Radio className="w-4 h-4 text-rose-400" />
            <span className="font-semibold block">{t.commands.propagationBlackout}</span>
            <span className="text-[10px] text-slate-400">LOS</span>
          </button>

          <button
            onClick={() => onInjectAnomaly('CORRUPTED_PACKET')}
            className="p-2.5 rounded bg-slate-800/80 hover:bg-amber-950/50 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-200 text-left cursor-pointer transition-all flex flex-col justify-between gap-2"
          >
            <Dice5 className="w-4 h-4 text-amber-400" />
            <span className="font-semibold block">{t.commands.corruptedPacket}</span>
            <span className="text-[10px] text-slate-400">CRC32 SEU</span>
          </button>

          <button
            onClick={() => onClearAnomaly()}
            className="p-2.5 rounded bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/50 text-emerald-200 text-left cursor-pointer transition-all flex flex-col justify-between gap-2 font-bold shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span>{t.commands.clearAll}</span>
            <span className="text-[10px] text-emerald-400/80">{t.fdir.alarmNominal}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

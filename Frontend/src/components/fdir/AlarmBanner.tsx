import React from 'react';
import { AlertCircle, CheckCircle, BellOff } from 'lucide-react';
import type { ActiveAlarm } from '../../types/telemetry';
import { useLanguage } from '../../i18n/LanguageContext';

interface AlarmBannerProps {
  alarms: ActiveAlarm[];
  onAcknowledge: (alarmId: string) => void;
}

export const AlarmBanner: React.FC<AlarmBannerProps> = ({ alarms, onAcknowledge }) => {
  const { t, language } = useLanguage();

  if (alarms.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {alarms.map((alarm) => {
        const isCritical = alarm.severity === 'CRITICAL';
        return (
          <div
            key={alarm.alarm_id}
            className={`px-4 py-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 transition-all ${
              isCritical
                ? 'bg-rose-950/40 border-rose-400/40 text-rose-200'
                : 'bg-amber-950/40 border-amber-300/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-md ${
                  isCritical ? 'bg-rose-900/60 text-rose-300' : 'bg-amber-900/60 text-amber-300'
                }`}
              >
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-numbers px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-200 font-semibold">
                    {alarm.alarm_id}
                  </span>
                  <span className="text-xs font-mono-numbers font-semibold uppercase tracking-wider">
                    [{alarm.subsystem}] &bull; {alarm.parameter}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono-numbers ${
                      isCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {isCritical ? t.common.critical : t.common.warning}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-mono-numbers">
                  {alarm.message} &bull; {language === 'tr' ? 'Güncel Değer' : 'Current Value'}:{' '}
                  <span className="font-semibold text-white">
                    {alarm.current_value} {alarm.unit}
                  </span>{' '}
                  &bull; {language === 'tr' ? 'Eşik' : 'Threshold'}: {alarm.threshold_value} {alarm.unit}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  🛡️{' '}
                  <span className="text-slate-300">
                    {language === 'tr'
                      ? 'Schmidt Trigger Histeresis Koruması:'
                      : 'Schmidt Trigger Hysteresis Active:'}
                  </span>{' '}
                  {language === 'tr'
                    ? 'Değer güvenli tolerans sınırına inene kadar alarm aktif tutulacaktır.'
                    : 'Alarm flag remains raised until value returns safely within the deadband margin.'}
                </p>
              </div>
            </div>

            {/* Acknowledge Button */}
            <div className="flex items-center gap-2">
              {alarm.acknowledged ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-mono-numbers">
                  <CheckCircle className="w-4 h-4" />
                  <span>{t.fdir.acknowledged}</span>
                </div>
              ) : (
                <button
                  onClick={() => onAcknowledge(alarm.alarm_id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono-numbers flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${
                    isCritical
                      ? 'bg-rose-800 hover:bg-rose-700 text-white border border-rose-600'
                      : 'bg-amber-800 hover:bg-amber-700 text-white border border-amber-600'
                  }`}
                >
                  <BellOff className="w-3.5 h-3.5" />
                  <span>{t.fdir.ackBtn}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

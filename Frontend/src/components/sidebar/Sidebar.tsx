import React from 'react';
import {
  Activity,
  Flame,
  ShieldAlert,
  Binary,
  ChevronLeft,
  ChevronRight,
  Radio,
  Satellite,
  Wifi,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export type NavTab = 'telemetry' | 'pid' | 'fdir' | 'packets';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isConnected: boolean;
  isLOS: boolean;
  activeAlarmCount: number;
  flightPhase: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  isConnected,
  isLOS,
  activeAlarmCount,
  flightPhase,
}) => {
  const { t, language, setLanguage, toggleLanguage } = useLanguage();

  const navItems = [
    {
      id: 'telemetry' as NavTab,
      label: t.nav.telemetry,
      subtitle: t.nav.telemetrySub,
      icon: Activity,
      badge: null,
    },
    {
      id: 'pid' as NavTab,
      label: t.nav.pid,
      subtitle: t.nav.pidSub,
      icon: Flame,
      badge: null,
    },
    {
      id: 'fdir' as NavTab,
      label: t.nav.fdir,
      subtitle: t.nav.fdirSub,
      icon: ShieldAlert,
      badge: activeAlarmCount > 0 ? activeAlarmCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'packets' as NavTab,
      label: t.nav.packets,
      subtitle: t.nav.packetsSub,
      icon: Binary,
      badge: null,
    },
  ];

  const phaseLabel = (t.phases as Record<string, string>)[flightPhase] || flightPhase;

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#090d16] border-r border-slate-800 flex flex-col justify-between transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Header & Brand */}
      <div>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-500/40 text-sky-400 shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <Satellite className="w-5 h-5 animate-pulse" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <span className="text-xs font-bold tracking-widest text-slate-100 uppercase block font-mono-numbers">
                  MCC // GROUND
                </span>
                <span className="text-[10px] text-sky-400 font-mono-numbers tracking-wider block">
                  {t.common.satelliteName}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand Menu' : 'Collapse Menu'}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-left relative ${
                  isActive
                    ? 'bg-sky-950/60 text-sky-200 border border-sky-500/40 shadow-[0_0_12px_rgba(14,165,233,0.15)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-sky-400' : 'text-slate-400'
                  }`}
                />

                {!collapsed && (
                  <div className="flex-1 overflow-hidden">
                    <span className="text-xs block truncate leading-tight">{item.label}</span>
                    <span className="text-[10px] block truncate text-slate-500 leading-tight">
                      {item.subtitle}
                    </span>
                  </div>
                )}

                {item.badge !== null && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-numbers font-bold shrink-0 ${
                      item.badgeColor || 'bg-slate-700 text-white'
                    } ${collapsed ? 'absolute top-1.5 right-1.5' : ''}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Language Switcher & Mission Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        {!collapsed ? (
          <div className="space-y-2.5 text-[11px] font-mono-numbers">
            {/* Language Switcher Pill */}
            <div className="p-1 bg-slate-900/90 border border-slate-800/80 rounded-lg flex items-center justify-between shadow-inner">
              <span className="flex items-center gap-1.5 text-slate-400 pl-1.5 text-[11px]">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'tr' ? 'Dil' : 'Lang'}</span>
              </span>
              <div className="flex items-center bg-slate-950/80 p-0.5 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLanguage('tr')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                    language === 'tr'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TR
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Link Status */}
            <div className="flex items-center justify-between text-slate-400 pt-0.5">
              <span className="flex items-center gap-1.5">
                <Wifi className={`w-3.5 h-3.5 ${isConnected && !isLOS ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span>{t.common.linkStatus}</span>
              </span>
              <span
                className={`font-semibold ${
                  isConnected && !isLOS ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isConnected && !isLOS ? t.common.aosLock : t.common.losDown}
              </span>
            </div>

            {/* Flight Phase */}
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.common.phase}</span>
              </span>
              <span className="text-slate-200 font-semibold truncate max-w-[110px]" title={phaseLabel}>
                {phaseLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            {/* Collapsed Language Toggle Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              title={`Dil / Language: ${language.toUpperCase()} (Tıkla ve Değiştir)`}
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-sky-400 text-sky-300 hover:text-white flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer shadow-sm font-mono-numbers"
            >
              {language.toUpperCase()}
            </button>

            {/* Online / Offline Dot Indicator */}
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected && !isLOS ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400'
              }`}
              title={isConnected && !isLOS ? t.common.aosLock : t.common.losDown}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

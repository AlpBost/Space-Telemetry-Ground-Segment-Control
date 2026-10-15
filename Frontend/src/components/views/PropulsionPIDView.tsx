import React from 'react';
import {
  Flame,
  Gauge,
  Thermometer,
  AlertTriangle,
  XCircle,
  Layers,
} from 'lucide-react';
import type { TelemetryPacket } from '../../types/telemetry';
import { useLanguage } from '../../i18n/LanguageContext';

interface PropulsionPIDViewProps {
  packet: TelemetryPacket | null;
}

export const PropulsionPIDView: React.FC<PropulsionPIDViewProps> = ({ packet }) => {
  const { t } = useLanguage();
  const propulsion = packet?.propulsion;
  const chamberPress = propulsion?.chamber_pressure_bar ?? 125.0;
  const feedlinePress = propulsion?.feedline_pressure_bar ?? 148.0;
  const thrustKn = propulsion?.thrust_kn ?? 220.0;
  const throttlePct = propulsion?.throttle_pct ?? 100.0;
  const fuelRemaining = propulsion?.fuel_remaining_pct ?? 84.0;
  const propTemp = propulsion?.propellant_temp_c ?? -183.0;
  const engineState = propulsion?.engine_state || 'ARMED_BURNING';

  const isBurning = thrustKn > 0;
  const isLowPressure = chamberPress < 90.0 && chamberPress > 0;

  // Dynamic Valve States
  const mfvOpen = isBurning; // Main Fuel Valve
  const movOpen = isBurning; // Main Oxidizer Valve
  const hpvOpen = isBurning; // Helium Pressurization Valve

  return (
    <div className="space-y-4 font-mono-numbers">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
            {t.pid.title}
          </h2>
          <p className="text-xs text-slate-400">
            {t.pid.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1 rounded font-bold border flex items-center gap-1.5 ${
              isBurning
                ? isLowPressure
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isBurning ? (
              isLowPressure ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              )
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>
              {t.pid.systemStatus} {engineState}
            </span>
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive P&ID SVG Schematic + Telemetry Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Interactive SVG Diagram */}
        <div className="lg:col-span-2 mcc-panel p-5 relative overflow-hidden bg-[#070b12]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              {t.pid.diagramTitle}
            </span>
            <span className="text-[10px] text-slate-500">{t.pid.standardNorm}</span>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="relative w-full max-w-[760px] mx-auto py-2">
            <svg
              viewBox="0 0 800 480"
              className="w-full h-auto drop-shadow-md select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Fire Plume Gradient */}
                <linearGradient id="plumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
                  <stop offset="30%" stopColor="#fb923c" stopOpacity="0.85" />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
                </linearGradient>

                {/* LOX Cyan Fluid Gradient */}
                <linearGradient id="loxGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
                </linearGradient>

                {/* RP-1 Amber Fluid Gradient */}
                <linearGradient id="fuelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* ----------------- PIPES (BACKGROUND) ----------------- */}
              {/* Helium Line to Tanks */}
              <path
                d="M 400 65 L 400 95 L 200 95 L 200 130 M 400 95 L 600 95 L 600 130"
                fill="none"
                stroke={hpvOpen ? '#38bdf8' : '#334155'}
                strokeWidth="3"
                strokeDasharray={hpvOpen ? '6,4' : 'none'}
              />

              {/* LOX Pipe to Turbopump */}
              <path
                d="M 200 240 L 200 310 L 360 310"
                fill="none"
                stroke={movOpen ? '#0284c7' : '#334155'}
                strokeWidth="5"
              />

              {/* Fuel Pipe to Turbopump */}
              <path
                d="M 600 240 L 600 310 L 440 310"
                fill="none"
                stroke={mfvOpen ? '#d97706' : '#334155'}
                strokeWidth="5"
              />

              {/* High Pressure Feedlines from Turbopump to Combustion Chamber */}
              <path
                d="M 380 340 L 380 375 L 400 375 L 400 395"
                fill="none"
                stroke={isBurning ? '#38bdf8' : '#334155'}
                strokeWidth="4"
              />
              <path
                d="M 420 340 L 420 375 L 400 375"
                fill="none"
                stroke={isBurning ? '#f59e0b' : '#334155'}
                strokeWidth="4"
              />

              {/* ----------------- TANKS ----------------- */}
              {/* 1. Helium Pressurization Tank (Top Center) */}
              <g transform="translate(350, 15)">
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="50"
                  rx="25"
                  fill="#0f172a"
                  stroke="#64748b"
                  strokeWidth="2"
                />
                <text x="50" y="24" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                  {t.pid.heliumTank}
                </text>
                <text x="50" y="38" fill="#38bdf8" fontSize="11" textAnchor="middle" fontWeight="bold">
                  310 bar
                </text>
              </g>

              {/* 2. Liquid Oxygen (LOX) Tank (Left) */}
              <g transform="translate(130, 130)">
                <rect
                  x="0"
                  y="0"
                  width="140"
                  height="110"
                  rx="10"
                  fill="#0f172a"
                  stroke="#0284c7"
                  strokeWidth="2"
                />
                {/* Fluid level */}
                <rect
                  x="4"
                  y={4 + (1 - fuelRemaining / 100) * 102}
                  width="132"
                  height={(fuelRemaining / 100) * 102}
                  rx="6"
                  fill="url(#loxGradient)"
                  className="transition-all duration-300"
                />
                <text x="70" y="24" fill="#ffffff" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {t.pid.loxTank}
                </text>
                <text x="70" y="42" fill="#bae6fd" fontSize="10" textAnchor="middle">
                  {t.pid.tempLabel} {propTemp.toFixed(1)}°C
                </text>
                <text x="70" y="60" fill="#ffffff" fontSize="12" textAnchor="middle" fontWeight="bold">
                  {fuelRemaining.toFixed(0)}% {t.pid.fullLabel}
                </text>
              </g>

              {/* 3. Rocket Fuel Tank (Right) */}
              <g transform="translate(530, 130)">
                <rect
                  x="0"
                  y="0"
                  width="140"
                  height="110"
                  rx="10"
                  fill="#0f172a"
                  stroke="#d97706"
                  strokeWidth="2"
                />
                {/* Fluid level */}
                <rect
                  x="4"
                  y={4 + (1 - fuelRemaining / 100) * 102}
                  width="132"
                  height={(fuelRemaining / 100) * 102}
                  rx="6"
                  fill="url(#fuelGradient)"
                  className="transition-all duration-300"
                />
                <text x="70" y="24" fill="#ffffff" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {t.pid.fuelTank}
                </text>
                <text x="70" y="42" fill="#fde68a" fontSize="10" textAnchor="middle">
                  {t.pid.pressureLabel} 148 bar
                </text>
                <text x="70" y="60" fill="#ffffff" fontSize="12" textAnchor="middle" fontWeight="bold">
                  {fuelRemaining.toFixed(0)}% {t.pid.fullLabel}
                </text>
              </g>

              {/* ----------------- VALVES ----------------- */}
              {/* MOV: Main Oxidizer Valve */}
              <g transform="translate(185, 260)">
                <polygon
                  points="0,0 30,15 0,30 30,0 0,15 30,30"
                  fill={movOpen ? '#10b981' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text x="40" y="20" fill={movOpen ? '#34d399' : '#f87171'} fontSize="10" fontWeight="bold">
                  {t.pid.movLabel} {movOpen ? t.pid.open : t.pid.closed}
                </text>
              </g>

              {/* MFV: Main Fuel Valve */}
              <g transform="translate(585, 260)">
                <polygon
                  points="0,0 30,15 0,30 30,0 0,15 30,30"
                  fill={mfvOpen ? '#10b981' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text x="40" y="20" fill={mfvOpen ? '#34d399' : '#f87171'} fontSize="10" fontWeight="bold">
                  {t.pid.mfvLabel} {mfvOpen ? t.pid.open : t.pid.closed}
                </text>
              </g>

              {/* ----------------- TURBOPUMP ----------------- */}
              <g transform="translate(360, 290)">
                <circle cx="40" cy="25" r="28" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <path
                  d="M 28 25 L 52 25 M 40 13 L 40 37 M 32 17 L 48 33 M 32 33 L 48 17"
                  stroke={isBurning ? '#38bdf8' : '#64748b'}
                  strokeWidth="2.5"
                  className={isBurning ? 'animate-spin origin-[40px_25px]' : ''}
                />
                <text x="40" y="66" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                  {t.pid.turbopump} {isBurning ? '36.500 RPM' : '0 RPM'}
                </text>
              </g>

              {/* ----------------- COMBUSTION CHAMBER & NOZZLE ----------------- */}
              <g transform="translate(350, 385)">
                {/* Thrust Chamber Bell Nozzle */}
                <path
                  d="M 25 0 L 75 0 L 70 25 L 90 65 L 10 65 L 30 25 Z"
                  fill="#1e293b"
                  stroke={isBurning ? (isLowPressure ? '#ef4444' : '#fb923c') : '#475569'}
                  strokeWidth="2.5"
                />
                {/* Chamber Pressure Readout */}
                <text x="50" y="20" fill="#ffffff" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {chamberPress.toFixed(1)} bar
                </text>
                <text x="50" y="34" fill="#94a3b8" fontSize="9" textAnchor="middle">
                  {t.mfd.propulsion.chamberPressure}
                </text>

                {/* Animated Rocket Exhaust Flame Plume */}
                {isBurning && (
                  <polygon
                    points="20,65 50,140 80,65"
                    fill="url(#plumeGradient)"
                    className="animate-pulse origin-top"
                  />
                )}
              </g>
            </svg>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span>{t.pid.legend}</span>
            <span className="text-sky-300 font-semibold">
              {t.pid.feedline} {feedlinePress.toFixed(1)} bar
            </span>
          </div>
        </div>

        {/* Right 1 Col: Propulsion Metrics Cards */}
        <div className="space-y-3 flex flex-col justify-between">
          {/* Card 1: Chamber Pressure Dial */}
          <div className="mcc-panel p-4 border-t-2 border-t-amber-400">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-200 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                {t.pid.chamberPressurePc}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  isLowPressure
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isLowPressure ? t.pid.chamberLow : t.pid.chamberNominal}
              </span>
            </div>

            <div className="text-3xl font-extrabold text-amber-300 my-1">
              {chamberPress.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">bar</span>
            </div>

            <p className="text-[11px] text-slate-400">{t.pid.chamberNote}</p>
          </div>

          {/* Card 2: Thrust Force & Throttle */}
          <div className="mcc-panel p-4 border-t-2 border-t-sky-400">
            <span className="text-xs font-semibold uppercase text-slate-200 block mb-2 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-sky-400" />
              {t.pid.thrustThrottle}
            </span>

            <div className="text-3xl font-extrabold text-sky-300 my-1">
              {thrustKn.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">kN</span>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{t.pid.throttleLevel}</span>
                <span className="text-white font-bold">{throttlePct.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all duration-300"
                  style={{ width: `${throttlePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Cryogenic Temperature */}
          <div className="mcc-panel p-4 border-t-2 border-t-cyan-400">
            <span className="text-xs font-semibold uppercase text-slate-200 block mb-2 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              {t.pid.cryoTemp}
            </span>

            <div className="text-3xl font-extrabold text-cyan-300 my-1">
              {propTemp.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">°C</span>
            </div>

            <p className="text-[11px] text-slate-400">{t.pid.cryoNote}</p>
          </div>

          {/* Card 4: Propellant Remaining */}
          <div className="mcc-panel p-4 border-t-2 border-t-emerald-400">
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-200">{t.pid.propRemaining}</span>
              <span className="font-bold text-emerald-300 text-sm">{fuelRemaining.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${fuelRemaining}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

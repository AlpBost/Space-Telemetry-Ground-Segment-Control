import { useState, useEffect, useRef, useCallback } from 'react';
import type { TelemetryPacket, HistoryPoint } from '../types/telemetry';

const MAX_HISTORY_POINTS = 160;
const CHART_UPDATE_INTERVAL_MS = 250; // Throttle chart redraws to 4 FPS for maximum responsiveness
const BACKEND_WS_URL = 'ws://localhost:8000/ws/telemetry';
const BACKEND_API_BASE = 'http://localhost:8000/api/v1';

// Initial nominal seed history so charts render beautifully on load without empty canvas glitches
function createInitialHistory(): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const now = Date.now();
  for (let i = 12; i >= 0; i--) {
    const t = new Date(now - i * 1000);
    const label = t.toLocaleTimeString('tr-TR', {
      minute: '2-digit',
      second: '2-digit',
    });
    points.push({
      timeLabel: label,
      altitude: 120.0 + Math.sin(i * 0.2) * 1.5,
      velocity: 2.40 + Math.cos(i * 0.2) * 0.04,
      chamberPressure: 125.0,
      solarTemp: 52.0,
      busVoltage: 28.4,
    });
  }
  return points;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

export function useTelemetryStream() {
  const [packet, setPacket] = useState<TelemetryPacket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLOS, setIsLOS] = useState<boolean>(false);
  const [packetCount, setPacketCount] = useState<number>(0);
  const [corruptedPackets, setCorruptedPackets] = useState<number>(0);
  const [history, setHistory] = useState<HistoryPoint[]>(createInitialHistory);
  const [packetLogs, setPacketLogs] = useState<TelemetryPacket[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isDestroyedRef = useRef<boolean>(false);
  const lastSeqIdRef = useRef<number>(-1);
  const lastChartUpdateRef = useRef<number>(0);

  const clearPacketLogs = useCallback(() => {
    setPacketLogs([]);
    setCorruptedPackets(0);
  }, []);

  const connect = useCallback(() => {
    if (isDestroyedRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(BACKEND_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsLOS(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.header && data.header.status === 'LOSS_OF_SIGNAL') {
            setIsLOS(true);
            return;
          }

          const tmPacket = data as TelemetryPacket;
          setIsLOS(false);
          setPacket(tmPacket);
          setPacketCount((c) => c + 1);

          // Check for simulated CRC corruption
          if (tmPacket.fdir && tmPacket.fdir.checksum_valid === false) {
            setCorruptedPackets((cp) => cp + 1);
          }

          lastSeqIdRef.current = tmPacket.header.sequence_id;

          // Append to packet inspector rolling log (last 80 frames)
          setPacketLogs((prev) => [tmPacket, ...prev.slice(0, 79)]);

          // Throttled Chart Buffer Update
          const nowMs = performance.now();
          if (nowMs - lastChartUpdateRef.current >= CHART_UPDATE_INTERVAL_MS) {
            lastChartUpdateRef.current = nowMs;

            const nowLabel = new Date().toLocaleTimeString('tr-TR', {
              minute: '2-digit',
              second: '2-digit',
              fractionalSecondDigits: 1,
            });

            const newPoint: HistoryPoint = {
              timeLabel: nowLabel,
              altitude: tmPacket.trajectory.altitude_km,
              velocity: tmPacket.trajectory.velocity_kms,
              chamberPressure: tmPacket.propulsion.chamber_pressure_bar,
              solarTemp: tmPacket.thermal.solar_array_temp_c,
              busVoltage: tmPacket.electrical.bus_voltage_v,
            };

            setHistory((prev) => {
              const next = [...prev, newPoint];
              return next.length > MAX_HISTORY_POINTS ? next.slice(-MAX_HISTORY_POINTS) : next;
            });
          }
        } catch (err) {
          console.error('Error parsing telemetry frame:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (!isDestroyedRef.current) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setIsConnected(false);
      if (!isDestroyedRef.current) {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    }
  }, []);

  useEffect(() => {
    isDestroyedRef.current = false;
    connect();
    return () => {
      isDestroyedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Command handlers with explicit feedback status returns
  const ackAlarm = useCallback(async (alarmId: string): Promise<CommandResult> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'ACK_ALARM', alarm_id: alarmId }));
    }
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/ack-alarm?alarm_id=${encodeURIComponent(alarmId)}`, {
        method: 'POST',
      });
      if (res.ok) {
        return { success: true, message: `Alarm ${alarmId} onaylandı (ACK).` };
      }
      return { success: false, message: `Alarm onaylama başarısız (Kod: ${res.status}).` };
    } catch (e: any) {
      return { success: false, message: `Bağlantı hatası: ${e?.message || 'Sunucuya ulaşılamadı'}` };
    }
  }, []);

  const injectAnomaly = useCallback(async (anomalyType: string): Promise<CommandResult> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'INJECT_ANOMALY', anomaly_type: anomalyType }));
    }
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/inject-anomaly?anomaly_type=${encodeURIComponent(anomalyType)}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: `Anomali başarıyla enjekte edildi: ${anomalyType}`, data };
      }
      return { success: false, message: `Anomali enjeksiyonu reddedildi (Kod: ${res.status})` };
    } catch (e: any) {
      return { success: false, message: `Bağlantı hatası: Backend servisi çalışıyor mu? (${e?.message})` };
    }
  }, []);

  const clearAnomaly = useCallback(async (anomalyType?: string): Promise<CommandResult> => {
    setIsLOS(false); // Instantly release LOS visual freeze
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'CLEAR_ANOMALY', anomaly_type: anomalyType }));
    }
    try {
      const url = anomalyType
        ? `${BACKEND_API_BASE}/commands/clear-anomaly?anomaly_type=${encodeURIComponent(anomalyType)}`
        : `${BACKEND_API_BASE}/commands/clear-anomaly`;
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        return { success: true, message: 'Tüm anomaliler temizlendi. Sistem normale dönüyor.' };
      }
      return { success: false, message: `Temizleme hatası (Kod: ${res.status})` };
    } catch (e: any) {
      return { success: false, message: `Sunucuya ulaşılamadı: ${e?.message}` };
    }
  }, []);

  const setStreamRate = useCallback(async (hz: number): Promise<CommandResult> => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/rate?rate_hz=${hz}`, { method: 'POST' });
      if (res.ok) {
        return { success: true, message: `Yayın frekansı ${hz} Hz olarak ayarlandı.` };
      }
      return { success: false, message: `Frekans değiştirilemedi (Kod: ${res.status})` };
    } catch (e: any) {
      return { success: false, message: `Bağlantı hatası: ${e?.message}` };
    }
  }, []);

  const switchMode = useCallback(async (mode: 'LIVE_SIMULATION' | 'CSV_REPLAY'): Promise<CommandResult> => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/mode?mode=${encodeURIComponent(mode)}`, { method: 'POST' });
      if (res.ok) {
        setHistory([]); // Start drawing clean from left for the 30-second flight
        return {
          success: true,
          message: `Veri modu: ${mode === 'LIVE_SIMULATION' ? 'CANLI FİZİK SİMÜLASYONU' : '30-SANİYELİK CSV FLIGHT REPLAY (T=0)'} devrede.`,
        };
      }
      return { success: false, message: `Mod değiştirme hatası (Kod: ${res.status})` };
    } catch (e: any) {
      return { success: false, message: `Bağlantı hatası: ${e?.message}` };
    }
  }, []);

  const restartReplay = useCallback(async (): Promise<CommandResult> => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/replay/restart`, { method: 'POST' });
      if (res.ok) {
        setHistory([]); // Reset chart view to start at T=0
        return {
          success: true,
          message: 'CSV 30s Uçuş profili T=0 anından baştan başlatıldı.',
        };
      }
      return { success: false, message: `Replay başlatma hatası (Kod: ${res.status})` };
    } catch (e: any) {
      return { success: false, message: `Bağlantı hatası: ${e?.message}` };
    }
  }, []);

  const armCommand = useCallback(async (cmdType: string): Promise<any> => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/arm?cmd_type=${encodeURIComponent(cmdType)}`, {
        method: 'POST',
      });
      return await res.json();
    } catch (e) {
      console.error('Arm command error:', e);
      return null;
    }
  }, []);

  const fireCommand = useCallback(async (payload: any): Promise<any> => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/fire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (e) {
      console.error('Fire command error:', e);
      return null;
    }
  }, []);

  return {
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
  };
}

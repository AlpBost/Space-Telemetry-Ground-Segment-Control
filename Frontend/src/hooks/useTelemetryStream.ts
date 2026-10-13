import { useState, useEffect, useRef, useCallback } from 'react';
import type { TelemetryPacket, HistoryPoint } from '../types/telemetry';

const MAX_HISTORY_POINTS = 35;
const BACKEND_WS_URL = 'ws://localhost:8000/ws/telemetry';
const BACKEND_API_BASE = 'http://localhost:8000/api/v1';

export function useTelemetryStream() {
  const [packet, setPacket] = useState<TelemetryPacket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLOS, setIsLOS] = useState<boolean>(false);
  const [packetCount, setPacketCount] = useState<number>(0);
  const [corruptedPackets, setCorruptedPackets] = useState<number>(0);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const lastSeqIdRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

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

          // Append to rolling chart history buffer
          const nowLabel = new Date().toLocaleTimeString('en-US', {
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
        } catch (err) {
          console.error('Error parsing telemetry frame:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Exponential/Fixed 2-second reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current();
      }, 3000);
    }
  }, []);

  connectRef.current = connect;

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Command handlers
  const ackAlarm = useCallback(async (alarmId: string) => {
    // Also send via active WebSocket for instant sub-millisecond reaction
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'ACK_ALARM', alarm_id: alarmId }));
    }
    try {
      await fetch(`${BACKEND_API_BASE}/commands/ack-alarm?alarm_id=${encodeURIComponent(alarmId)}`, {
        method: 'POST',
      });
    } catch (e) {
      console.error('Failed to ack alarm via REST:', e);
    }
  }, []);

  const injectAnomaly = useCallback(async (anomalyType: string) => {
    try {
      await fetch(`${BACKEND_API_BASE}/commands/inject-anomaly?anomaly_type=${encodeURIComponent(anomalyType)}`, {
        method: 'POST',
      });
    } catch (e) {
      console.error('Failed to inject anomaly:', e);
    }
  }, []);

  const clearAnomaly = useCallback(async (anomalyType?: string) => {
    try {
      const url = anomalyType
        ? `${BACKEND_API_BASE}/commands/clear-anomaly?anomaly_type=${encodeURIComponent(anomalyType)}`
        : `${BACKEND_API_BASE}/commands/clear-anomaly`;
      await fetch(url, { method: 'POST' });
    } catch (e) {
      console.error('Failed to clear anomaly:', e);
    }
  }, []);

  const setStreamRate = useCallback(async (hz: number) => {
    try {
      await fetch(`${BACKEND_API_BASE}/commands/rate?rate_hz=${hz}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to update rate:', e);
    }
  }, []);

  const switchMode = useCallback(async (mode: 'LIVE_SIMULATION' | 'CSV_REPLAY') => {
    try {
      await fetch(`${BACKEND_API_BASE}/commands/mode?mode=${encodeURIComponent(mode)}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to switch mode:', e);
    }
  }, []);

  const armCommand = useCallback(async (cmdType: string) => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/arm?cmd_type=${encodeURIComponent(cmdType)}`, {
        method: 'POST',
      });
      return await res.json();
    } catch (e) {
      console.error('Failed to arm command:', e);
      return null;
    }
  }, []);

  const fireCommand = useCallback(async (req: any) => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/commands/fire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      return await res.json();
    } catch (e) {
      console.error('Failed to fire command:', e);
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
    ackAlarm,
    injectAnomaly,
    clearAnomaly,
    setStreamRate,
    switchMode,
    armCommand,
    fireCommand,
  };
}

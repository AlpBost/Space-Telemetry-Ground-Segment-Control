"""
WebSocket Telemetry Streaming Router.
Streams high-frequency CCSDS telemetry packets and handles inbound operator commands.
"""

import asyncio
import csv
import json
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.connection_manager import connection_manager
from app.services.telemetry_generator import telemetry_simulator
from app.services.fdir_engine import fdir_engine
from app.core.config import settings

router = APIRouter()

# Global background loop reference and rate control
_telemetry_task = None
_stream_rate_hz = settings.DEFAULT_STREAM_RATE_HZ


def load_initial_csv():
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "flight_log_telemetry.csv")
    if os.path.exists(csv_path):
        records = []
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
        if records:
            telemetry_simulator.load_csv_dataset(records)


async def telemetry_broadcast_loop():
    """Continuous async loop generating telemetry frames and broadcasting to MCC clients."""
    load_initial_csv()
    while True:
        try:
            packet = telemetry_simulator.generate_packet()
            if packet is not None:
                await connection_manager.broadcast_packet(packet)
            else:
                # Loss of Signal (LOS) heartbeat frame
                await connection_manager.broadcast_raw_json({
                    "header": {
                        "sync_word": "0x00000000",
                        "status": "LOSS_OF_SIGNAL",
                        "message": "Ground Station Signal Lost (LOS) - Re-acquisition in progress"
                    }
                })

            interval = 1.0 / max(1.0, min(50.0, _stream_rate_hz))
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            break
        except Exception as e:
            await asyncio.sleep(0.1)


def start_telemetry_loop():
    global _telemetry_task
    if _telemetry_task is None or _telemetry_task.done():
        _telemetry_task = asyncio.create_task(telemetry_broadcast_loop())


def stop_telemetry_loop():
    global _telemetry_task
    if _telemetry_task and not _telemetry_task.done():
        _telemetry_task.cancel()


def set_stream_frequency(hz: float):
    global _stream_rate_hz
    _stream_rate_hz = max(1.0, min(50.0, hz))


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await connection_manager.connect(websocket)
    try:
        while True:
            # Listen for inbound commands or ping messages over the WebSocket
            text_data = await websocket.receive_text()
            try:
                msg = json.loads(text_data)
                action = msg.get("action")
                if action == "ACK_ALARM":
                    alarm_id = msg.get("alarm_id")
                    if alarm_id:
                        fdir_engine.acknowledge_alarm(alarm_id)
                elif action == "INJECT_ANOMALY":
                    anomaly_type = msg.get("anomaly_type")
                    if anomaly_type:
                        telemetry_simulator.inject_anomaly(anomaly_type)
                elif action == "CLEAR_ANOMALY":
                    anomaly_type = msg.get("anomaly_type")
                    telemetry_simulator.clear_anomaly(anomaly_type)
            except Exception:
                pass
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
    except Exception:
        await connection_manager.disconnect(websocket)

"""
WebSocket Connection & Broadcast Manager.
Maintains active operator sockets, isolates client disconnects, and manages backpressure.
"""

import asyncio
import json
from typing import Set
from fastapi import WebSocket, WebSocketDisconnect
from app.models.telemetry import TelemetryPacket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)

    async def broadcast_packet(self, packet: TelemetryPacket):
        """Broadcasts a telemetry packet serialized to JSON to all connected MCC operators."""
        if not self.active_connections:
            return

        payload = packet.model_dump_json()
        dead_connections = []

        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_connections.append(connection)

            for dead in dead_connections:
                self.active_connections.discard(dead)

    async def broadcast_raw_json(self, raw_data: dict):
        if not self.active_connections:
            return
        payload = json.dumps(raw_data)
        dead_connections = []
        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.active_connections.discard(dead)


connection_manager = ConnectionManager()

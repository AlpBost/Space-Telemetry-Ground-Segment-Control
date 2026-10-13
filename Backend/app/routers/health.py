"""
Health Check and Ground Segment Metrics Router.
"""

from fastapi import APIRouter
from app.services.connection_manager import connection_manager
from app.services.telemetry_generator import telemetry_simulator
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
async def health_check():
    return {
        "status": "OPERATIONAL",
        "service": settings.PROJECT_NAME,
        "active_clients": len(connection_manager.active_connections),
        "flight_phase": telemetry_simulator.flight_phase.value,
        "sequence_id": telemetry_simulator.sequence_id,
        "source_mode": telemetry_simulator.source_mode,
    }

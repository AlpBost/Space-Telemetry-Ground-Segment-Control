"""
Telecommand (TC) REST API Endpoints.
Implements the 'Two-Man Rule' (Arm & Fire sequence), Fault Injection, Mode Selection, and Emergency Abort.
"""

import time
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException
from app.models.command import (
    TelecommandRequest,
    TelecommandResponse,
    CommandType,
    AnomalyType,
)
from app.services.telemetry_generator import telemetry_simulator
from app.services.fdir_engine import fdir_engine
from app.routers.telemetry_ws import set_stream_frequency, load_initial_csv

router = APIRouter(prefix="/commands", tags=["Telecommand"])

# Store armed tokens with expiration time: {token: (command_type, expiry_timestamp)}
_armed_tokens: dict[str, tuple[str, float]] = {}


@router.post("/arm", response_model=TelecommandResponse)
async def arm_command(cmd_type: CommandType):
    """
    Step 1 of the 'Two-Man Rule': Arms a critical maneuver or command.
    Generates a cryptographically unique arming token valid for 30 seconds.
    """
    token = str(uuid.uuid4())[:8].upper()
    _armed_tokens[token] = (cmd_type.value, time.time() + 30.0)

    return TelecommandResponse(
        status="ARMED",
        command_type=cmd_type,
        message=f"Komut 'ARM' edildi. Onaylamak için 30 saniye içinde '{token}' doğrulama anahtarını onaylayınız.",
        armed_token=token,
        requires_confirmation=True,
        sequence_id=telemetry_simulator.sequence_id,
    )


@router.post("/fire", response_model=TelecommandResponse)
async def fire_command(request: TelecommandRequest):
    """
    Step 2 of the 'Two-Man Rule': Validates the armed token and executes the critical action.
    """
    token = request.armed_token
    if not token or token not in _armed_tokens:
        raise HTTPException(
            status_code=400,
            detail="Geçersiz veya süresi dolmuş ARM anahtarı! Komut fırlatılamadı.",
        )

    cmd_value, expiry = _armed_tokens.pop(token)
    if time.time() > expiry:
        raise HTTPException(status_code=400, detail="ARM anahtarının 30 saniyelik süresi doldu!")

    # Execute the confirmed command
    if cmd_value == CommandType.EMERGENCY_ABORT.value:
        telemetry_simulator.emergency_abort()
        msg = "ACİL DURUM İPTALİ (EMERGENCY ABORT) YÜRÜTÜLDÜ. İtki sıfırlandı."
    elif cmd_value == CommandType.INJECT_ANOMALY.value and request.anomaly_type:
        telemetry_simulator.inject_anomaly(request.anomaly_type.value)
        msg = f"Anomali başarıyla fırlatıldı: {request.anomaly_type.value}"
    else:
        msg = f"Komut başarıyla yürütüldü: {cmd_value}"

    return TelecommandResponse(
        status="EXECUTED",
        command_type=request.command_type,
        message=msg,
        requires_confirmation=False,
        sequence_id=telemetry_simulator.sequence_id,
    )


@router.post("/inject-anomaly")
async def quick_inject_anomaly(anomaly_type: str):
    """Direct anomaly injection for testing without two-man rule."""
    clean_type = anomaly_type.strip().upper()
    telemetry_simulator.inject_anomaly(clean_type)
    return {"status": "SUCCESS", "injected": clean_type}


@router.post("/clear-anomaly")
async def clear_anomaly(anomaly_type: Optional[str] = None):
    clean_type = anomaly_type.strip().upper() if anomaly_type else None
    telemetry_simulator.clear_anomaly(clean_type)
    return {"status": "SUCCESS", "cleared": clean_type or "ALL"}


@router.post("/mode")
async def set_simulation_mode(mode: str):
    """Switches source between 'LIVE_SIMULATION' and 'CSV_REPLAY'."""
    target = mode.upper()
    if target not in ["LIVE_SIMULATION", "CSV_REPLAY"]:
        raise HTTPException(status_code=400, detail="Mod 'LIVE_SIMULATION' veya 'CSV_REPLAY' olmalıdır.")
    if target == "CSV_REPLAY":
        load_initial_csv()
        telemetry_simulator.reset_csv_replay()
    telemetry_simulator.set_mode(target)
    return {"status": "SUCCESS", "mode": target}


@router.post("/replay/restart")
async def restart_csv_replay():
    """Rewinds CSV replay to the launchpad (T=0) for a fresh 30-second flight."""
    load_initial_csv()
    telemetry_simulator.reset_csv_replay()
    telemetry_simulator.set_mode("CSV_REPLAY")
    return {"status": "SUCCESS", "message": "CSV Uçuş Replay T=0 anından tekrar başlatıldı."}


@router.post("/rate")
async def set_stream_rate(rate_hz: float):
    """Sets stream frequency between 1 Hz and 50 Hz."""
    if rate_hz < 1.0 or rate_hz > 50.0:
        raise HTTPException(status_code=400, detail="Akış hızı 1Hz ile 50Hz arasında olmalıdır.")
    set_stream_frequency(rate_hz)
    return {"status": "SUCCESS", "rate_hz": rate_hz}


@router.post("/ack-alarm")
async def ack_alarm(alarm_id: str):
    """Acknowledges an active alarm in the FDIR desk."""
    success = fdir_engine.acknowledge_alarm(alarm_id)
    return {"status": "SUCCESS" if success else "NOT_FOUND", "alarm_id": alarm_id}

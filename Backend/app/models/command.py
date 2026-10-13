"""
Telecommand (TC) Uplink schemas.
Supports 'Two-Man Rule' (Arm & Fire), Anomaly Injection, Simulation Reset, and Mode Switching.
"""

from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field


class CommandType(str, Enum):
    ARM_SYSTEM = "ARM_SYSTEM"
    FIRE_COMMAND = "FIRE_COMMAND"
    INJECT_ANOMALY = "INJECT_ANOMALY"
    CLEAR_ANOMALY = "CLEAR_ANOMALY"
    SWITCH_MODE = "SWITCH_MODE"  # LIVE_SIMULATION vs CSV_REPLAY
    SET_STREAM_RATE = "SET_STREAM_RATE"
    EMERGENCY_ABORT = "EMERGENCY_ABORT"
    ACKNOWLEDGE_ALARM = "ACKNOWLEDGE_ALARM"


class AnomalyType(str, Enum):
    THERMAL_RUNAWAY = "THERMAL_RUNAWAY"          # Solar panel > 75°C
    PRESSURE_DROP = "PRESSURE_DROP"              # Chamber pressure drops < 90 bar
    VOLTAGE_SAG = "VOLTAGE_SAG"                  # Bus voltage drops < 24V
    PROPAGATION_BLACKOUT = "PROPAGATION_BLACKOUT" # Complete Loss of Signal (LOS)
    CORRUPTED_PACKET = "CORRUPTED_PACKET"        # CRC32 bit flip


class TelecommandRequest(BaseModel):
    command_type: CommandType
    subsystem: Optional[str] = None
    anomaly_type: Optional[AnomalyType] = None
    stream_rate_hz: Optional[float] = None
    target_mode: Optional[str] = None  # LIVE_SIMULATION or CSV_REPLAY
    alarm_id: Optional[str] = None
    armed_token: Optional[str] = None  # Two-step validation token
    operator_callsign: str = "MCC-FLIGHT-1"
    timestamp_utc: Optional[str] = None


class TelecommandResponse(BaseModel):
    status: str
    command_type: CommandType
    message: str
    armed_token: Optional[str] = None
    requires_confirmation: bool = False
    sequence_id: int

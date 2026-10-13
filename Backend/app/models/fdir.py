"""
FDIR (Fault Detection, Isolation, and Recovery) schemas.
Categorizes system health, alarms, severity levels, and acknowledgment flags.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class AlarmSeverity(str, Enum):
    NOMINAL = "NOMINAL"
    CAUTION = "CAUTION"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class ActiveAlarm(BaseModel):
    alarm_id: str
    subsystem: str
    parameter: str
    severity: AlarmSeverity
    current_value: float
    threshold_value: float
    unit: str
    message: str
    timestamp_utc: str
    acknowledged: bool = False


class FDIRStatus(BaseModel):
    overall_status: AlarmSeverity = AlarmSeverity.NOMINAL
    active_alarms: list[ActiveAlarm] = Field(default_factory=list)
    checksum_valid: bool = True
    fdir_cycles_evaluated: int = 0

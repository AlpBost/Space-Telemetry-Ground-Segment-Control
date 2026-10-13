"""
Telemetry Frame Data Models (CCSDS-inspired).
Defines trajectory, propulsion, thermal, electrical subsystems, and packet headers.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from app.models.fdir import FDIRStatus


class FlightPhase(str, Enum):
    PRE_LAUNCH = "PRE_LAUNCH"
    BOOST_ASCENT = "BOOST_ASCENT"
    MECO = "MECO"  # Main Engine Cut-Off
    STAGE_SEP = "STAGE_SEP"
    SECOND_STAGE_BURN = "SECOND_STAGE_BURN"
    ORBIT_INSERTION = "ORBIT_INSERTION"
    ORBITAL_CRUISE = "ORBITAL_CRUISE"
    ABORT = "ABORT"


class TelemetryHeader(BaseModel):
    sync_word: str = "0x1ACFFC1D"
    packet_version: int = 1
    sequence_id: int
    spacecraft_utc: str
    ground_station_utc: str
    simulated_distance_km: float
    one_way_light_time_ms: float
    clock_drift_ppm: float
    crc32_checksum: str


class TrajectorySubsystem(BaseModel):
    altitude_km: float
    downrange_distance_km: float
    velocity_kms: float
    vertical_speed_ms: float
    horizontal_speed_ms: float
    apogee_km: float
    perigee_km: float
    inclination_deg: float
    flight_phase: FlightPhase
    dynamic_pressure_kpa: float  # Max-Q tracking


class PropulsionSubsystem(BaseModel):
    chamber_pressure_bar: float
    feedline_pressure_bar: float
    propellant_temp_c: float
    thrust_kn: float
    throttle_pct: float
    fuel_remaining_pct: float
    engine_state: str = "ARMED_BURNING"


class ThermalSubsystem(BaseModel):
    avionics_temp_c: float
    battery_cell_temp_c: float
    solar_array_temp_c: float
    nozzle_throat_temp_c: float


class ElectricalSubsystem(BaseModel):
    bus_voltage_v: float
    bus_current_a: float
    battery_soc_pct: float
    solar_generation_w: float
    power_draw_w: float


class TelemetryPacket(BaseModel):
    header: TelemetryHeader
    trajectory: TrajectorySubsystem
    propulsion: PropulsionSubsystem
    thermal: ThermalSubsystem
    electrical: ElectricalSubsystem
    fdir: FDIRStatus
    source_mode: str = "LIVE_SIMULATION"  # LIVE_SIMULATION or CSV_REPLAY

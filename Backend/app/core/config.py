"""
Core configuration and telemetry thresholds for Ground Segment & Mission Operations.
Defines nominal limits, warning boundaries, and physical constants.
"""

from pydantic import BaseModel


class TelemetryLimits(BaseModel):
    # Propulsion Subsystem (Pressure in bar, Temperature in °C)
    CHAMBER_PRESSURE_NOMINAL_MIN: float = 90.0
    CHAMBER_PRESSURE_NOMINAL_MAX: float = 140.0
    CHAMBER_PRESSURE_CRITICAL_MAX: float = 160.0
    
    PROPELLANT_TEMP_MIN: float = -195.0
    PROPELLANT_TEMP_MAX: float = -170.0

    # Thermal Subsystem (°C)
    SOLAR_PANEL_NOMINAL_MAX: float = 75.0
    SOLAR_PANEL_CRITICAL_MAX: float = 95.0
    SOLAR_PANEL_HYSTERESIS_MARGIN: float = 3.5  # Must drop below 71.5°C to clear alarm

    AVIONICS_TEMP_NOMINAL_MAX: float = 55.0
    AVIONICS_TEMP_CRITICAL_MAX: float = 70.0
    AVIONICS_HYSTERESIS_MARGIN: float = 3.0

    BATTERY_TEMP_NOMINAL_MAX: float = 40.0
    BATTERY_TEMP_CRITICAL_MAX: float = 50.0

    # Electrical Power Subsystem (EPS)
    BUS_VOLTAGE_NOMINAL_MIN: float = 24.0
    BUS_VOLTAGE_NOMINAL_MAX: float = 32.0
    BUS_VOLTAGE_CRITICAL_MIN: float = 21.0
    BUS_VOLTAGE_HYSTERESIS_MARGIN: float = 1.0


class Settings(BaseModel):
    PROJECT_NAME: str = "Space Telemetry & Ground Segment Control Dashboard"
    API_V1_STR: str = "/api/v1"
    WS_TELEMETRY_ENDPOINT: str = "/ws/telemetry"
    DEFAULT_STREAM_RATE_HZ: float = 10.0  # 10 Hz (100ms interval)
    SPEED_OF_LIGHT_KMS: float = 299792.458  # km/s
    GROUND_STATION_ALTITUDE_KM: float = 0.05
    GROUND_STATION_NAME: str = "MCC-1 (Auckland / Mahia Segment)"

    LIMITS: TelemetryLimits = TelemetryLimits()


settings = Settings()

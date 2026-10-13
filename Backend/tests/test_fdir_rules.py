"""
Unit tests for FDIR (Fault Detection, Isolation, and Recovery) and Hysteresis.
"""

import pytest
from app.services.fdir_engine import FDIREngine
from app.models.fdir import AlarmSeverity


def test_fdir_solar_panel_hysteresis():
    fdir = FDIREngine()

    # 1. Under nominal conditions (< 75°C), status should be NOMINAL
    res = fdir.evaluate_telemetry(
        solar_temp=65.0,
        avionics_temp=40.0,
        battery_temp=30.0,
        chamber_pressure=125.0,
        bus_voltage=28.2,
    )
    assert res.overall_status == AlarmSeverity.NOMINAL
    assert len(res.active_alarms) == 0

    # 2. Temperature breaches 75.0°C threshold -> Alarm triggers
    res2 = fdir.evaluate_telemetry(
        solar_temp=76.2,
        avionics_temp=40.0,
        battery_temp=30.0,
        chamber_pressure=125.0,
        bus_voltage=28.2,
    )
    assert res2.overall_status == AlarmSeverity.WARNING
    assert len(res2.active_alarms) == 1
    assert res2.active_alarms[0].parameter == "solar_array_temp_c"

    # 3. Temperature cools slightly to 74.0°C (below 75°C, but above hysteresis clearance 71.5°C)
    # The alarm MUST remain active to prevent chattering!
    res3 = fdir.evaluate_telemetry(
        solar_temp=74.0,
        avionics_temp=40.0,
        battery_temp=30.0,
        chamber_pressure=125.0,
        bus_voltage=28.2,
    )
    assert res3.overall_status == AlarmSeverity.WARNING
    assert len(res3.active_alarms) == 1

    # 4. Temperature cools down below 71.5°C -> Alarm clears!
    res4 = fdir.evaluate_telemetry(
        solar_temp=70.0,
        avionics_temp=40.0,
        battery_temp=30.0,
        chamber_pressure=125.0,
        bus_voltage=28.2,
    )
    assert res4.overall_status == AlarmSeverity.NOMINAL
    assert len(res4.active_alarms) == 0


def test_fdir_alarm_acknowledgment():
    fdir = FDIREngine()
    # Trigger alarm
    fdir.evaluate_telemetry(
        solar_temp=78.0,
        avionics_temp=40.0,
        battery_temp=30.0,
        chamber_pressure=125.0,
        bus_voltage=28.2,
    )
    # Acknowledge alarm
    ack_res = fdir.acknowledge_alarm("ALM-THM-01")
    assert ack_res is True

    # Next evaluation frame should reflect acknowledged status
    status = fdir.evaluate_telemetry(
        solar_temp=78.0,
        avionics_temp=40.0,
        battery_temp=30.0,
        chamber_pressure=125.0,
        bus_voltage=28.2,
    )
    assert status.active_alarms[0].acknowledged is True

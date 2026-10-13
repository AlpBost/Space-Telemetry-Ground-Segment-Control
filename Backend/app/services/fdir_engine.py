"""
FDIR (Fault Detection, Isolation, and Recovery) Engine.
Implements multi-level boundary checks with hysteresis (Schmidt Trigger logic)
to prevent alarm chattering due to sensor noise.
"""

from datetime import datetime, timezone
from app.core.config import settings
from app.models.fdir import FDIRStatus, ActiveAlarm, AlarmSeverity


class FDIREngine:
    def __init__(self):
        self.acknowledged_alarm_ids: set[str] = set()
        self.active_alarm_state: dict[str, ActiveAlarm] = {}
        self.cycles_evaluated: int = 0

    def acknowledge_alarm(self, alarm_id: str) -> bool:
        if alarm_id in self.active_alarm_state:
            self.active_alarm_state[alarm_id].acknowledged = True
            self.acknowledged_alarm_ids.add(alarm_id)
            return True
        return False

    def clear_alarm_acknowledgments(self):
        self.acknowledged_alarm_ids.clear()

    def evaluate_telemetry(
        self,
        solar_temp: float,
        avionics_temp: float,
        battery_temp: float,
        chamber_pressure: float,
        bus_voltage: float,
    ) -> FDIRStatus:
        self.cycles_evaluated += 1
        now_utc = datetime.now(timezone.utc).isoformat()
        limits = settings.LIMITS

        # -------------------------------------------------------------
        # 1. Thermal Subsystem - Solar Panel Temp (Upper Threshold with Hysteresis)
        # -------------------------------------------------------------
        alarm_id_solar = "ALM-THM-01"
        is_already_alarming = alarm_id_solar in self.active_alarm_state

        if not is_already_alarming:
            # Trigger conditions
            if solar_temp >= limits.SOLAR_PANEL_CRITICAL_MAX:
                self.active_alarm_state[alarm_id_solar] = ActiveAlarm(
                    alarm_id=alarm_id_solar,
                    subsystem="THERMAL",
                    parameter="solar_array_temp_c",
                    severity=AlarmSeverity.CRITICAL,
                    current_value=round(solar_temp, 2),
                    threshold_value=limits.SOLAR_PANEL_CRITICAL_MAX,
                    unit="°C",
                    message=f"Kritik Termal Kaçak: Güneş paneli {solar_temp:.1f}°C (> {limits.SOLAR_PANEL_CRITICAL_MAX}°C)",
                    timestamp_utc=now_utc,
                    acknowledged=alarm_id_solar in self.acknowledged_alarm_ids,
                )
            elif solar_temp >= limits.SOLAR_PANEL_NOMINAL_MAX:
                self.active_alarm_state[alarm_id_solar] = ActiveAlarm(
                    alarm_id=alarm_id_solar,
                    subsystem="THERMAL",
                    parameter="solar_array_temp_c",
                    severity=AlarmSeverity.WARNING,
                    current_value=round(solar_temp, 2),
                    threshold_value=limits.SOLAR_PANEL_NOMINAL_MAX,
                    unit="°C",
                    message=f"Yüksek Sıcaklık Uyarısı: Güneş paneli {solar_temp:.1f}°C (> {limits.SOLAR_PANEL_NOMINAL_MAX}°C)",
                    timestamp_utc=now_utc,
                    acknowledged=alarm_id_solar in self.acknowledged_alarm_ids,
                )
        else:
            # Update existing alarm value
            self.active_alarm_state[alarm_id_solar].current_value = round(solar_temp, 2)
            # Check hysteresis clearance margin
            clear_threshold = limits.SOLAR_PANEL_NOMINAL_MAX - limits.SOLAR_PANEL_HYSTERESIS_MARGIN
            if solar_temp < clear_threshold:
                # Value has cooled down sufficiently past the hysteresis band
                del self.active_alarm_state[alarm_id_solar]
                self.acknowledged_alarm_ids.discard(alarm_id_solar)

        # -------------------------------------------------------------
        # 2. Propulsion Subsystem - Chamber Pressure (Lower Threshold)
        # -------------------------------------------------------------
        alarm_id_press = "ALM-PROP-01"
        is_press_alarming = alarm_id_press in self.active_alarm_state

        if not is_press_alarming:
            if chamber_pressure < 70.0 and chamber_pressure > 0.0:
                self.active_alarm_state[alarm_id_press] = ActiveAlarm(
                    alarm_id=alarm_id_press,
                    subsystem="PROPULSION",
                    parameter="chamber_pressure_bar",
                    severity=AlarmSeverity.CRITICAL,
                    current_value=round(chamber_pressure, 2),
                    threshold_value=70.0,
                    unit="bar",
                    message=f"Kritik İtki Kaybı: Yanma odası basıncı {chamber_pressure:.1f} bar (< 70 bar)",
                    timestamp_utc=now_utc,
                    acknowledged=alarm_id_press in self.acknowledged_alarm_ids,
                )
            elif chamber_pressure < limits.CHAMBER_PRESSURE_NOMINAL_MIN and chamber_pressure > 0.0:
                self.active_alarm_state[alarm_id_press] = ActiveAlarm(
                    alarm_id=alarm_id_press,
                    subsystem="PROPULSION",
                    parameter="chamber_pressure_bar",
                    severity=AlarmSeverity.WARNING,
                    current_value=round(chamber_pressure, 2),
                    threshold_value=limits.CHAMBER_PRESSURE_NOMINAL_MIN,
                    unit="bar",
                    message=f"Düşük Yanma Basıncı: {chamber_pressure:.1f} bar (< {limits.CHAMBER_PRESSURE_NOMINAL_MIN} bar)",
                    timestamp_utc=now_utc,
                    acknowledged=alarm_id_press in self.acknowledged_alarm_ids,
                )
        else:
            self.active_alarm_state[alarm_id_press].current_value = round(chamber_pressure, 2)
            # Must rise above 95.0 bar to clear
            if chamber_pressure >= (limits.CHAMBER_PRESSURE_NOMINAL_MIN + 5.0):
                del self.active_alarm_state[alarm_id_press]
                self.acknowledged_alarm_ids.discard(alarm_id_press)

        # -------------------------------------------------------------
        # 3. Electrical Power Subsystem - Bus Voltage (Under-Voltage Check)
        # -------------------------------------------------------------
        alarm_id_volt = "ALM-EPS-01"
        is_volt_alarming = alarm_id_volt in self.active_alarm_state

        if not is_volt_alarming:
            if bus_voltage <= limits.BUS_VOLTAGE_CRITICAL_MIN:
                self.active_alarm_state[alarm_id_volt] = ActiveAlarm(
                    alarm_id=alarm_id_volt,
                    subsystem="ELECTRICAL",
                    parameter="bus_voltage_v",
                    severity=AlarmSeverity.CRITICAL,
                    current_value=round(bus_voltage, 2),
                    threshold_value=limits.BUS_VOLTAGE_CRITICAL_MIN,
                    unit="V",
                    message=f"Kritik Düşük Voltaj: Ana bara gerilimi {bus_voltage:.1f}V (< {limits.BUS_VOLTAGE_CRITICAL_MIN}V)",
                    timestamp_utc=now_utc,
                    acknowledged=alarm_id_volt in self.acknowledged_alarm_ids,
                )
            elif bus_voltage < limits.BUS_VOLTAGE_NOMINAL_MIN:
                self.active_alarm_state[alarm_id_volt] = ActiveAlarm(
                    alarm_id=alarm_id_volt,
                    subsystem="ELECTRICAL",
                    parameter="bus_voltage_v",
                    severity=AlarmSeverity.WARNING,
                    current_value=round(bus_voltage, 2),
                    threshold_value=limits.BUS_VOLTAGE_NOMINAL_MIN,
                    unit="V",
                    message=f"Düşük Bara Gerilimi Uyarısı: {bus_voltage:.1f}V (< {limits.BUS_VOLTAGE_NOMINAL_MIN}V)",
                    timestamp_utc=now_utc,
                    acknowledged=alarm_id_volt in self.acknowledged_alarm_ids,
                )
        else:
            self.active_alarm_state[alarm_id_volt].current_value = round(bus_voltage, 2)
            # Clearance with hysteresis
            if bus_voltage >= (limits.BUS_VOLTAGE_NOMINAL_MIN + limits.BUS_VOLTAGE_HYSTERESIS_MARGIN):
                del self.active_alarm_state[alarm_id_volt]
                self.acknowledged_alarm_ids.discard(alarm_id_volt)

        # Compute overall system status
        current_alarms = list(self.active_alarm_state.values())
        if any(a.severity == AlarmSeverity.CRITICAL for a in current_alarms):
            overall = AlarmSeverity.CRITICAL
        elif any(a.severity == AlarmSeverity.WARNING for a in current_alarms):
            overall = AlarmSeverity.WARNING
        elif any(a.severity == AlarmSeverity.CAUTION for a in current_alarms):
            overall = AlarmSeverity.CAUTION
        else:
            overall = AlarmSeverity.NOMINAL

        return FDIRStatus(
            overall_status=overall,
            active_alarms=current_alarms,
            checksum_valid=True,
            fdir_cycles_evaluated=self.cycles_evaluated,
        )


fdir_engine = FDIREngine()

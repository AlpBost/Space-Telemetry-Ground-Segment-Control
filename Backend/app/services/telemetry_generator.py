"""
Orbital Dynamics, Propulsion & Flight State Telemetry Generator.
Supports:
1. Dynamic physical flight propagator (continuous numerical simulation with Gaussian noise).
2. Hardware-in-the-loop style Anomaly Injection with instant response.
3. 30-Second non-looping CSV Replay settling into stable orbital cruise (408 km).
4. CRC32 bit-flip tracking passed directly into FDIR engine.
"""

import math
import random
import time
from typing import Optional
from app.models.telemetry import (
    TelemetryPacket,
    TelemetryHeader,
    TrajectorySubsystem,
    PropulsionSubsystem,
    ThermalSubsystem,
    ElectricalSubsystem,
    FlightPhase,
)
from app.services.network_physics import network_physics
from app.services.fdir_engine import fdir_engine


class TelemetrySimulator:
    def __init__(self):
        self.sequence_id: int = 1000
        self.source_mode: str = "LIVE_SIMULATION"
        self.met_seconds: float = 0.0  # Mission Elapsed Time
        self.dt: float = 0.1  # 10 Hz step interval (100ms)

        # Trajectory state
        self.altitude_km: float = 120.0
        self.downrange_km: float = 45.0
        self.velocity_kms: float = 2.40
        self.vertical_speed_ms: float = 850.0
        self.horizontal_speed_ms: float = 2200.0
        self.apogee_km: float = 412.0
        self.perigee_km: float = 180.0
        self.flight_phase: FlightPhase = FlightPhase.BOOST_ASCENT

        # Propulsion state
        self.chamber_pressure_bar: float = 125.0
        self.feedline_pressure_bar: float = 148.0
        self.thrust_kn: float = 220.0
        self.throttle_pct: float = 100.0
        self.propellant_temp_c: float = -183.0
        self.fuel_remaining_pct: float = 85.0

        # Thermal state
        self.avionics_temp_c: float = 38.5
        self.battery_cell_temp_c: float = 28.0
        self.solar_array_temp_c: float = 52.0
        self.nozzle_throat_temp_c: float = 640.0

        # Electrical state
        self.bus_voltage_v: float = 28.4
        self.bus_current_a: float = 14.2
        self.battery_soc_pct: float = 94.0
        self.solar_generation_w: float = 1420.0
        self.power_draw_w: float = 390.0

        # Active Anomaly Injections
        self.thermal_runaway_active: bool = False
        self.pressure_drop_active: bool = False
        self.voltage_sag_active: bool = False

        # CSV Replay buffer
        self.csv_records: list[dict] = []
        self.csv_index: int = 0

    def inject_anomaly(self, anomaly_type: str):
        if anomaly_type == "THERMAL_RUNAWAY":
            self.thermal_runaway_active = True
            # Pre-heat immediately to threshold margin so operator gets immediate feedback in <1s
            if self.solar_array_temp_c < 73.5:
                self.solar_array_temp_c = 74.0
        elif anomaly_type == "PRESSURE_DROP":
            self.pressure_drop_active = True
            if self.chamber_pressure_bar > 95.0:
                self.chamber_pressure_bar = 91.5
        elif anomaly_type == "VOLTAGE_SAG":
            self.voltage_sag_active = True
            if self.bus_voltage_v > 25.2:
                self.bus_voltage_v = 24.6
        elif anomaly_type == "PROPAGATION_BLACKOUT":
            network_physics.set_los_blackout(True)
        elif anomaly_type == "CORRUPTED_PACKET":
            network_physics.trigger_corrupted_packet()

    def clear_anomaly(self, anomaly_type: Optional[str] = None):
        if anomaly_type is None or anomaly_type == "ALL":
            self.thermal_runaway_active = False
            self.pressure_drop_active = False
            self.voltage_sag_active = False
            network_physics.set_los_blackout(False)
        elif anomaly_type == "THERMAL_RUNAWAY":
            self.thermal_runaway_active = False
        elif anomaly_type == "PRESSURE_DROP":
            self.pressure_drop_active = False
        elif anomaly_type == "VOLTAGE_SAG":
            self.voltage_sag_active = False
        elif anomaly_type == "PROPAGATION_BLACKOUT":
            network_physics.set_los_blackout(False)

    def set_mode(self, mode: str):
        self.source_mode = mode

    def emergency_abort(self):
        self.flight_phase = FlightPhase.ABORT
        self.thrust_kn = 0.0
        self.chamber_pressure_bar = 0.0
        self.throttle_pct = 0.0

    def step_live_physics(self):
        """Advances physical state by dt seconds continuously with realistic multi-phase aerospace dynamics."""
        self.met_seconds += self.dt
        t = self.met_seconds

        # Flight Phase Progression
        if self.flight_phase != FlightPhase.ABORT:
            if self.altitude_km < 160.0:
                self.flight_phase = FlightPhase.BOOST_ASCENT
            elif self.altitude_km < 390.0:
                self.flight_phase = FlightPhase.ORBIT_INSERTION
            else:
                self.flight_phase = FlightPhase.ORBITAL_CRUISE

        # Atmospheric drag and gravity simulation
        if self.flight_phase == FlightPhase.BOOST_ASCENT:
            self.altitude_km += (self.vertical_speed_ms / 1000.0) * self.dt
            self.downrange_km += (self.horizontal_speed_ms / 1000.0) * self.dt
            self.velocity_kms = (
                (self.vertical_speed_ms**2 + self.horizontal_speed_ms**2)**0.5 / 1000.0
            )
            self.fuel_remaining_pct = max(0.0, self.fuel_remaining_pct - (0.04 * self.dt))
        elif self.flight_phase == FlightPhase.ORBITAL_CRUISE:
            self.altitude_km = 408.0 + 3.5 * math.sin(t * 0.05)
            self.downrange_km += 7.66 * self.dt
            self.velocity_kms = 7.66 + 0.01 * math.sin(t * 0.1)

        # ----------------- Propulsion Dynamics -----------------
        if self.flight_phase == FlightPhase.ABORT:
            self.chamber_pressure_bar = 0.0
            self.thrust_kn = 0.0
        elif self.pressure_drop_active:
            # Rapid drop below 90 bar (settles at ~68 bar)
            self.chamber_pressure_bar = max(68.0, self.chamber_pressure_bar - 8.0 * self.dt)
            self.thrust_kn = max(50.0, self.thrust_kn - 15.0 * self.dt)
        else:
            target_pressure = 126.0 if self.flight_phase == FlightPhase.BOOST_ASCENT else 0.0
            if self.chamber_pressure_bar < target_pressure:
                self.chamber_pressure_bar = min(target_pressure, self.chamber_pressure_bar + 10.0 * self.dt)
                self.thrust_kn = min(220.0, self.thrust_kn + 20.0 * self.dt)
            else:
                noise = random.gauss(0, 0.4)
                self.chamber_pressure_bar = max(0.0, target_pressure + noise)
                self.thrust_kn = 220.0 + random.gauss(0, 1.2) if target_pressure > 0 else 0.0

        # ----------------- Thermal Dynamics -----------------
        base_solar_temp = 54.0 + 8.0 * math.sin(t * 0.02)
        if self.thermal_runaway_active:
            # Rapid runaway heating exceeding 75°C (reaches 84°C within 1-2s)
            self.solar_array_temp_c = min(84.0, self.solar_array_temp_c + 5.0 * self.dt)
        else:
            # Cooling back towards nominal range across the 71.5°C hysteresis margin
            if self.solar_array_temp_c > base_solar_temp:
                self.solar_array_temp_c = max(base_solar_temp, self.solar_array_temp_c - 2.5 * self.dt)
            else:
                self.solar_array_temp_c = base_solar_temp + random.gauss(0, 0.2)

        self.avionics_temp_c = 38.0 + 2.0 * math.sin(t * 0.03) + random.gauss(0, 0.1)
        self.battery_cell_temp_c = 28.5 + 1.5 * math.sin(t * 0.01) + random.gauss(0, 0.05)

        # ----------------- Electrical Dynamics (EPS) -----------------
        if self.voltage_sag_active:
            # Sags below 24.0V rapidly
            self.bus_voltage_v = max(20.8, self.bus_voltage_v - 2.5 * self.dt)
        else:
            # Recovery to nominal 28.2V across the 25.0V hysteresis reset margin
            if self.bus_voltage_v < 28.2:
                self.bus_voltage_v = min(28.2, self.bus_voltage_v + 1.2 * self.dt)
            else:
                self.bus_voltage_v = 28.2 + random.gauss(0, 0.06)

        self.bus_current_a = 13.8 + random.gauss(0, 0.15)
        self.battery_soc_pct = max(15.0, 95.0 - (t * 0.005))
        self.solar_generation_w = 1520.0 + 80.0 * math.sin(t * 0.02) + random.gauss(0, 5.0)

    def load_csv_dataset(self, records: list[dict]):
        self.csv_records = records
        self.csv_index = 0

    def reset_csv_replay(self):
        self.csv_index = 0

    def generate_packet(self) -> Optional[TelemetryPacket]:
        """Synthesizes or replays a telemetry packet and calculates FDIR & network parameters."""
        if network_physics.simulate_los:
            # Simulated Loss of Signal (LOS) - Ground station receives nothing
            return None

        self.sequence_id += 1

        if self.source_mode == "CSV_REPLAY" and self.csv_records:
            if self.csv_index < len(self.csv_records):
                record = self.csv_records[self.csv_index]
                self.csv_index += 1
                self.altitude_km = float(record.get("altitude_km", self.altitude_km))
                self.velocity_kms = float(record.get("velocity_kms", self.velocity_kms))
                self.chamber_pressure_bar = float(record.get("chamber_pressure_bar", self.chamber_pressure_bar))
                self.solar_array_temp_c = float(record.get("solar_array_temp_c", self.solar_array_temp_c))
                self.bus_voltage_v = float(record.get("bus_voltage_v", self.bus_voltage_v))
                phase_str = record.get("flight_phase")
                if phase_str and phase_str in FlightPhase.__members__:
                    self.flight_phase = FlightPhase[phase_str]
                self.thrust_kn = 220.0 if self.chamber_pressure_bar > 110.0 else (110.0 if self.chamber_pressure_bar > 60.0 else 0.0)
            else:
                # 30-Second flight profile completed! Settle stably in orbital cruise (LEO ~408 km)
                self.flight_phase = FlightPhase.ORBITAL_CRUISE
                self.thrust_kn = 0.0
                self.chamber_pressure_bar = 0.0
                t = (self.sequence_id - 1000) * 0.1
                self.altitude_km = 408.0 + 2.0 * math.sin(t * 0.03)
                self.velocity_kms = 7.66 + 0.01 * math.sin(t * 0.05)
                self.solar_array_temp_c = 64.0 + 3.0 * math.sin(t * 0.02)
                self.bus_voltage_v = 28.2 + random.gauss(0, 0.03)

            # Apply active anomalies on top of CSV data so test buttons work in both modes
            if self.thermal_runaway_active:
                self.solar_array_temp_c = min(84.0, max(76.5, self.solar_array_temp_c + 4.0 * self.dt))
            if self.pressure_drop_active:
                self.chamber_pressure_bar = max(68.0, min(self.chamber_pressure_bar, 85.0) - 6.0 * self.dt)
                self.thrust_kn = max(50.0, self.thrust_kn - 10.0 * self.dt)
            if self.voltage_sag_active:
                self.bus_voltage_v = max(20.5, min(self.bus_voltage_v, 23.2) - 1.5 * self.dt)
        else:
            self.step_live_physics()

        # Network Physics calculation (OWLT latency + clock skew)
        distance_km, latency_ms = network_physics.calculate_distance_and_latency(
            self.altitude_km, self.downrange_km
        )
        spacecraft_utc, ground_utc, drift_ppm = network_physics.calculate_timestamps(latency_ms)

        # CRC32 Frame Calculation (computes checksum and tracks simulated bit-flips)
        payload_summary = f"{self.sequence_id}-{self.altitude_km:.1f}-{self.velocity_kms:.2f}"
        crc32_val, checksum_valid = network_physics.compute_crc32(payload_summary)

        # FDIR Rule Evaluation with Hysteresis & CRC validity
        fdir_state = fdir_engine.evaluate_telemetry(
            solar_temp=self.solar_array_temp_c,
            avionics_temp=self.avionics_temp_c,
            battery_temp=self.battery_cell_temp_c,
            chamber_pressure=self.chamber_pressure_bar,
            bus_voltage=self.bus_voltage_v,
            checksum_valid=checksum_valid,
        )

        # Build Subsystem Models
        trajectory = TrajectorySubsystem(
            altitude_km=round(self.altitude_km, 2),
            downrange_distance_km=round(self.downrange_km, 2),
            velocity_kms=round(self.velocity_kms, 3),
            vertical_speed_ms=round(self.vertical_speed_ms, 1),
            horizontal_speed_ms=round(self.horizontal_speed_ms, 1),
            apogee_km=round(self.apogee_km, 1),
            perigee_km=round(self.perigee_km, 1),
            inclination_deg=51.64,
            flight_phase=self.flight_phase,
            dynamic_pressure_kpa=round(12.4, 2),
        )

        propulsion = PropulsionSubsystem(
            chamber_pressure_bar=round(self.chamber_pressure_bar, 2),
            feedline_pressure_bar=round(self.feedline_pressure_bar, 2),
            propellant_temp_c=round(self.propellant_temp_c, 1),
            thrust_kn=round(self.thrust_kn, 1),
            throttle_pct=round(self.throttle_pct, 1),
            fuel_remaining_pct=round(self.fuel_remaining_pct, 1),
            engine_state="ARMED_BURNING" if self.thrust_kn > 0 else "MECO_SHUTDOWN",
        )

        thermal = ThermalSubsystem(
            avionics_temp_c=round(self.avionics_temp_c, 2),
            battery_cell_temp_c=round(self.battery_cell_temp_c, 2),
            solar_array_temp_c=round(self.solar_array_temp_c, 2),
            nozzle_throat_temp_c=round(self.nozzle_throat_temp_c, 1),
        )

        electrical = ElectricalSubsystem(
            bus_voltage_v=round(self.bus_voltage_v, 2),
            bus_current_a=round(self.bus_current_a, 2),
            battery_soc_pct=round(self.battery_soc_pct, 1),
            solar_generation_w=round(self.solar_generation_w, 1),
            power_draw_w=round(self.power_draw_w, 1),
        )

        header = TelemetryHeader(
            sync_word="0x1ACFFC1D",
            packet_version=1,
            sequence_id=self.sequence_id,
            spacecraft_utc=spacecraft_utc,
            ground_station_utc=ground_utc,
            simulated_distance_km=distance_km,
            one_way_light_time_ms=latency_ms,
            clock_drift_ppm=drift_ppm,
            crc32_checksum=crc32_val,
        )

        return TelemetryPacket(
            header=header,
            trajectory=trajectory,
            propulsion=propulsion,
            thermal=thermal,
            electrical=electrical,
            fdir=fdir_state,
            source_mode=self.source_mode,
        )


telemetry_simulator = TelemetrySimulator()

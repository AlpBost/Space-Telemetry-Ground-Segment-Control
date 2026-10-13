"""
Orbital Dynamics, Propulsion & Flight State Telemetry Generator.
Supports:
1. Dynamic physical flight propagator (continuous numerical simulation with Gaussian noise).
2. Hardware-in-the-loop style Anomaly Injection.
3. CSV Replay mode (reading historical flight datasets).
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
        elif anomaly_type == "PRESSURE_DROP":
            self.pressure_drop_active = True
        elif anomaly_type == "VOLTAGE_SAG":
            self.voltage_sag_active = True
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
        """Advances physical state by dt seconds."""
        self.met_seconds += self.dt
        t = self.met_seconds

        # Flight Phase Progression
        if self.flight_phase != FlightPhase.ABORT:
            if self.altitude_km < 180.0:
                self.flight_phase = FlightPhase.BOOST_ASCENT
            elif self.altitude_km < 350.0:
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
            # Deplete propellant gradually
            self.fuel_remaining_pct = max(0.0, self.fuel_remaining_pct - (0.04 * self.dt))
        elif self.flight_phase == FlightPhase.ORBITAL_CRUISE:
            # Orbital cruise: steady altitude with slight orbital oscillation
            self.altitude_km = 408.0 + 3.5 * math.sin(t * 0.05)
            self.downrange_km += 7.66 * self.dt
            self.velocity_kms = 7.66 + 0.01 * math.sin(t * 0.1)

        # Dynamic Pressure (Max-Q curve approximation)
        q_factor = max(0.0, math.exp(-self.altitude_km / 12.0) * (self.velocity_kms**2))
        dynamic_pressure = round(q_factor * 18.0, 1)

        # ----------------- Propulsion Dynamics -----------------
        if self.flight_phase == FlightPhase.ABORT:
            self.chamber_pressure_bar = 0.0
            self.thrust_kn = 0.0
        elif self.pressure_drop_active:
            # Drop chamber pressure below nominal limits (<90 bar)
            self.chamber_pressure_bar = max(45.0, self.chamber_pressure_bar - 4.5 * self.dt)
            self.thrust_kn = max(60.0, self.thrust_kn - 8.0 * self.dt)
        else:
            # Normal combustion oscillation
            target_pressure = 126.0 if self.flight_phase == FlightPhase.BOOST_ASCENT else 0.0
            noise = random.gauss(0, 0.4)
            self.chamber_pressure_bar = max(0.0, target_pressure + noise)
            self.thrust_kn = 220.0 + random.gauss(0, 1.2) if target_pressure > 0 else 0.0

        # ----------------- Thermal Dynamics -----------------
        # Base sinusoidal thermal cycle mimicking sunlit / eclipse passes
        base_solar_temp = 54.0 + 12.0 * math.sin(t * 0.02)
        if self.thermal_runaway_active:
            # Rapid heating exceeding 75°C
            self.solar_array_temp_c = min(88.5, self.solar_array_temp_c + 2.5 * self.dt)
        else:
            # Cooling back towards nominal range (hysteresis clearance test)
            if self.solar_array_temp_c > base_solar_temp:
                self.solar_array_temp_c = max(base_solar_temp, self.solar_array_temp_c - 1.2 * self.dt)
            else:
                self.solar_array_temp_c = base_solar_temp + random.gauss(0, 0.2)

        self.avionics_temp_c = 38.0 + 2.0 * math.sin(t * 0.03) + random.gauss(0, 0.1)
        self.battery_cell_temp_c = 28.5 + 1.5 * math.sin(t * 0.01) + random.gauss(0, 0.05)

        # ----------------- Electrical Dynamics (EPS) -----------------
        if self.voltage_sag_active:
            self.bus_voltage_v = max(20.4, self.bus_voltage_v - 0.8 * self.dt)
        else:
            # Recovery to nominal 28.2V
            if self.bus_voltage_v < 28.2:
                self.bus_voltage_v = min(28.2, self.bus_voltage_v + 0.4 * self.dt)
            else:
                self.bus_voltage_v = 28.2 + random.gauss(0, 0.06)

        self.bus_current_a = 13.8 + random.gauss(0, 0.15)
        self.battery_soc_pct = max(15.0, 95.0 - (t * 0.005))
        self.solar_generation_w = 1520.0 + 80.0 * math.sin(t * 0.02) + random.gauss(0, 5.0)

    def load_csv_dataset(self, records: list[dict]):
        self.csv_records = records
        self.csv_index = 0

    def generate_packet(self) -> Optional[TelemetryPacket]:
        """Synthesizes or replays a telemetry packet and calculates FDIR & network parameters."""
        if network_physics.simulate_los:
            # Simulated Loss of Signal (LOS) - Ground station receives nothing
            return None

        self.sequence_id += 1

        if self.source_mode == "CSV_REPLAY" and self.csv_records:
            record = self.csv_records[self.csv_index]
            self.csv_index = (self.csv_index + 1) % len(self.csv_records)
            # Update internal state from CSV row
            self.altitude_km = float(record.get("altitude_km", self.altitude_km))
            self.velocity_kms = float(record.get("velocity_kms", self.velocity_kms))
            self.chamber_pressure_bar = float(record.get("chamber_pressure_bar", self.chamber_pressure_bar))
            self.solar_array_temp_c = float(record.get("solar_array_temp_c", self.solar_array_temp_c))
            self.bus_voltage_v = float(record.get("bus_voltage_v", self.bus_voltage_v))
        else:
            self.step_live_physics()

        # Network Physics calculation (OWLT latency + clock skew)
        distance_km, latency_ms = network_physics.calculate_distance_and_latency(
            self.altitude_km, self.downrange_km
        )
        spacecraft_utc, ground_utc, drift_ppm = network_physics.calculate_timestamps(latency_ms)

        # FDIR Rule Evaluation with Hysteresis
        fdir_state = fdir_engine.evaluate_telemetry(
            solar_temp=self.solar_array_temp_c,
            avionics_temp=self.avionics_temp_c,
            battery_temp=self.battery_cell_temp_c,
            chamber_pressure=self.chamber_pressure_bar,
            bus_voltage=self.bus_voltage_v,
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

        payload_summary = f"{self.sequence_id}-{self.altitude_km:.1f}-{self.velocity_kms:.2f}"
        crc32_val = network_physics.compute_crc32(payload_summary)

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

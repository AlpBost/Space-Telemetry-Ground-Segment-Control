"""
Network Physics & Relativity Simulation Module.
Calculates One-Way Light Time (OWLT: d/c), clock drift in PPM,
signal acquisition/loss (AOS/LOS), and CRC32 frame checksums.
"""

import zlib
import time
from datetime import datetime, timezone
from app.core.config import settings


class NetworkPhysicsEngine:
    def __init__(self):
        self.clock_drift_ppm: float = 2.4  # Spacecraft oscillator drift rate
        self.total_clock_skew_ms: float = 0.0
        self.last_sync_time: float = time.time()
        self.simulate_los: bool = False
        self.corrupt_next_packet: bool = False

    def calculate_distance_and_latency(self, altitude_km: float, downrange_km: float) -> tuple[float, float]:
        """
        Calculates slant range (distance between ground station and spacecraft)
        and One-Way Light Time (OWLT = distance / c in milliseconds).
        """
        slant_range_km = (altitude_km**2 + downrange_km**2)**0.5
        # One-Way Light Time (OWLT) in milliseconds: (distance / c) * 1000
        owlt_ms = (slant_range_km / settings.SPEED_OF_LIGHT_KMS) * 1000.0
        # Add simulated network layer buffer latency (e.g., 20-35ms ground network delay)
        total_latency_ms = owlt_ms + 25.0
        return round(slant_range_km, 2), round(total_latency_ms, 3)

    def calculate_timestamps(self, owlt_ms: float) -> tuple[str, str, float]:
        """
        Generates Spacecraft UTC and Ground Station UTC accounting for OWLT and clock drift.
        """
        now = time.time()
        elapsed = now - self.last_sync_time
        # Accumulated drift: drift_ppm * 10^-6 * elapsed seconds -> convert to ms
        self.total_clock_skew_ms += (self.clock_drift_ppm * 1e-6) * elapsed * 1000.0
        self.last_sync_time = now

        spacecraft_time = now
        ground_time = now + (owlt_ms / 1000.0) + (self.total_clock_skew_ms / 1000.0)

        spacecraft_utc = datetime.fromtimestamp(spacecraft_time, tz=timezone.utc).isoformat()
        ground_station_utc = datetime.fromtimestamp(ground_time, tz=timezone.utc).isoformat()

        return spacecraft_utc, ground_station_utc, round(self.clock_drift_ppm, 2)

    def compute_crc32(self, payload_str: str) -> tuple[str, bool]:
        """
        Computes 32-bit Cyclic Redundancy Check (CRC32).
        If corrupt_next_packet is True, introduces a bit-flip to simulate space radiation SEU.
        Returns a tuple of (crc32_hex_string, is_valid).
        """
        crc = zlib.crc32(payload_str.encode("utf-8")) & 0xFFFFFFFF
        is_valid = True
        if self.corrupt_next_packet:
            self.corrupt_next_packet = False
            crc ^= 0x00000001  # Flip least significant bit
            is_valid = False
        return f"0x{crc:08X}", is_valid

    def set_los_blackout(self, active: bool):
        self.simulate_los = active

    def trigger_corrupted_packet(self):
        self.corrupt_next_packet = True


network_physics = NetworkPhysicsEngine()

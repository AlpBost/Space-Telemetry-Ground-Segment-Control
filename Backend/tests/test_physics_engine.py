"""
Unit tests for physics engine and network latency / relativity calculations.
"""

import pytest
from app.services.telemetry_generator import TelemetrySimulator
from app.services.network_physics import NetworkPhysicsEngine


def test_packet_generation_bounds():
    sim = TelemetrySimulator()
    packet = sim.generate_packet()
    assert packet is not None
    assert packet.header.sync_word == "0x1ACFFC1D"
    assert packet.trajectory.altitude_km > 0
    assert packet.trajectory.velocity_kms >= 0
    assert packet.propulsion.chamber_pressure_bar >= 0


def test_speed_of_light_latency_calculation():
    net = NetworkPhysicsEngine()
    distance_km, latency_ms = net.calculate_distance_and_latency(altitude_km=400.0, downrange_km=300.0)
    assert distance_km == 500.0  # 3-4-5 triangle
    # OWLT = (500 / 299792.458) * 1000 ~= 1.668 ms + 25ms buffer ~= 26.668ms
    assert 25.0 < latency_ms < 30.0


def test_emergency_abort_behavior():
    sim = TelemetrySimulator()
    sim.emergency_abort()
    packet = sim.generate_packet()
    assert packet.trajectory.flight_phase.value == "ABORT"
    assert packet.propulsion.thrust_kn == 0.0
    assert packet.propulsion.chamber_pressure_bar == 0.0

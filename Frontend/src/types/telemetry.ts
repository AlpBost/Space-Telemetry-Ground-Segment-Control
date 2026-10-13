export type FlightPhase =
  | 'PRE_LAUNCH'
  | 'BOOST_ASCENT'
  | 'MECO'
  | 'STAGE_SEP'
  | 'SECOND_STAGE_BURN'
  | 'ORBIT_INSERTION'
  | 'ORBITAL_CRUISE'
  | 'ABORT';

export type AlarmSeverity = 'NOMINAL' | 'CAUTION' | 'WARNING' | 'CRITICAL';

export interface ActiveAlarm {
  alarm_id: string;
  subsystem: string;
  parameter: string;
  severity: AlarmSeverity;
  current_value: number;
  threshold_value: number;
  unit: string;
  message: string;
  timestamp_utc: string;
  acknowledged: boolean;
}

export interface FDIRStatus {
  overall_status: AlarmSeverity;
  active_alarms: ActiveAlarm[];
  checksum_valid: boolean;
  fdir_cycles_evaluated: number;
}

export interface TelemetryHeader {
  sync_word: string;
  packet_version: number;
  sequence_id: number;
  spacecraft_utc: string;
  ground_station_utc: string;
  simulated_distance_km: number;
  one_way_light_time_ms: number;
  clock_drift_ppm: number;
  crc32_checksum: string;
}

export interface TrajectorySubsystem {
  altitude_km: number;
  downrange_distance_km: number;
  velocity_kms: number;
  vertical_speed_ms: number;
  horizontal_speed_ms: number;
  apogee_km: number;
  perigee_km: number;
  inclination_deg: number;
  flight_phase: FlightPhase;
  dynamic_pressure_kpa: number;
}

export interface PropulsionSubsystem {
  chamber_pressure_bar: number;
  feedline_pressure_bar: number;
  propellant_temp_c: number;
  thrust_kn: number;
  throttle_pct: number;
  fuel_remaining_pct: number;
  engine_state: string;
}

export interface ThermalSubsystem {
  avionics_temp_c: number;
  battery_cell_temp_c: number;
  solar_array_temp_c: number;
  nozzle_throat_temp_c: number;
}

export interface ElectricalSubsystem {
  bus_voltage_v: number;
  bus_current_a: number;
  battery_soc_pct: number;
  solar_generation_w: number;
  power_draw_w: number;
}

export interface TelemetryPacket {
  header: TelemetryHeader;
  trajectory: TrajectorySubsystem;
  propulsion: PropulsionSubsystem;
  thermal: ThermalSubsystem;
  electrical: ElectricalSubsystem;
  fdir: FDIRStatus;
  source_mode: 'LIVE_SIMULATION' | 'CSV_REPLAY';
}

export interface HistoryPoint {
  timeLabel: string;
  altitude: number;
  velocity: number;
  chamberPressure: number;
  solarTemp: number;
  busVoltage: number;
}

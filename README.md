# Space Telemetry & Ground Segment Control (AERO-MCC)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_TypeScript-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![WebSocket](https://img.shields.io/badge/Downlink-WebSocket_10--50Hz-orange?style=flat)](https://datatracker.ietf.org/doc/html/rfc6455)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A real-time **Mission Control Center (MCC)** web application built for monitoring rocket and spacecraft telemetry. It handles live downlinks at **10 Hz to 50 Hz**, visualizes flight data, runs an automated fault detection engine (FDIR), and includes an uplink test rig with two-step command verification.

---

## 📸 Screenshots

| 1. Live Telemetry & Multi-Function Displays | 2. FDIR Engine & Fault Injection Rig |
| :---: | :---: |
| ![Live Telemetry MFD](<Ekran görüntüsü 2026-10-15 221113.png>) | ![FDIR & Fault Injection](<Ekran görüntüsü 2026-10-15 221123.png>) |
| *Real-time flight trajectory, chamber pressure, temperature matrix, and bus voltage.* | *Smart alarm engine using hysteresis to prevent false alarms from sensor noise.* |

---

## 🚀 Key Features

### 1. Live Telemetry Displays (MFD)
- **4 Flight Displays:**
  - **Trajectory:** Altitude, orbital velocity, apogee, and perigee with locked axes (0–450 km & 0–10 km/s) so graphs stay readable.
  - **Propulsion:** Chamber pressure ($P_c$) and engine thrust.
  - **Thermal:** Temperatures across solar panels, avionics, batteries, and engine nozzle.
  - **Electrical:** Main bus voltage ($V_{bus}$), current draw, solar power, and battery charge.
- **Time Window Filter:** Select between the **Last 30 seconds**, **1 minute**, or **2.5 minutes** of history.
- **Loss-of-Signal (LOS) Handling:** Graphs freeze and show a clear warning overlay when connection is lost.

### 2. Propulsion Schematic (P&ID)
- Visual diagram of the rocket engine's plumbing.
- Shows Liquid Oxygen (LOX), Rocket Fuel (RP-1), and Helium pressure lines.
- Live valve indicators (Open/Closed) and turbopump RPM monitoring.

### 3. Smart Alarm Engine (FDIR with Hysteresis)
- Uses **Schmidt Trigger hysteresis** to avoid "alarm chattering" (rapidly turning on and off when a value hovers around the threshold).
  - **Thermal Runaway:** Triggers at $\ge 75.0^\circ\text{C}$, but only resets once it cools down below $71.5^\circ\text{C}$ ($3.5^\circ\text{C}$ safety buffer).
  - **Pressure Loss:** Triggers below $90\text{ bar}$, only recovers after reaching $\ge 95\text{ bar}$.
  - **Low Voltage:** Triggers below $24.0\text{ V}$, recovers above $\ge 25.0\text{ V}$.
- Operators can acknowledge active alarms directly from the queue.

### 4. Raw Packet & Byte Inspector
- Decodes downlink frames with timestamps, sequence IDs, and CRC32 checksums.
- Includes a live hex dump viewer to inspect incoming bytes.
- Detects bit-flips (Single Event Upsets) when packets get corrupted.
- Features pause/resume, search by ID, and JSON export.

### 5. Command & Hardware Test Rig
- **Two-Man Rule (Arm & Fire):** Critical commands (like Emergency Abort) require an `ARM` step, which generates a 30-second token before the operator can `FIRE`.
- **Fault Injection Suite:** Test how the ground station handles failures by clicking buttons to inject:
  - Thermal Runaway ($>75^\circ\text{C}$)
  - Chamber Pressure Drop ($<90\text{ bar}$)
  - Main Bus Voltage Sag ($<24\text{ V}$)
  - Signal Loss (LOS)
  - Corrupted CRC32 Packet
- **Two Data Modes:**
  - **Live Simulation:** Generates continuous physics-based flight telemetry.
  - **Flight Log Replay:** Replays a 30-second flight log from a CSV file, then settles into a stable 408 km orbit cruise. Can be restarted anytime.

---

## 🛠️ Architecture & Tech Stack

```
[ Rocket Sensors / CSV Flight Log ]
                |
                v
  [ FastAPI Backend (Python) ]
  - Telemetry Generator & Physics
  - FDIR Hysteresis Engine
  - CRC32 Checksum Calculator
                |
        (WebSocket Downlink: 10Hz - 50Hz)
                v
  [ React 19 Frontend (TypeScript) ]
  - Dual Command Pipeline (WebSocket + REST)
  - Multi-Function Displays (Chart.js)
  - Clean English & Turkish (TR/EN) Language Toggle
```

- **Backend:** Python 3.10+, FastAPI, WebSockets, Uvicorn, NumPy
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Chart.js
- **Protocol:** WebSocket (RFC 6455) for low-latency streaming

---

## ⚡ How to Run

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Start the Backend
```bash
cd Backend

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```
> Backend runs at `http://localhost:8000`. WebSocket runs at `ws://localhost:8000/ws/telemetry`.

### 2. Start the Frontend
Open another terminal:
```bash
cd Frontend
npm install
npm run dev
```
> Open `http://localhost:5173` in your browser.

---

## 🌐 Language Support (i18n)

The dashboard includes full **English** and **Turkish** support. You can switch languages anytime from the bottom of the sidebar. All technical terms are translated cleanly without messy parentheses.

---

## 📦 Sample Telemetry Packet

Here is an example of the JSON packet received on every WebSocket tick:

```json
{
  "header": {
    "sync_marker": "0x1ACFFC1D",
    "sequence_id": 1420,
    "timestamp_utc": "2026-10-15T19:11:04.290Z",
    "flight_phase": "ORBITAL_CRUISE",
    "crc32_checksum": "0xA8F1C34B",
    "checksum_valid": true
  },
  "trajectory": {
    "altitude_km": 408.2,
    "orbital_velocity_kms": 7.66,
    "apogee_km": 412.0,
    "perigee_km": 404.5,
    "slant_range_km": 1240.8
  },
  "propulsion": {
    "chamber_pressure_bar": 105.4,
    "thrust_kn": 845.2,
    "propellant_temp_c": -182.4,
    "fuel_remaining_pct": 74.8,
    "main_fuel_valve": "OPEN",
    "main_ox_valve": "OPEN"
  },
  "thermal": {
    "solar_array_c": 48.2,
    "avionics_c": 32.1,
    "battery_cell_c": 26.4,
    "nozzle_throat_c": 642.0
  },
  "electrical": {
    "main_bus_voltage_v": 28.1,
    "bus_current_a": 18.4,
    "battery_charge_pct": 94.2,
    "solar_generation_w": 2850.0
  },
  "fdir": {
    "active_alarms": [],
    "fdir_cycles_evaluated": 1420
  }
}
```

---

## 📄 License

MIT License. Feel free to use this project as a reference for aerospace ground systems or telemetry dashboards.
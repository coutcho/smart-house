# Smart Home Safety & Emergency Response Application

A production-grade IoT environmental safety ecosystem and mobile emergency guidance platform.

- **Mobile Client**: React Native / Expo (JavaScript) with Dynamic Emergency Response Guidance.
- **Backend**: Node.js, Express.js REST API, Emergency Response Engine (ERE), Device Action Orchestrator.
- **Database & Cloud**: Google Cloud Firestore, Firebase Authentication, Firebase Cloud Messaging (FCM).
- **IoT Simulator**: Python 3 daemon for Lubuntu Linux servers.
- **Strict Scope**: Environmental hazards only (Combustible Gas, Smoke/Fire, High Temperature, Water Leakage). **All cameras, video streaming, and motion detection are strictly excluded.**
- **Emergency Localization**: Localized for Algerian emergency services: **Protection Civile (SOS 14)**, **Sonelgaz Urgence Gaz (3303)**, and **Police (17 / 1548)**.

---

## 1. Project Directory Structure

```text
smart-home-safety/
├── backend/                            # Node.js Express REST API & Emergency Response Engine
│   ├── src/
│   │   ├── config/                     # Firebase Admin SDK & Hazard Thresholds
│   │   ├── controllers/                # Sensor, Alert, Device & House Dashboard Controllers
│   │   ├── middleware/                 # API Key Auth, Firebase Auth & Payload Validators
│   │   ├── routes/                     # REST API Routes (/api/v1/*)
│   │   ├── services/                   # EmergencyEngine, DeviceOrchestrator, Watchdog, FCM
│   │   └── server.js                   # Server bootstrap & default seeder
│   └── tests/                          # 15 Unit and Integration Tests
│
├── simulator/                          # Lubuntu Linux Python 3 IoT Sensor Simulator
│   ├── config.json                     # Sensor baselines, intervals & backend host
│   ├── sensors.py                      # Physical sensor models (Gas, Smoke, Temp, Water)
│   ├── engine.py                       # HTTP POST & Heartbeat dispatch daemon
│   ├── cli.py                          # Interactive terminal hazard injection CLI
│   ├── smarthome-simulator.service     # Linux systemd background service
│   ├── service_lubuntu.sh              # One-click Lubuntu installer script
│   ├── README_LUBUNTU.md               # Detailed Lubuntu setup guide
│   └── tests/                          # 9 Unit & Live Backend Integration Tests
│
├── mobile/                             # React Native / Expo Mobile Application
│   ├── App.js                          # Root App with Providers & Status Bar
│   ├── src/
│   │   ├── components/                 # SafetyBadge, SensorCard, DeviceCard
│   │   ├── context/                    # AuthContext & SafetyContext
│   │   ├── navigation/                 # AppNavigator (Auth Stack + 5 Tabs + Emergency Modal)
│   │   ├── screens/
│   │   │   ├── Auth/                   # LoginScreen & RegisterScreen
│   │   │   ├── Dashboard/              # DashboardScreen (Real-time badge, SOS 14 button)
│   │   │   ├── Sensors/                # SensorsScreen (Telemetry grid with filters)
│   │   │   ├── Alerts/                 # ActiveAlertsScreen & EmergencyResponseScreen
│   │   │   ├── History/                # IncidentHistoryScreen (Resolution archive)
│   │   │   └── Settings/               # SettingsScreen (14, 3303, 17 hotlines & network config)
│   │   └── services/                   # api.js REST Client & firebase.js Auth Client
│   └── tests/                          # 9 Mobile State & SOS 14 Integration Tests
│
├── firebase/                           # Firestore Production Rules & Indexes
│   ├── firestore.rules                 # Security rules with role-based access
│   └── firestore.indexes.json          # Composite query indexes
│
├── tests/
│   └── e2eSystemScenarios.test.js      # Full 8-scenario system verification test suite
│
└── scripts/
    └── run_all_tests.js                # Master test runner (Runs all 41 project tests)
```

---

## 2. Quick Start & Execution

### A. Run All 41 Automated Tests
```bash
node scripts/run_all_tests.js
```

### B. Start the Backend Server
```bash
cd backend
npm start
# Server listens on http://localhost:5000
```
Health check endpoint: `GET http://localhost:5000/api/v1/system/health`

### C. Run the Python Simulator on Lubuntu Linux
```bash
cd simulator
python3 cli.py
```
- Press `[1]` to set all sensors to normal.
- Press `[2]` to inject a critical Gas Leak (triggers auto shutoff & evacuation checklist).
- Press `[3]` to inject a Smoke & Fire emergency.
- Press `[4]` to inject High Temperature.
- Press `[5]` to inject a Water Leak / Flood.
- Press `[6]` to simulate sensor disconnection.
- Press `[8]` to run continuous telemetry streaming.

### D. Run the Mobile Application (Expo)
```bash
cd mobile
npm start
```
- Press `w` to open in Web Browser.
- Or scan QR code with Expo Go on Android / iOS.
- Tap **"⚡ Quick Demo Sign In (Homeowner)"** for instantaneous testing.

---

## 3. The 8 Verified Safety Scenarios

1. **Normal Sensor Operation**: Ambient readings across all 4 sensors produce a green **"ALL SYSTEMS SECURE"** state with 0 active alerts.
2. **Gas Leakage Incident**: Spikes >400 ppm trigger a critical alert, prompt immediate evacuation, warn against operating light switches or powered fans, display one-touch dial buttons for **Protection Civile (14)** and **Sonelgaz (3303)**, and automatically close the gas valve (`DEV_GAS_VALVE_01`).
3. **Fire & Smoke Detection**: Obscuration index >150 activates the evacuation protocol, crawl-low instructions, **Protection Civile (14)** speed dial, and illuminates emergency egress lighting (`DEV_LIGHT_01`).
4. **High Temperature Hazard**: Thermal escalation >48°C alerts the homeowner to potential furnace runaway and provides a one-touch thermostat setback to 16°C (`DEV_THERMOSTAT_01`).
5. **Water Leakage Incident**: Moisture conductivity >0.7 alerts to standing water, warns of electrical shock hazards, and closes the main water supply valve (`DEV_WATER_VALVE_01`).
6. **Sensor Disconnection**: If a sensor fails to send heartbeats for >120s, the backend watchdog flags it as `offline` and creates a disconnection alert. Sending a heartbeat automatically restores it to online status.
7. **Notification Delivery**: Dispatches priority FCM multicast push alerts with siren audio and incident metadata to all household devices.
8. **Simulated Smart Device Actions & Audit Trail**: Every actuator command requires authentication, enforces safety interlocks (e.g. blocking opening gas valves during active leaks), simulates IoT latency, requires backend confirmation, and creates an immutable record in the `deviceActions` collection.

---

## 4. Emergency Contacts (Algeria)

| Service | Number | Protocol |
| :--- | :--- | :--- |
| **Protection Civile (Pompiers / SOS)** | **14** | Primary emergency response for fires, gas leaks, and life hazards. |
| **Sonelgaz (Dépannage Gaz)** | **3303** | Gas utility emergency response for gas main shutoffs and leaks. |
| **Police / Sûreté Nationale** | **17 / 1548** | Law enforcement and general safety dispatch. |

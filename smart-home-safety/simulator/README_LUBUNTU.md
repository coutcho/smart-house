# Lubuntu Linux IoT Sensor Simulator Setup Guide

This guide explains how to deploy and operate the **Smart Home Safety Sensor Simulator** on a Lubuntu Linux server or virtual machine.

---

## 1. Prerequisites on Lubuntu

Open a terminal in Lubuntu (`Ctrl + Alt + T` or from LXQt Application Menu) and ensure Python 3 is installed:

```bash
sudo apt update
sudo apt install -y python3 curl git
```

*(Note: The simulator uses Python 3 standard library modules `urllib.request`, `json`, `random`, and `time`. No external pip wheels are required for core execution.)*

---

## 2. Configuration (`config.json`)

Edit `config.json` to point to your backend server:

```json
{
  "backend": {
    "baseUrl": "http://<BACKEND_HOST_IP>:5000/api/v1",
    "apiKey": "smart_home_sensor_secret_key_2026",
    "houseId": "HOUSE_001",
    "telemetryIntervalSec": 5,
    "heartbeatIntervalSec": 10,
    "timeoutSec": 5
  }
}
```

> **Network Note:** If the backend runs on your host machine and Lubuntu runs in a VirtualBox/VMware/KVM guest:
> - For NAT mode: use the host bridge IP (e.g., `http://10.0.2.2:5000/api/v1` in VirtualBox).
> - For Bridged networking: use your host machine's LAN IP (e.g., `http://192.168.1.100:5000/api/v1`).

---

## 3. Interactive Operation (Manual Testing)

Run the interactive terminal CLI to trigger safety incidents on demand:

```bash
python3 cli.py
```

### Menu Options:
- `[1] Set ALL sensors to NORMAL`: Restores safe baseline readings.
- `[2] Trigger GAS LEAK`: Immediately escalates `SENS_GAS_01` into critical emergency (>420 ppm), triggering automated valve shutoff and evacuation plans.
- `[3] Trigger SMOKE & FIRE`: Triggers high particulate obscuration (>160 index).
- `[4] Trigger HIGH TEMPERATURE`: Triggers severe thermal spike (>50°C).
- `[5] Trigger WATER LEAK / FLOOD`: Sets conductivity to standing water (>0.85).
- `[6] Trigger SENSOR DISCONNECTION`: Halts telemetry & heartbeats to verify backend watchdog detection.
- `[7] Send Single Telemetry Step`: Sends a one-time probe.
- `[8] Run Continuous Telemetry Stream`: Starts periodic dispatch loop (default every 5s).

---

## 4. Background Service Operation (`systemd`)

To run the simulator automatically in the background on Lubuntu boot:

```bash
# 1. Run deployment installer
chmod +x service_lubuntu.sh
sudo ./service_lubuntu.sh

# 2. Enable and start systemd daemon
sudo systemctl enable smarthome-simulator
sudo systemctl start smarthome-simulator

# 3. Check live daemon status
sudo systemctl status smarthome-simulator

# 4. View live telemetry logs
journalctl -u smarthome-simulator -f
```

To stop or disable the daemon:
```bash
sudo systemctl stop smarthome-simulator
sudo systemctl disable smarthome-simulator
```

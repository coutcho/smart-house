"""
Simulation Engine for Lubuntu Linux IoT Gateway
Manages sensor lifecycles, computes values, and dispatches authenticated HTTP telemetry.
"""

import json
import logging
import time
import urllib.request
import urllib.error
from typing import Dict, List, Optional
from sensors import BaseSensor, create_sensor_from_config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("SimulatorEngine")


class SimulationEngine:
    def __init__(self, config_data: dict):
        self.config = config_data
        self.backend_cfg = config_data.get("backend", {})
        self.base_url = self.backend_cfg.get("baseUrl", "http://localhost:5000/api/v1")
        self.api_key = self.backend_cfg.get("apiKey", "smart_home_sensor_secret_key_2026")
        self.house_id = self.backend_cfg.get("houseId", "HOUSE_001")
        self.timeout = self.backend_cfg.get("timeoutSec", 5)

        self.sensors: Dict[str, BaseSensor] = {}
        for s_cfg in config_data.get("sensors", []):
            sensor = create_sensor_from_config(s_cfg)
            self.sensors[sensor.sensor_id] = sensor

        self.is_running = False
        self.last_heartbeat_time = 0.0

    def set_global_mode(self, mode: str):
        """Sets the simulation mode for all sensors simultaneously."""
        for sensor in self.sensors.values():
            sensor.set_mode(mode)
        logger.info(f"Global simulation mode set to: '{mode.upper()}'")

    def set_sensor_mode(self, sensor_id: str, mode: str):
        """Sets simulation mode for a specific sensor (e.g. trigger gas leak only)."""
        if sensor_id not in self.sensors:
            raise KeyError(f"Sensor '{sensor_id}' not found.")
        self.sensors[sensor_id].set_mode(mode)
        logger.info(f"Sensor '{sensor_id}' mode set to: '{mode.upper()}'")

    def step_and_send_all(self) -> List[dict]:
        """Steps all sensors and dispatches telemetry to backend."""
        results = []
        for sensor in self.sensors.values():
            if sensor.mode == "offline":
                logger.info(f"[Offline] Sensor {sensor.sensor_id} is simulating disconnected state (skipped).")
                continue

            value = sensor.step()
            payload = sensor.to_reading_payload(self.house_id)
            status, resp = self.send_http("/sensors/readings", payload)
            results.append({
                "sensorId": sensor.sensor_id,
                "type": sensor.sensor_type,
                "value": value,
                "unit": sensor.unit,
                "status": status,
                "response": resp
            })
        return results

    def send_heartbeats_all(self) -> List[dict]:
        """Dispatches keep-alive heartbeat for all online sensors."""
        results = []
        for sensor in self.sensors.values():
            if sensor.mode == "offline":
                continue  # Offline sensor sends NO heartbeats to trigger watchdog
            payload = sensor.to_heartbeat_payload(self.house_id)
            status, resp = self.send_http("/sensors/heartbeat", payload)
            results.append({
                "sensorId": sensor.sensor_id,
                "status": status,
                "response": resp
            })
        self.last_heartbeat_time = time.time()
        return results

    def send_http(self, endpoint: str, payload: dict) -> tuple:
        """
        Sends an authenticated HTTP POST request to backend using urllib.
        Zero third-party dependencies required.
        """
        url = f"{self.base_url.rstrip('/')}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "X-Sensor-API-Key": self.api_key
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                body = response.read().decode("utf-8")
                try:
                    parsed = json.loads(body)
                except Exception:
                    parsed = body
                return response.status, parsed
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            logger.error(f"HTTP Error {e.code} on {endpoint}: {err_body}")
            return e.code, {"error": err_body}
        except urllib.error.URLError as e:
            logger.warning(f"Connection failed to {url}: {e.reason}")
            return 0, {"error": str(e.reason)}
        except Exception as e:
            logger.error(f"Unexpected error posting to {url}: {e}")
            return -1, {"error": str(e)}

    def run_continuous_loop(self, duration_sec: Optional[float] = None, interval_sec: float = 5.0):
        """Runs the periodic simulation loop until stopped or duration expires."""
        self.is_running = True
        logger.info(f"Starting continuous telemetry loop (Interval: {interval_sec}s). Press Ctrl+C to stop.")
        start_time = time.time()

        try:
            while self.is_running:
                # Step readings
                readings = self.step_and_send_all()
                for r in readings:
                    val_str = f"{r['value']} {r['unit']}"
                    resp_info = r.get("response", {})
                    sev = resp_info.get("severity", "normal") if isinstance(resp_info, dict) else "ok"
                    logger.info(f"[{r['sensorId']}] Type: {r['type']:<11} | Reading: {val_str:<12} | Severity: {sev.upper():<8} | HTTP: {r['status']}")

                # Check heartbeat
                hb_interval = self.backend_cfg.get("heartbeatIntervalSec", 10)
                if (time.time() - self.last_heartbeat_time) >= hb_interval:
                    self.send_heartbeats_all()
                    logger.info("-> Dispatched heartbeats for all active sensors.")

                if duration_sec and (time.time() - start_time) >= duration_sec:
                    logger.info("Simulation target duration reached.")
                    break

                time.sleep(interval_sec)
        except KeyboardInterrupt:
            logger.info("Simulation loop paused by user.")
        finally:
            self.is_running = False

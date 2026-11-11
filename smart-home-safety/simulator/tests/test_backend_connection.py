"""
Live End-to-End Integration Test: Python Simulator -> Node.js Backend Ingestion
"""

import unittest
import subprocess
import time
import urllib.request
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from engine import SimulationEngine


class TestLiveBackendIngestion(unittest.TestCase):

    backend_proc = None
    server_port = 5055

    @classmethod
    def setUpClass(cls):
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend'))
        env = os.environ.copy()
        env["PORT"] = str(cls.server_port)
        env["NODE_ENV"] = "test"
        
        # Start backend on ephemeral port
        cls.backend_proc = subprocess.Popen(
            ["node", "src/server.js"],
            cwd=backend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to come online
        health_url = f"http://127.0.0.1:{cls.server_port}/api/v1/system/health"
        for _ in range(30):
            try:
                with urllib.request.urlopen(health_url, timeout=1) as resp:
                    if resp.status == 200:
                        break
            except Exception:
                time.sleep(0.2)
        else:
            cls.tearDownClass()
            raise RuntimeError(f"Backend failed to start on port {cls.server_port}")

    @classmethod
    def tearDownClass(cls):
        if cls.backend_proc:
            cls.backend_proc.terminate()
            cls.backend_proc.wait()

    def test_end_to_end_telemetry_and_heartbeats(self):
        config = {
            "backend": {
                "baseUrl": f"http://127.0.0.1:{self.server_port}/api/v1",
                "apiKey": "smart_home_sensor_secret_key_2026",
                "houseId": "HOUSE_001",
                "timeoutSec": 3
            },
            "sensors": [
                { "sensorId": "SENS_GAS_01", "type": "gas", "location": "Kitchen", "baseline": 12.0 },
                { "sensorId": "SENS_SMOKE_01", "type": "smoke", "location": "Living Room", "baseline": 2.0 },
                { "sensorId": "SENS_TEMP_01", "type": "temperature", "location": "Boiler Room", "baseline": 21.0 },
                { "sensorId": "SENS_WATER_01", "type": "water", "location": "Basement", "baseline": 0.0 }
            ]
        }

        engine = SimulationEngine(config)

        # 1. Normal mode telemetry step
        engine.set_global_mode("normal")
        readings = engine.step_and_send_all()
        self.assertEqual(len(readings), 4)
        for r in readings:
            self.assertEqual(r["status"], 201, f"Expected HTTP 201 from backend, got {r['status']}: {r}")
            self.assertEqual(r["response"]["severity"], "normal")

        # 2. Trigger critical Gas Leak
        engine.set_sensor_mode("SENS_GAS_01", "emergency")
        crit_readings = engine.step_and_send_all()
        gas_result = next(r for r in crit_readings if r["sensorId"] == "SENS_GAS_01")
        self.assertEqual(gas_result["status"], 201)
        self.assertEqual(gas_result["response"]["severity"], "critical")
        self.assertTrue(gas_result["response"]["alertGenerated"])
        self.assertIsNotNone(gas_result["response"]["automatedActionTaken"])

        # 3. Heartbeats
        hbs = engine.send_heartbeats_all()
        self.assertEqual(len(hbs), 4)
        for hb in hbs:
            self.assertEqual(hb["status"], 200)


if __name__ == "__main__":
    unittest.main()

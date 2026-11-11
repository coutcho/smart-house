"""
Unit and Integration Tests for Python Sensor Simulator
Uses standard library unittest.
"""

import unittest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sensors import (
    GasSensor,
    SmokeSensor,
    TemperatureSensor,
    WaterSensor,
    create_sensor_from_config
)
from engine import SimulationEngine


class TestSensors(unittest.TestCase):

    def test_gas_sensor_modes(self):
        sensor = GasSensor("SENS_GAS_01", "Kitchen", baseline=12.0)
        
        # Normal
        sensor.set_mode("normal")
        val = sensor.step()
        self.assertTrue(0.0 <= val <= 45.0, f"Normal gas reading out of bounds: {val}")

        # Warning (Threshold >= 100 ppm)
        sensor.set_mode("warning")
        val = sensor.step()
        self.assertGreaterEqual(val, 100.0, f"Warning gas reading too low: {val}")

        # Emergency (Threshold >= 400 ppm)
        sensor.set_mode("emergency")
        val = sensor.step()
        self.assertGreaterEqual(val, 400.0, f"Emergency gas reading too low: {val}")

    def test_smoke_sensor_modes(self):
        sensor = SmokeSensor("SENS_SMOKE_01", "Living Room", baseline=2.0)

        # Normal
        sensor.set_mode("normal")
        val = sensor.step()
        self.assertTrue(0.0 <= val <= 8.0, f"Normal smoke reading out of bounds: {val}")

        # Warning (Threshold >= 50)
        sensor.set_mode("warning")
        val = sensor.step()
        self.assertGreaterEqual(val, 50.0, f"Warning smoke reading too low: {val}")

        # Emergency (Threshold >= 150)
        sensor.set_mode("emergency")
        val = sensor.step()
        self.assertGreaterEqual(val, 150.0, f"Emergency smoke reading too low: {val}")

    def test_temperature_sensor_modes(self):
        sensor = TemperatureSensor("SENS_TEMP_01", "Boiler Room", baseline=21.5)

        # Normal
        sensor.set_mode("normal")
        val = sensor.step()
        self.assertTrue(18.0 <= val <= 25.0, f"Normal temp reading out of bounds: {val}")

        # Warning (Threshold >= 38.0 °C)
        sensor.set_mode("warning")
        val = sensor.step()
        self.assertGreaterEqual(val, 38.0, f"Warning temp reading too low: {val}")

        # Emergency (Threshold >= 48.0 °C)
        sensor.set_mode("emergency")
        val = sensor.step()
        self.assertGreaterEqual(val, 48.0, f"Emergency temp reading too low: {val}")

    def test_water_sensor_modes(self):
        sensor = WaterSensor("SENS_WATER_01", "Basement", baseline=0.0)

        # Normal (Dry)
        sensor.set_mode("normal")
        val = sensor.step()
        self.assertEqual(val, 0.0)

        # Warning (Moisture >= 0.3)
        sensor.set_mode("warning")
        val = sensor.step()
        self.assertGreaterEqual(val, 0.3)
        self.assertLess(val, 0.7)

        # Emergency (Standing Water >= 0.7)
        sensor.set_mode("emergency")
        val = sensor.step()
        self.assertGreaterEqual(val, 0.7)

    def test_strict_safety_rejection_of_cameras_and_motion(self):
        """Verifies that camera and motion types are strictly rejected."""
        with self.assertRaises(ValueError):
            create_sensor_from_config({"type": "camera", "sensorId": "CAM_01"})

        with self.assertRaises(ValueError):
            create_sensor_from_config({"type": "motion", "sensorId": "MOT_01"})

    def test_payload_format(self):
        sensor = GasSensor("SENS_GAS_01", "Kitchen", baseline=12.0)
        sensor.step()
        payload = sensor.to_reading_payload("HOUSE_001")

        self.assertEqual(payload["sensorId"], "SENS_GAS_01")
        self.assertEqual(payload["houseId"], "HOUSE_001")
        self.assertEqual(payload["type"], "gas")
        self.assertEqual(payload["location"], "Kitchen")
        self.assertEqual(payload["unit"], "ppm")
        self.assertIsInstance(payload["value"], float)
        self.assertIsInstance(payload["batteryLevel"], float)
        self.assertIn("timestamp", payload)


class TestSimulationEngine(unittest.TestCase):

    def setUp(self):
        self.mock_config = {
            "backend": {
                "baseUrl": "http://127.0.0.1:5000/api/v1",
                "apiKey": "test_key",
                "houseId": "HOUSE_TEST",
                "timeoutSec": 2
            },
            "sensors": [
                { "sensorId": "SENS_GAS_01", "type": "gas", "location": "Kitchen", "baseline": 12.0 },
                { "sensorId": "SENS_TEMP_01", "type": "temperature", "location": "Basement", "baseline": 20.0 }
            ]
        }
        self.engine = SimulationEngine(self.mock_config)

    def test_engine_initialization(self):
        self.assertEqual(len(self.engine.sensors), 2)
        self.assertIn("SENS_GAS_01", self.engine.sensors)
        self.assertIn("SENS_TEMP_01", self.engine.sensors)

    def test_mode_switching(self):
        self.engine.set_global_mode("warning")
        for s in self.engine.sensors.values():
            self.assertEqual(s.mode, "warning")

        self.engine.set_sensor_mode("SENS_GAS_01", "emergency")
        self.assertEqual(self.engine.sensors["SENS_GAS_01"].mode, "emergency")
        self.assertEqual(self.engine.sensors["SENS_TEMP_01"].mode, "warning")


if __name__ == "__main__":
    unittest.main()

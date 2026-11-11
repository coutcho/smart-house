"""
Sensors Module for Smart Home Safety Simulator
Simulates physical environmental sensors: Gas, Smoke, Temperature, and Water.
Strictly excludes all cameras, video streaming, and motion detection.
"""

import random
import time


class BaseSensor:
    """Base class for all simulated environmental sensors."""
    def __init__(self, sensor_id, sensor_type, location, unit, baseline=0.0, noise_std=1.0):
        self.sensor_id = sensor_id
        self.sensor_type = sensor_type
        self.location = location
        self.unit = unit
        self.baseline = baseline
        self.noise_std = noise_std
        self.mode = "normal"  # "normal" | "warning" | "emergency" | "offline"
        self.battery_level = round(random.uniform(92.0, 99.0), 1)
        self.current_value = baseline
        self.last_reading_time = time.time()
        self.step_counter = 0

    def set_mode(self, mode: str):
        valid_modes = ["normal", "warning", "emergency", "offline"]
        if mode not in valid_modes:
            raise ValueError(f"Invalid mode '{mode}'. Allowed: {valid_modes}")
        self.mode = mode
        self.step_counter = 0

    def step(self) -> float:
        """Computes the next telemetry reading based on active simulation mode."""
        self.step_counter += 1
        # Realistic slow battery drain (0.01% every 500 steps)
        if self.step_counter % 500 == 0 and self.battery_level > 5.0:
            self.battery_level = round(self.battery_level - 0.1, 1)

        self.current_value = self._calculate_value()
        self.last_reading_time = time.time()
        return self.current_value

    def _calculate_value(self) -> float:
        raise NotImplementedError("Subclasses must implement _calculate_value()")

    def to_reading_payload(self, house_id: str) -> dict:
        return {
            "sensorId": self.sensor_id,
            "houseId": house_id,
            "type": self.sensor_type,
            "location": self.location,
            "value": round(self.current_value, 2),
            "unit": self.unit,
            "batteryLevel": round(self.battery_level, 1),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.last_reading_time))
        }

    def to_heartbeat_payload(self, house_id: str) -> dict:
        return {
            "sensorId": self.sensor_id,
            "houseId": house_id,
            "type": self.sensor_type,
            "location": self.location,
            "batteryLevel": round(self.battery_level, 1)
        }


class GasSensor(BaseSensor):
    """
    Simulates flammable/toxic gas sensor (e.g. MQ-4 / MQ-7 / Figaro).
    Thresholds: Warning >= 100 ppm, Emergency >= 400 ppm.
    """
    def __init__(self, sensor_id, location, baseline=12.0, noise_std=2.0):
        super().__init__(sensor_id, "gas", location, "ppm", baseline, noise_std)

    def _calculate_value(self) -> float:
        if self.mode == "normal":
            # Baseline ambient noise around 8 - 25 ppm
            val = random.gauss(self.baseline, self.noise_std)
            return max(0.0, min(val, 45.0))

        elif self.mode == "warning":
            # Escalating leak approaching warning threshold (120 - 280 ppm)
            ramp = min(1.0, self.step_counter / 5.0)
            target = 150.0 + (ramp * 80.0) + random.uniform(-10.0, 15.0)
            return round(target, 2)

        elif self.mode == "emergency":
            # Severe gas line leak / pipe rupture (450 - 750 ppm)
            ramp = min(1.0, self.step_counter / 4.0)
            target = 420.0 + (ramp * 250.0) + random.uniform(-15.0, 40.0)
            return round(target, 2)

        return self.baseline


class SmokeSensor(BaseSensor):
    """
    Simulates photoelectric smoke and fire particulate sensor.
    Thresholds: Warning >= 50 index, Emergency >= 150 index.
    """
    def __init__(self, sensor_id, location, baseline=2.0, noise_std=0.5):
        super().__init__(sensor_id, "smoke", location, "obscuration_index", baseline, noise_std)

    def _calculate_value(self) -> float:
        if self.mode == "normal":
            # Ambient clear air
            val = random.gauss(self.baseline, self.noise_std)
            return max(0.0, min(val, 8.0))

        elif self.mode == "warning":
            # Smoldering ignition / early haze (55 - 95 index)
            ramp = min(1.0, self.step_counter / 4.0)
            target = 60.0 + (ramp * 30.0) + random.uniform(-5.0, 10.0)
            return round(target, 2)

        elif self.mode == "emergency":
            # Open flame / dense smoke flashover (160 - 320 index)
            ramp = min(1.0, self.step_counter / 3.0)
            target = 165.0 + (ramp * 130.0) + random.uniform(-10.0, 25.0)
            return round(target, 2)

        return self.baseline


class TemperatureSensor(BaseSensor):
    """
    Simulates high-precision digital thermal sensor (e.g. Dallas DS18B20).
    Thresholds: Warning >= 38.0 °C, Emergency >= 48.0 °C.
    """
    def __init__(self, sensor_id, location, baseline=21.5, noise_std=0.3):
        super().__init__(sensor_id, "temperature", location, "°C", baseline, noise_std)

    def _calculate_value(self) -> float:
        if self.mode == "normal":
            # Comfortable residential room temp (19.5 - 23.5 °C)
            val = random.gauss(self.baseline, self.noise_std)
            return round(val, 1)

        elif self.mode == "warning":
            # Overheating / furnace runaway (39.0 - 44.0 °C)
            ramp = min(1.0, self.step_counter / 6.0)
            target = 39.0 + (ramp * 4.5) + random.uniform(-0.5, 0.8)
            return round(target, 1)

        elif self.mode == "emergency":
            # Extreme thermal hazard / fire condition (50.0 - 72.0 °C)
            ramp = min(1.0, self.step_counter / 5.0)
            target = 50.0 + (ramp * 20.0) + random.uniform(-1.0, 2.0)
            return round(target, 1)

        return self.baseline


class WaterSensor(BaseSensor):
    """
    Simulates resistive conductivity water leak / flood detection probe.
    Thresholds: Warning >= 0.3 (moisture), Emergency >= 0.7 (standing water).
    """
    def __init__(self, sensor_id, location, baseline=0.0, noise_std=0.01):
        super().__init__(sensor_id, "water", location, "conductivity", baseline, noise_std)

    def _calculate_value(self) -> float:
        if self.mode == "normal":
            # Completely dry floor
            return 0.0

        elif self.mode == "warning":
            # Minor pipe condensation or surface seepage (0.35 - 0.55)
            return round(random.uniform(0.35, 0.55), 2)

        elif self.mode == "emergency":
            # Submerged sensor / burst pipe flood (0.85 - 1.00)
            return round(random.uniform(0.85, 1.00), 2)

        return 0.0


def create_sensor_from_config(cfg: dict) -> BaseSensor:
    """Factory helper to instantiate appropriate sensor instance from config."""
    s_type = cfg.get("type")
    s_id = cfg.get("sensorId")
    loc = cfg.get("location", "Home")
    base = cfg.get("baseline", 0.0)
    std = cfg.get("noiseStd", 1.0)

    if s_type == "gas":
        return GasSensor(s_id, loc, baseline=base, noise_std=std)
    elif s_type == "smoke":
        return SmokeSensor(s_id, loc, baseline=base, noise_std=std)
    elif s_type == "temperature":
        return TemperatureSensor(s_id, loc, baseline=base, noise_std=std)
    elif s_type == "water":
        return WaterSensor(s_id, loc, baseline=base, noise_std=std)
    else:
        raise ValueError(f"Unsupported sensor type: '{s_type}'. Note: Cameras and motion sensors are strictly excluded.")

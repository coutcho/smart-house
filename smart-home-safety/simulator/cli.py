#!/usr/bin/env python3
"""
Interactive CLI for Smart Home Safety Simulator
Supports interactive test scenario triggering and continuous telemetry streaming.
"""

import json
import os
import sys
from engine import SimulationEngine


def load_config() -> dict:
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    if not os.path.exists(config_path):
        print(f"Error: config.json not found at {config_path}")
        sys.exit(1)
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def print_banner():
    print("=" * 68)
    print("      SMART HOME SAFETY & EMERGENCY RESPONSE SIMULATOR")
    print("              Lubuntu Linux IoT Gateway Daemon")
    print("    (Strict Safety: Gas | Smoke | Temp | Water - No Cameras/Motion)")
    print("=" * 68)


def print_status(engine: SimulationEngine):
    print("\nCURRENT SENSOR STATUS:")
    print(f"{'Sensor ID':<16} {'Type':<12} {'Location':<24} {'Mode':<10} {'Battery':<8}")
    print("-" * 72)
    for s in engine.sensors.values():
        print(f"{s.sensor_id:<16} {s.sensor_type:<12} {s.location:<24} {s.mode.upper():<10} {s.battery_level}%")
    print("-" * 72)
    print(f"Target Backend: {engine.base_url} (House: {engine.house_id})\n")


def main():
    config = load_config()
    engine = SimulationEngine(config)

    print_banner()

    while True:
        print_status(engine)
        print("SIMULATION CONTROL MENU:")
        print("  [1] Set ALL sensors to NORMAL (Safe baseline)")
        print("  [2] Trigger GAS LEAK (Critical Emergency - Evacuation & Shutoff)")
        print("  [3] Trigger SMOKE & FIRE Incident (Emergency Evacuation)")
        print("  [4] Trigger HIGH TEMPERATURE (Thermal Hazard & Thermostat Setback)")
        print("  [5] Trigger WATER LEAK / FLOOD (Water Valve Shutoff)")
        print("  [6] Trigger SENSOR DISCONNECTION (Simulate offline watchdog alert)")
        print("  [7] Send Single Telemetry Step (One-shot probe)")
        print("  [8] Run Continuous Telemetry Stream (Loop every 5s)")
        print("  [9] Dispatch Heartbeats Now")
        print("  [Q] Exit Simulator")
        print("=" * 68)

        choice = input("Select an option (1-9, Q): ").strip().upper()

        if choice == "1":
            engine.set_global_mode("normal")
            print(">> All sensors set to NORMAL.")
            engine.step_and_send_all()

        elif choice == "2":
            engine.set_sensor_mode("SENS_GAS_01", "emergency")
            print(">> GAS LEAK EMERGENCY triggered on SENS_GAS_01!")
            engine.step_and_send_all()

        elif choice == "3":
            engine.set_sensor_mode("SENS_SMOKE_01", "emergency")
            print(">> SMOKE & FIRE EMERGENCY triggered on SENS_SMOKE_01!")
            engine.step_and_send_all()

        elif choice == "4":
            engine.set_sensor_mode("SENS_TEMP_01", "emergency")
            print(">> HIGH TEMPERATURE HAZARD triggered on SENS_TEMP_01!")
            engine.step_and_send_all()

        elif choice == "5":
            engine.set_sensor_mode("SENS_WATER_01", "emergency")
            print(">> WATER LEAK / FLOOD EMERGENCY triggered on SENS_WATER_01!")
            engine.step_and_send_all()

        elif choice == "6":
            engine.set_sensor_mode("SENS_GAS_01", "offline")
            print(">> SENS_GAS_01 set to OFFLINE. Heartbeats halted to test watchdog.")

        elif choice == "7":
            print(">> Sending one step of telemetry...")
            readings = engine.step_and_send_all()
            for r in readings:
                print(f"   {r['sensorId']} -> {r['value']} {r['unit']} | HTTP: {r['status']}")

        elif choice == "8":
            interval = float(input("Enter stream interval in seconds (default 5.0): ") or "5.0")
            engine.run_continuous_loop(interval_sec=interval)

        elif choice == "9":
            print(">> Dispatching heartbeats...")
            hbs = engine.send_heartbeats_all()
            for hb in hbs:
                print(f"   {hb['sensorId']} -> HTTP: {hb['status']}")

        elif choice == "Q":
            print("Exiting simulator. Stay safe!")
            break

        else:
            print("Invalid selection. Please choose a valid menu number.")


if __name__ == "__main__":
    main()

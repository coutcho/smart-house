#!/usr/bin/env bash
# ==============================================================================
# Lubuntu Linux Deployment Script for Smart Home Sensor Simulator
# ==============================================================================

set -e

echo "=== Installing Smart Home Safety IoT Simulator on Lubuntu Linux ==="

# 1. Ensure Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip
fi

INSTALL_DIR="/opt/smart-home-safety/simulator"

# 2. Create target directory
echo "Creating installation directory: $INSTALL_DIR"
sudo mkdir -p "$INSTALL_DIR"

# 3. Copy simulator files
echo "Copying simulator scripts..."
sudo cp "$(dirname "$0")/sensors.py" "$INSTALL_DIR/"
sudo cp "$(dirname "$0")/engine.py" "$INSTALL_DIR/"
sudo cp "$(dirname "$0")/cli.py" "$INSTALL_DIR/"
sudo cp "$(dirname "$0")/config.json" "$INSTALL_DIR/"

# 4. Install systemd service
echo "Configuring systemd service..."
sudo cp "$(dirname "$0")/smarthome-simulator.service" /etc/systemd/system/
sudo systemctl daemon-reload

echo "=== Installation Complete ==="
echo "To run interactively:"
echo "    python3 $INSTALL_DIR/cli.py"
echo ""
echo "To start as background systemd service:"
echo "    sudo systemctl enable smarthome-simulator"
echo "    sudo systemctl start smarthome-simulator"
echo "    sudo systemctl status smarthome-simulator"
echo ""
echo "To view live logs:"
echo "    journalctl -u smarthome-simulator -f"

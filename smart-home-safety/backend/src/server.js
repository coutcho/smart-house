/**
 * Smart Home Safety & Emergency Response Application
 * Backend API Server Bootstrap
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { db, isEmulated } = require("./config/firebase");
const watchdogService = require("./services/watchdogService");

const sensorRoutes = require("./routes/sensorRoutes");
const alertRoutes = require("./routes/alertRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const houseRoutes = require("./routes/houseRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// 1. FIXED CORS CONFIGURATION FOR iOS & ANDROID
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

// Express OPTIONS pre-flight handler for iOS fetch compatibility
app.options("*", cors());

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl !== "/api/v1/system/health") {
      console.log(
        `[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`,
      );
    }
  });
  next();
});

// Health check endpoint
app.get("/api/v1/system/health", (req, res) => {
  res.json({
    status: "ONLINE",
    service: "Smart Home Safety Backend",
    timestamp: new Date().toISOString(),
    firebaseEmulated: isEmulated,
    monitoredHazards: ["gas", "smoke", "temperature", "water"],
  });
});

// 2. API ROUTES (Versioned)
app.use("/api/v1/sensors", sensorRoutes);
app.use("/api/v1/alerts", alertRoutes);
app.use("/api/v1/devices", deviceRoutes);
app.use("/api/v1/houses", houseRoutes);

// 3. FALLBACK ALIAS ROUTES (To support clients calling without /api/v1 prefix)
app.use("/sensors", sensorRoutes);
app.use("/alerts", alertRoutes);
app.use("/devices", deviceRoutes);
app.use("/houses", houseRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/houses", houseRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[ServerError]", err);
  res
    .status(500)
    .json({ error: "Internal Server Error", message: err.message });
});

/**
 * Seed initial baseline devices, sensors and house if empty
 */
async function seedInitialData() {
  const houseId = process.env.DEFAULT_HOUSE_ID || "HOUSE_001";

  // 1. House
  const houseRef = db.collection("houses").doc(houseId);
  const houseSnap = await houseRef.get();
  if (!houseSnap.exists) {
    await houseRef.set({
      houseId,
      name: "SafeHome Main Residence",
      ownerId: "USER_PRIMARY_01",
      memberIds: ["USER_PRIMARY_01", "USER_FAMILY_02"],
      emergencySettings: {
        autoShutoffGasOnEmergency: true,
        autoShutoffWaterOnEmergency: true,
        emergencyFirePhone: "14",
        emergencyGasPhone: "3303",
      },
      createdAt: new Date().toISOString(),
    });
    console.log(`[Seed] Seeded default house '${houseId}'.`);
  }

  // 2. Sensors
  const defaultSensors = [
    {
      sensorId: "SENS_GAS_01",
      houseId,
      type: "gas",
      location: "Kitchen / Range Area",
      status: "normal",
      batteryLevel: 98,
      lastValue: 12.4,
      unit: "ppm",
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
    },
    {
      sensorId: "SENS_SMOKE_01",
      houseId,
      type: "smoke",
      location: "Living Room Ceiling",
      status: "normal",
      batteryLevel: 95,
      lastValue: 2.1,
      unit: "obscuration_index",
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
    },
    {
      sensorId: "SENS_TEMP_01",
      houseId,
      type: "temperature",
      location: "Boiler / Utility Room",
      status: "normal",
      batteryLevel: 92,
      lastValue: 21.5,
      unit: "°C",
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
    },
    {
      sensorId: "SENS_WATER_01",
      houseId,
      type: "water",
      location: "Basement Water Heater",
      status: "normal",
      batteryLevel: 99,
      lastValue: 0.0,
      unit: "conductivity",
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
    },
  ];

  for (const s of defaultSensors) {
    const sRef = db.collection("sensors").doc(s.sensorId);
    const snap = await sRef.get();
    if (!snap.exists) {
      await sRef.set(s);
      console.log(
        `[Seed] Seeded sensor '${s.sensorId}' (${s.type} in ${s.location}).`,
      );
    }
  }

  // 3. Actuator Devices
  const defaultDevices = [
    {
      deviceId: "DEV_GAS_VALVE_01",
      houseId,
      name: "Main Gas Supply Solenoid Valve",
      type: "gas_valve",
      location: "Exterior Meter Box",
      state: { valveOpen: true },
      isOnline: true,
    },
    {
      deviceId: "DEV_WATER_VALVE_01",
      houseId,
      name: "Main Domestic Water Shutoff Valve",
      type: "water_valve",
      location: "Basement Water Main",
      state: { valveOpen: true },
      isOnline: true,
    },
    {
      deviceId: "DEV_THERMOSTAT_01",
      houseId,
      name: "Central Climate Thermostat",
      type: "heating_thermostat",
      location: "Hallway",
      state: { targetTemp: 21.0, heatingOn: true },
      isOnline: true,
    },
    {
      deviceId: "DEV_LIGHT_01",
      houseId,
      name: "Egress Pathway Safety Lighting",
      type: "smart_light",
      location: "Hallways & Exits",
      state: { lightOn: false },
      isOnline: true,
    },
  ];

  for (const d of defaultDevices) {
    const dRef = db.collection("devices").doc(d.deviceId);
    const snap = await dRef.get();
    if (!snap.exists) {
      await dRef.set(d);
      console.log(`[Seed] Seeded smart actuator '${d.deviceId}' (${d.name}).`);
    }
  }
}

// Start Server
let server = null;
if (require.main === module) {
  seedInitialData().then(() => {
    const checkInterval =
      (parseInt(process.env.WATCHDOG_CHECK_INTERVAL_SEC, 10) || 15) * 1000;
    watchdogService.start(checkInterval);

    // Bind to 0.0.0.0 explicitly so network interfaces respond to iOS calls
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`===================================================`);
      console.log(`  Smart Home Safety & Emergency Response Backend   `);
      console.log(`  Listening on: http://0.0.0.0:${PORT}              `);
      console.log(`  Environment: ${process.env.NODE_ENV}            `);
      console.log(`===================================================`);
    });
  });
}

module.exports = { app, seedInitialData };

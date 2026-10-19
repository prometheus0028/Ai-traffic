/**
 * AI Traffic Command Center - Configuration & Constants
 */

export const CONFIG = {
  // Global Simulation Settings
  SIMULATION: {
    FPS: 60,
    DEFAULT_SPEED: 1.0,
    MAX_SPEED: 5.0,
    DEFAULT_SPAWN_RATE: 0.65, // Probability per lane per second
    VEHICLE_SPEED_LIMIT: 45, // Virtual km/h
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 800,
    HISTORY_MAX_POINTS: 30, // Telemetry history window for charts
  },

  // Traffic Light Timing Defaults (Seconds)
  SIGNAL_TIMING: {
    MIN_GREEN: 6,
    MAX_GREEN: 45,
    FIXED_GREEN: 22,
    DEFAULT_GREEN: 15,
    YELLOW: 3,
    ALL_RED_CLEARANCE: 2,
    PEDESTRIAN_WALK: 12,
  },

  // AI Decision Engine Weights (Max-Pressure Model)
  AI_WEIGHTS: {
    QUEUE_LENGTH: 2.2,
    WAIT_TIME: 1.5,
    ARRIVAL_RATE: 1.0,
    EMERGENCY_PRIORITY: 100.0,
    GREEN_WAVE_BONUS: 15.0,
    MIN_PRESSURE_DIFF_TO_SWITCH: 2.5, // Sensitive responsive threshold to adapt immediately
    EXTENSION_STEP_SECONDS: 3,
  },

  // Prediction Parameters
  PREDICTION: {
    HORIZONS: [5, 10, 15], // Minutes ahead
    ALPHA_SMOOTHING: 0.35,
    MOMENTUM_WEIGHT: 0.65,
    BOTTLENECK_THRESHOLD: 80, // % congestion
  },

  // Vehicle Types & Specs
  VEHICLES: {
    TYPES: {
      SEDAN: { name: 'Sedan', length: 28, width: 14, color: '#38bdf8', weight: 1.0, accel: 2.2, maxSpeed: 4.0 },
      SUV: { name: 'SUV', length: 32, width: 16, color: '#818cf8', weight: 1.2, accel: 2.0, maxSpeed: 3.8 },
      EV: { name: 'EV', length: 28, width: 14, color: '#34d399', weight: 1.0, accel: 2.8, maxSpeed: 4.2 },
      BUS: { name: 'City Bus', length: 50, width: 18, color: '#fbbf24', weight: 3.0, accel: 1.2, maxSpeed: 2.8 },
      TRUCK: { name: 'Delivery Truck', length: 44, width: 17, color: '#fb923c', weight: 2.2, accel: 1.4, maxSpeed: 3.0 },
      AMBULANCE: { name: 'Ambulance', length: 36, width: 16, color: '#ef4444', isEmergency: true, priority: 1, accel: 3.5, maxSpeed: 5.2 },
      FIRE_TRUCK: { name: 'Fire Engine', length: 54, width: 19, color: '#dc2626', isEmergency: true, priority: 2, accel: 2.5, maxSpeed: 4.5 },
      POLICE: { name: 'Police Interceptor', length: 30, width: 15, color: '#2563eb', isEmergency: true, priority: 3, accel: 3.8, maxSpeed: 5.5 },
    },
  },

  // Downtown Intersection Specification
  INTERSECTIONS: [
    {
      id: 'int-downtown',
      name: 'Downtown Central',
      district: 'Commercial Core',
      type: '4-WAY-BALANCED',
      description: 'High-density 4-way intersection connecting Financial Plaza and Transit Hub.',
      lanesPerApproach: 3, // Left, Straight, Right
      speedLimit: 40,
      baselineCongestion: 65,
      coordinates: { x: 400, y: 400 },
      connectedTo: [],
    },
  ],

  // Hackathon Demo Presets
  PRESETS: {
    BALANCED: {
      id: 'preset-balanced',
      name: 'Standard Normal Traffic',
      description: 'Moderate uniform traffic across Downtown approaches.',
      spawnMultipliers: { N: 1.0, S: 1.0, E: 1.0, W: 1.0 },
      emergencyChance: 0.02,
    },
    RUSH_HOUR: {
      id: 'preset-rush-hour',
      name: '⚡ Morning Rush Hour Surge',
      description: 'Heavy North-to-South commuter influx simulating peak morning gridlock.',
      spawnMultipliers: { N: 2.8, S: 1.8, E: 0.6, W: 0.7 },
      emergencyChance: 0.03,
    },
    EMERGENCY_RUSH: {
      id: 'preset-emergency',
      name: '🚑 Code Red: Emergency Rush',
      description: 'Multiple active emergency vehicles dispatched requiring immediate green corridor clearance.',
      spawnMultipliers: { N: 1.2, S: 1.2, E: 1.2, W: 1.2 },
      emergencyChance: 0.40,
    },
    INCIDENT_BOTTLENECK: {
      id: 'preset-incident',
      name: '🚧 Lane Bottleneck & Stalled Vehicle',
      description: 'Eastbound lane partially obstructed, triggering AI adaptive queue bleed-off.',
      spawnMultipliers: { N: 1.0, S: 1.0, E: 2.5, W: 1.2 },
      emergencyChance: 0.05,
      laneBlock: { approach: 'E', lane: 1 },
    },
    RAIN_WEATHER: {
      id: 'preset-rain',
      name: '🌧️ Storm Weather & Reduced Headway',
      description: 'Slippery road conditions, reduced speeds, and longer braking distances.',
      spawnMultipliers: { N: 1.3, S: 1.3, E: 1.3, W: 1.3 },
      speedFactor: 0.75,
      emergencyChance: 0.04,
    },
  },

  // Environmental Impact Coefficients
  EMISSIONS: {
    IDLE_CO2_PER_SEC: 0.85, // grams of CO2 per idle vehicle second
    FLOW_CO2_PER_KM: 120.0, // grams of CO2 per vehicle km at optimal flow
    FUEL_COST_PER_LITER: 1.50, // USD
  }
};

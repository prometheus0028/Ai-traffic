/**
 * AI Traffic Command Center - Central Reactive State Store & Event Bus
 */

import { CONFIG } from '../config.js';

class StateStore {
  constructor() {
    this.state = {
      // Core simulation flags
      isRunning: true,
      simulationSpeed: CONFIG.SIMULATION.DEFAULT_SPEED,
      isAiMode: true, // True = AI Adaptive Controller, False = Static Fixed Timers
      currentPreset: 'BALANCED',
      activeIntersectionId: 'int-downtown',
      selectedApproach: null, // For manual inspection
      audioMuted: false,

      // Live Telemetry Aggregates (City-wide & Active Node)
      metrics: {
        totalVehiclesSpawned: 0,
        totalVehiclesCompleted: 0,
        currentActiveVehicles: 0,
        averageWaitTimeAI: 0, // seconds
        averageWaitTimeFixed: 0, // baseline benchmark comparison
        currentCongestion: 0, // 0 - 100%
        throughputPerMinute: 0,
        co2SavedKg: 0,
        totalEmergenciesHandled: 0,
        emergencyAvgClearanceTime: 0, // seconds
      },

      // Historical time-series data for live charts
      history: {
        timestamps: [],
        aiWaitTimes: [],
        fixedWaitTimes: [],
        congestionLevels: [],
        throughput: [],
        co2Savings: [],
      },

      // Explainable AI Decision Log
      aiDecisions: [],

      // Active Emergency Corridor States
      activeEmergency: null, // { vehicleId, intersectionId, approach, timeElapsed }

      // Predictions Cache (5m, 10m, 15m)
      predictions: {
        'int-downtown': { 5: 42, 10: 48, 15: 55, trend: 'increasing' },
      },
    };

    this.listeners = new Map();
  }

  /**
   * Subscribe to state changes or specific events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event with payload
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data, this.state);
        } catch (err) {
          console.error(`Error in event listener for [${event}]:`, err);
        }
      });
    }
    // Also emit wildcard event
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach((cb) => cb(event, data, this.state));
    }
  }

  /**
   * Get immutable snapshot of current state
   */
  getState() {
    return this.state;
  }

  /**
   * Toggle between AI Mode and Fixed-Timer Baseline Mode
   */
  setAiMode(enabled) {
    this.state.isAiMode = enabled;
    this.emit('ai-mode-changed', enabled);
  }

  /**
   * Set active focused intersection in the 2D visualizer
   */
  setActiveIntersection(intersectionId) {
    this.state.activeIntersectionId = intersectionId;
    this.emit('intersection-changed', intersectionId);
  }

  /**
   * Set simulation speed multiplier (1x, 2x, 5x)
   */
  setSpeed(speed) {
    this.state.simulationSpeed = speed;
    this.emit('speed-changed', speed);
  }

  /**
   * Toggle pause/resume
   */
  togglePlayPause() {
    this.state.isRunning = !this.state.isRunning;
    this.emit('play-pause-changed', this.state.isRunning);
    return this.state.isRunning;
  }

  /**
   * Set demo scenario preset
   */
  setPreset(presetKey) {
    this.state.currentPreset = presetKey;
    this.emit('preset-changed', presetKey);
  }

  /**
   * Log an AI decision with Explainable AI rationale
   */
  addAIDecision(decision) {
    const entry = {
      id: 'dec-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date(),
      ...decision,
    };
    this.state.aiDecisions.unshift(entry);
    if (this.state.aiDecisions.length > 50) {
      this.state.aiDecisions.pop();
    }
    this.emit('ai-decision-added', entry);
  }

  /**
   * Push telemetry snapshot for real-time charts
   */
  recordTelemetry(snapshot) {
    const timeLabel = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const h = this.state.history;
    h.timestamps.push(timeLabel);
    h.aiWaitTimes.push(snapshot.avgWaitTimeAI);
    h.fixedWaitTimes.push(snapshot.avgWaitTimeFixed);
    h.congestionLevels.push(snapshot.congestion);
    h.throughput.push(snapshot.throughput);
    h.co2Savings.push(snapshot.co2SavedKg);

    if (h.timestamps.length > CONFIG.SIMULATION.HISTORY_MAX_POINTS) {
      h.timestamps.shift();
      h.aiWaitTimes.shift();
      h.fixedWaitTimes.shift();
      h.congestionLevels.shift();
      h.throughput.shift();
      h.co2Savings.shift();
    }

    // Update current aggregate metrics
    this.state.metrics.averageWaitTimeAI = snapshot.avgWaitTimeAI;
    this.state.metrics.averageWaitTimeFixed = snapshot.avgWaitTimeFixed;
    this.state.metrics.currentCongestion = snapshot.congestion;
    this.state.metrics.throughputPerMinute = snapshot.throughput;
    this.state.metrics.co2SavedKg = snapshot.co2SavedKg;
    this.state.metrics.currentActiveVehicles = snapshot.activeVehicles;

    this.emit('telemetry-updated', snapshot);
  }

  /**
   * Update emergency vehicle status
   */
  setEmergencyStatus(emergencyData) {
    this.state.activeEmergency = emergencyData;
    this.emit('emergency-status-changed', emergencyData);
  }

  /**
   * Update future predictions
   */
  setPredictions(intersectionId, predictionData) {
    this.state.predictions[intersectionId] = predictionData;
    this.emit('predictions-updated', { intersectionId, predictionData });
  }
}

export const store = new StateStore();

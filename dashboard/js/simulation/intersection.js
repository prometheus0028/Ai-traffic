/**
 * AI Traffic Command Center - Intersection Model & Signal State Machine
 */

import { CONFIG } from '../config.js';

export const PHASES = {
  NS_GREEN: 'PHASE_NS_GREEN',
  NS_LEFT: 'PHASE_NS_LEFT',
  EW_GREEN: 'PHASE_EW_GREEN',
  EW_LEFT: 'PHASE_EW_LEFT',
  EMERGENCY: 'PHASE_EMERGENCY',
};

export class Intersection {
  constructor(config = {}) {
    this.id = config.id || 'int-downtown';
    this.name = config.name || 'Downtown Central';
    this.district = config.district || 'Commercial Core';
    this.type = config.type || '4-WAY-BALANCED';
    this.description = config.description || '';
    this.center = config.coordinates || { x: 400, y: 400 };
    this.lanesPerApproach = config.lanesPerApproach || 3;
    this.speedLimit = config.speedLimit || 40;

    // Road Dimensions & Geometry
    this.roadWidth = 160;
    this.laneWidth = this.roadWidth / (this.lanesPerApproach * 2);

    // Active Signal Phase State Machine
    this.currentPhase = PHASES.NS_GREEN;
    this.nextPhase = PHASES.EW_GREEN;
    this.phaseTimer = 0; // Time in current green
    this.allocatedGreenTime = CONFIG.SIGNAL_TIMING.DEFAULT_GREEN;

    // Amber & Clearance state
    this.isAmber = false;
    this.amberTimer = 0;
    this.isAllRed = false;
    this.allRedTimer = 0;

    // Emergency Preemption State
    this.emergencyState = {
      active: false,
      approach: null,
      vehicleId: null,
      timeRemaining: 0,
      originalPhase: PHASES.NS_GREEN,
    };

    // Manual Signal Overrides (null, 'GREEN', 'RED')
    this.manualOverrides = {
      N: null,
      S: null,
      E: null,
      W: null,
    };

    // Sensor Telemetry per Approach
    this.approaches = {
      N: { vehicleCount: 0, queueCount: 0, avgWaitTime: 0, totalWaitTime: 0, inflowRate: 0, recentDepartures: 0 },
      S: { vehicleCount: 0, queueCount: 0, avgWaitTime: 0, totalWaitTime: 0, inflowRate: 0, recentDepartures: 0 },
      E: { vehicleCount: 0, queueCount: 0, avgWaitTime: 0, totalWaitTime: 0, inflowRate: 0, recentDepartures: 0 },
      W: { vehicleCount: 0, queueCount: 0, avgWaitTime: 0, totalWaitTime: 0, inflowRate: 0, recentDepartures: 0 },
    };

    // Statistics
    this.totalVehiclesPassed = 0;
    this.congestionScore = config.baselineCongestion || 35; // 0 - 100%
  }

  /**
   * Advance intersection signal controller by dt seconds
   */
  update(dt, isAiMode = true) {
    if (this.externalSignals) return;
    // 1. Handle Emergency Preemption Countdown
    if (this.emergencyState.active) {
      this.emergencyState.timeRemaining -= dt;
      if (this.emergencyState.timeRemaining <= 0) {
        this.clearEmergencyPreemption();
      }
      return;
    }

    // 2. Handle All-Red Clearance interval
    if (this.isAllRed) {
      this.allRedTimer += dt;
      if (this.allRedTimer >= CONFIG.SIGNAL_TIMING.ALL_RED_CLEARANCE) {
        this.isAllRed = false;
        this.allRedTimer = 0;
        this.currentPhase = this.nextPhase;
        this.phaseTimer = 0;
      }
      return;
    }

    // 3. Handle Amber interval
    if (this.isAmber) {
      this.amberTimer += dt;
      if (this.amberTimer >= CONFIG.SIGNAL_TIMING.YELLOW) {
        this.isAmber = false;
        this.amberTimer = 0;
        this.isAllRed = true;
        this.allRedTimer = 0;
      }
      return;
    }

    // 4. Regular Green Phase Countdown
    this.phaseTimer += dt;

    if (!isAiMode) {
      // FIXED-TIMER MODE: Strictly cycles on rigid 22s green schedule
      if (this.phaseTimer >= (CONFIG.SIGNAL_TIMING.FIXED_GREEN || 22)) {
        this.transitionToNextPhase(CONFIG.SIGNAL_TIMING.FIXED_GREEN);
      }
    } else {
      // AI ADAPTIVE MODE: Signal holds green dynamically for traffic flow
      // Only forces a transition if the absolute safety maximum ceiling (45s) is reached
      if (this.phaseTimer >= CONFIG.SIGNAL_TIMING.MAX_GREEN) {
        this.transitionToNextPhase(CONFIG.SIGNAL_TIMING.DEFAULT_GREEN);
      }
    }
  }

  /**
   * Request smooth transition to a new phase (with yellow + all-red safety clearance)
   */
  requestPhaseChange(targetPhase, targetGreenDuration = CONFIG.SIGNAL_TIMING.DEFAULT_GREEN) {
    if (this.currentPhase === targetPhase && !this.isAmber && !this.isAllRed) {
      // Extend current phase duration
      this.allocatedGreenTime = Math.min(
        CONFIG.SIGNAL_TIMING.MAX_GREEN,
        Math.max(this.allocatedGreenTime, this.phaseTimer + targetGreenDuration)
      );
      return;
    }

    if (this.isAmber || this.isAllRed) {
      this.nextPhase = targetPhase;
      return;
    }

    // Initiate Amber transition
    this.isAmber = true;
    this.amberTimer = 0;
    this.nextPhase = targetPhase;
    this.allocatedGreenTime = targetGreenDuration;
  }

  /**
   * Transition to next phase in regular cycle
   */
  transitionToNextPhase(duration = CONFIG.SIGNAL_TIMING.DEFAULT_GREEN) {
    let next = PHASES.EW_GREEN;
    if (this.currentPhase === PHASES.NS_GREEN || this.currentPhase === PHASES.NS_LEFT) {
      next = PHASES.EW_GREEN;
    } else if (this.currentPhase === PHASES.EW_GREEN || this.currentPhase === PHASES.EW_LEFT) {
      next = PHASES.NS_GREEN;
    }

    this.requestPhaseChange(next, duration);
  }

  /**
   * Emergency Vehicle Corridor Activation
   */
  triggerEmergencyPreemption(approach, vehicleId, holdDuration = 12) {
    this.emergencyState = {
      active: true,
      approach,
      vehicleId,
      timeRemaining: holdDuration,
      originalPhase: this.currentPhase,
    };
    this.currentPhase = PHASES.EMERGENCY;
    this.isAmber = false;
    this.isAllRed = false;
  }

  /**
   * Clear emergency lock and restore normal cycle
   */
  clearEmergencyPreemption() {
    const returnPhase = this.emergencyState.originalPhase || PHASES.NS_GREEN;
    this.emergencyState.active = false;
    this.emergencyState.approach = null;
    this.emergencyState.vehicleId = null;
    this.requestPhaseChange(returnPhase, CONFIG.SIGNAL_TIMING.DEFAULT_GREEN);
  }

  /**
   * Query signal state for a given vehicle approach & turn intention
   */
  getSignalStateForApproach(approach, turnIntent = 'STRAIGHT') {
    if (this.externalSignals) return this.externalSignals[approach] || 'RED';
    if (this.manualOverrides[approach]) {
      return this.manualOverrides[approach];
    }

    if (this.emergencyState.active) {
      return this.emergencyState.approach === approach ? 'GREEN' : 'RED';
    }

    if (this.isAllRed) return 'RED';

    const isNS = approach === 'N' || approach === 'S';
    const isEW = approach === 'E' || approach === 'W';

    if (this.isAmber) {
      if (
        (isNS && (this.currentPhase === PHASES.NS_GREEN || this.currentPhase === PHASES.NS_LEFT)) ||
        (isEW && (this.currentPhase === PHASES.EW_GREEN || this.currentPhase === PHASES.EW_LEFT))
      ) {
        return 'YELLOW';
      }
      return 'RED';
    }

    if (this.currentPhase === PHASES.NS_GREEN) {
      return isNS ? 'GREEN' : 'RED';
    }

    if (this.currentPhase === PHASES.NS_LEFT) {
      if (isNS) return turnIntent === 'LEFT' ? 'GREEN' : 'RED';
      return 'RED';
    }

    if (this.currentPhase === PHASES.EW_GREEN) {
      return isEW ? 'GREEN' : 'RED';
    }

    if (this.currentPhase === PHASES.EW_LEFT) {
      if (isEW) return turnIntent === 'LEFT' ? 'GREEN' : 'RED';
      return 'RED';
    }

    return 'RED';
  }

  /**
   * Update live approach telemetry from active vehicles in this intersection
   */
  updateSensors(vehicles) {
    const stats = {
      N: { count: 0, queue: 0, waitSum: 0 },
      S: { count: 0, queue: 0, waitSum: 0 },
      E: { count: 0, queue: 0, waitSum: 0 },
      W: { count: 0, queue: 0, waitSum: 0 },
    };

    vehicles.forEach((v) => {
      if (v.intersectionId !== this.id) return;
      if (v.state === 'EXITED') return;

      const app = v.approach;
      if (stats[app]) {
        stats[app].count++;
        if (v.state === 'QUEUED' || v.speed < 0.4) {
          stats[app].queue++;
        }
        stats[app].waitSum += v.waitTime;
      }
    });

    let totalQueued = 0;
    let totalVehicles = 0;

    ['N', 'S', 'E', 'W'].forEach((dir) => {
      this.approaches[dir].vehicleCount = stats[dir].count;
      this.approaches[dir].queueCount = stats[dir].queue;
      this.approaches[dir].avgWaitTime = stats[dir].count > 0 ? stats[dir].waitSum / stats[dir].count : 0;
      this.approaches[dir].totalWaitTime = stats[dir].waitSum;

      totalQueued += stats[dir].queue;
      totalVehicles += stats[dir].count;
    });

    // Dynamic Congestion Score (0 to 100%)
    const maxCapacity = 36;
    this.congestionScore = Math.min(100, Math.round((totalQueued / Math.max(1, maxCapacity)) * 100));
  }

  /**
   * Set manual override for specific approach
   */
  setManualOverride(approach, state) {
    this.manualOverrides[approach] = state;
  }

  /**
   * Clear all manual overrides
   */
  clearManualOverrides() {
    this.manualOverrides = { N: null, S: null, E: null, W: null };
  }
}

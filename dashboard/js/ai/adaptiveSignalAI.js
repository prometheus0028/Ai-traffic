/**
 * AI Traffic Command Center - Adaptive Signal Optimization Engine
 * Implements real-time Gap-Out Actuation, Max-Pressure Balancing, and Dynamic Platoon Extensions.
 */

import { CONFIG } from '../config.js';
import { PHASES } from '../simulation/intersection.js';
import { ExplainableAI } from './explainableAI.js';
import { store } from '../state/store.js';
import { soundFx } from '../utils/audioUtils.js';

export class AdaptiveSignalAI {
  constructor(network) {
    this.network = network;
    this.evalInterval = 0.5; // Evaluates live conditions every 0.5s
    this.evalTimer = 0;
    this.lastDecisionLogTime = 0;
    this.xai = new ExplainableAI();
  }

  /**
   * Update AI decision loop
   */
  update(dt) {
    const state = store.getState();
    if (!state.isAiMode || !state.isRunning) return;

    this.evalTimer += dt;
    if (this.evalTimer >= this.evalInterval) {
      this.evalTimer = 0;
      this.optimizeNetworkSignals();
    }
  }

  /**
   * Run optimization algorithm for active intersection
   */
  optimizeNetworkSignals() {
    const intersections = this.network.getAllIntersections();

    intersections.forEach((intersection) => {
      // Skip if emergency preemption is currently active or transitioning
      if (intersection.emergencyState.active) return;
      if (intersection.isAmber || intersection.isAllRed) return;

      this.optimizeSingleIntersection(intersection);
    });
  }

  /**
   * Real-Time Max-Pressure & Gap-Out Decision Engine
   */
  optimizeSingleIntersection(intersection) {
    const app = intersection.approaches;
    const weights = CONFIG.AI_WEIGHTS;
    const minGreen = CONFIG.SIGNAL_TIMING.MIN_GREEN || 6;
    const maxGreen = CONFIG.SIGNAL_TIMING.MAX_GREEN || 45;

    // 1. Gather live telemetry per corridor
    const nsQueue = app.N.queueCount + app.S.queueCount;
    const nsWait = (app.N.avgWaitTime + app.S.avgWaitTime) / 2;
    const nsInflow = app.N.vehicleCount + app.S.vehicleCount;

    const nsPressure =
      weights.QUEUE_LENGTH * nsQueue +
      weights.WAIT_TIME * (nsWait / 4) +
      weights.ARRIVAL_RATE * nsInflow;

    const ewQueue = app.E.queueCount + app.W.queueCount;
    const ewWait = (app.E.avgWaitTime + app.W.avgWaitTime) / 2;
    const ewInflow = app.E.vehicleCount + app.W.vehicleCount;

    const ewPressure =
      weights.QUEUE_LENGTH * ewQueue +
      weights.WAIT_TIME * (ewWait / 4) +
      weights.ARRIVAL_RATE * ewInflow;

    const isNSActive =
      intersection.currentPhase === PHASES.NS_GREEN ||
      intersection.currentPhase === PHASES.NS_LEFT;

    const activePressure = isNSActive ? nsPressure : ewPressure;
    const opposingPressure = isNSActive ? ewPressure : nsPressure;
    const activeCorridor = isNSActive ? 'North-South' : 'East-West';
    const opposingCorridor = isNSActive ? 'East-West' : 'North-South';

    const activeQueue = isNSActive ? nsQueue : ewQueue;
    const opposingQueue = isNSActive ? ewQueue : nsQueue;
    const activeWaitAvg = isNSActive ? nsWait : ewWait;
    const opposingWaitAvg = isNSActive ? ewWait : nsWait;
    const activeInflow = isNSActive ? nsInflow : ewInflow;
    const opposingInflow = isNSActive ? ewInflow : nsInflow;

    const pressureDiff = opposingPressure - activePressure;
    const now = Date.now();

    // =========================================================================
    // ACTUATION RULE 1: Gap-Out / Empty Corridor Early Cut-Off
    // If active corridor is cleared and opposing traffic is waiting, switch immediately!
    // =========================================================================
    if (
      intersection.phaseTimer >= minGreen &&
      activeQueue === 0 &&
      activeInflow <= 1 &&
      (opposingQueue > 0 || opposingInflow > 0)
    ) {
      const targetPhase = isNSActive ? PHASES.EW_GREEN : PHASES.NS_GREEN;
      const targetDuration = this.calculateOptimalGreenDuration(opposingPressure);

      intersection.requestPhaseChange(targetPhase, targetDuration);

      if (now - this.lastDecisionLogTime > 4000) {
        this.lastDecisionLogTime = now;
        const decision = this.xai.generateEarlyCutoffRationale({
          intersection,
          clearedCorridor: activeCorridor,
          nextCorridor: opposingCorridor,
          nextQueue: opposingQueue,
          timeSaved: Math.max(1, Math.round(22 - intersection.phaseTimer)),
        });
        store.addAIDecision(decision);
        soundFx.playAIDecisionChime();
      }
      return;
    }

    // =========================================================================
    // ACTUATION RULE 2: Max-Pressure Bottleneck Switch
    // If opposing queue is heavy and has accumulated high wait times, switch priority
    // =========================================================================
    if (
      intersection.phaseTimer >= minGreen &&
      (pressureDiff >= weights.MIN_PRESSURE_DIFF_TO_SWITCH || opposingWaitAvg > 12.0) &&
      opposingQueue > 0
    ) {
      const targetPhase = isNSActive ? PHASES.EW_GREEN : PHASES.NS_GREEN;
      const targetDuration = this.calculateOptimalGreenDuration(opposingPressure);

      intersection.requestPhaseChange(targetPhase, targetDuration);

      if (now - this.lastDecisionLogTime > 4000) {
        this.lastDecisionLogTime = now;
        const decision = this.xai.generatePhaseSwitchRationale({
          intersection,
          fromCorridor: activeCorridor,
          toCorridor: opposingCorridor,
          fromQueue: activeQueue,
          toQueue: opposingQueue,
          pressureDiff,
          allocatedGreen: targetDuration,
          fromWaitAvg: activeWaitAvg,
          toWaitAvg: opposingWaitAvg,
        });
        store.addAIDecision(decision);
        soundFx.playAIDecisionChime();
      }
      return;
    }

    // =========================================================================
    // ACTUATION RULE 3: Dynamic Green Extension (Platoon Priority)
    // If active corridor is still discharging queues and opposing queue is not severe, hold green
    // =========================================================================
    if (
      activeQueue > 0 &&
      intersection.phaseTimer < maxGreen &&
      activePressure >= opposingPressure * 0.8
    ) {
      const extension = weights.EXTENSION_STEP_SECONDS || 3;
      intersection.allocatedGreenTime = Math.min(
        maxGreen,
        Math.max(intersection.allocatedGreenTime, intersection.phaseTimer + extension)
      );

      if (now - this.lastDecisionLogTime > 5000) {
        this.lastDecisionLogTime = now;
        const decision = this.xai.generateGreenExtensionRationale({
          intersection,
          corridor: activeCorridor,
          activeQueue,
          opposingQueue,
          activePressure,
          opposingPressure,
          extensionSeconds: extension,
          activeWaitAvg,
          opposingWaitAvg,
        });
        store.addAIDecision(decision);
        soundFx.playAIDecisionChime();
      }
      return;
    }
  }

  /**
   * Webster's dynamic green duration calculation
   */
  calculateOptimalGreenDuration(pressure) {
    const minG = CONFIG.SIGNAL_TIMING.MIN_GREEN || 6;
    const maxG = CONFIG.SIGNAL_TIMING.MAX_GREEN || 45;
    const calculated = minG + Math.round((pressure / 25.0) * (maxG - minG));
    return Math.min(maxG, Math.max(minG, calculated));
  }
}

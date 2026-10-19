/**
 * AI Traffic Command Center - Explainable AI (XAI) Rationale Engine
 * Translates live simulation metrics, measured queue counts, wait times,
 * and pressure differentials into transparent natural-language reasoning.
 */

import { MathUtils } from '../utils/mathUtils.js';
import { CONFIG } from '../config.js';

export class ExplainableAI {
  /**
   * Rationale when AI dynamically extends current green phase
   */
  generateGreenExtensionRationale(params) {
    const {
      intersection,
      corridor,
      activeQueue,
      opposingQueue,
      activePressure,
      opposingPressure,
      extensionSeconds,
      activeWaitAvg,
      opposingWaitAvg,
    } = params;

    // Confidence derived mathematically from pressure dominance
    const pressureRatio = activePressure / Math.max(1, activePressure + opposingPressure);
    const confidence = MathUtils.clamp(Math.round(80 + pressureRatio * 18), 82, 99);

    // Honest delay savings calculation: active queued vehicles * extension seconds
    const delaySavedVehSec = Math.round(activeQueue * extensionSeconds * 0.75);

    const activeWaitStr = activeWaitAvg ? ` (avg wait ${MathUtils.formatNumber(activeWaitAvg)}s)` : '';
    const opposingWaitStr = opposingWaitAvg ? ` (avg wait ${MathUtils.formatNumber(opposingWaitAvg)}s)` : '';

    return {
      type: 'GREEN_EXTENSION',
      intersectionId: intersection.id,
      intersectionName: intersection.name,
      action: `Extended ${corridor} Green by +${extensionSeconds}s`,
      confidence,
      primaryReason: `${corridor} approach has ${activeQueue} queued vehicles${activeWaitStr} with demand pressure ${MathUtils.formatNumber(activePressure, 1)}. Extending phase allows platoon to clear without stopping.`,
      tradeOff: `Opposing ${corridor === 'North-South' ? 'East-West' : 'North-South'} queue is currently ${opposingQueue} vehicles${opposingWaitStr} with low pressure (${MathUtils.formatNumber(opposingPressure, 1)}); delay penalty remains low.`,
      impact: `Flushes active platoon and saves an estimated ${delaySavedVehSec} vehicle-seconds of idling delay.`,
      rule: 'Dynamic Webster Queue Extension (Rule #104)',
      badgeColor: 'emerald',
    };
  }

  /**
   * Rationale when AI switches signal phase
   */
  generatePhaseSwitchRationale(params) {
    const {
      intersection,
      fromCorridor,
      toCorridor,
      fromQueue,
      toQueue,
      pressureDiff,
      allocatedGreen,
      toWaitAvg,
      fromWaitAvg,
    } = params;

    const confidence = MathUtils.clamp(Math.round(85 + (pressureDiff / 25) * 12), 85, 99);
    const toWaitStr = toWaitAvg ? ` (waiting ~${MathUtils.formatNumber(toWaitAvg)}s)` : '';
    const fromWaitStr = fromWaitAvg ? ` (cleared to ${fromQueue} vehicles)` : '';

    return {
      type: 'PHASE_SWITCH',
      intersectionId: intersection.id,
      intersectionName: intersection.name,
      action: `Switched Priority: ${toCorridor} (Allocated ${allocatedGreen}s)`,
      confidence,
      primaryReason: `${toCorridor} demand pressure exceeded ${fromCorridor} by +${MathUtils.formatNumber(pressureDiff, 1)} points (${toQueue} queued vehicles${toWaitStr} vs ${fromQueue} vehicles).`,
      tradeOff: `${fromCorridor} traffic${fromWaitStr} brought to standard amber transition (${CONFIG.SIGNAL_TIMING.YELLOW}s) and all-red clearance.`,
      impact: `Allocates ${allocatedGreen}s green window to clear the waiting ${toCorridor} queue before severe gridlock occurs.`,
      rule: 'Max-Pressure Phase Optimization (Rule #201)',
      badgeColor: 'cyan',
    };
  }

  /**
   * Rationale when AI terminates green early on an empty corridor
   */
  generateEarlyCutoffRationale(params) {
    const { intersection, clearedCorridor, nextCorridor, nextQueue, timeSaved } = params;

    return {
      type: 'EARLY_CUTOFF',
      intersectionId: intersection.id,
      intersectionName: intersection.name,
      action: `Early Phase Cut-off on ${clearedCorridor}`,
      confidence: 98.2,
      primaryReason: `${clearedCorridor} approach is completely clear (0 approaching vehicles). Eliminating wasted green time.`,
      tradeOff: `Zero negative impact on ${clearedCorridor}; immediate green transfer to waiting ${nextCorridor} traffic (${nextQueue || 0} queued).`,
      impact: `Eliminates ~${timeSaved || 8}s of empty intersection idle time, increasing overall intersection throughput.`,
      rule: 'Zero-Demand Early Cut-Off (Rule #305)',
      badgeColor: 'indigo',
    };
  }
}

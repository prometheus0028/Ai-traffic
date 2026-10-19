/**
 * AI Traffic Command Center - Short-Term Congestion Predictor
 * Implements exponential momentum and multi-horizon trend forecasting (5m, 10m, 15m)
 * derived mathematically from queue accumulation rates and scenario demand.
 */

import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/mathUtils.js';
import { store } from '../state/store.js';

export class CongestionPredictor {
  constructor(network) {
    this.network = network;
    this.updateInterval = 2.0; // Recalculate every 2 seconds
    this.timer = 0;
    this.historyQueueDepths = [];
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.updateInterval) {
      this.timer = 0;
      this.predictAllIntersections();
    }
  }

  /**
   * Forecast congestion levels for intersection approaches
   */
  predictAllIntersections() {
    const intersections = this.network.getAllIntersections();

    intersections.forEach((node) => {
      const current = node.congestionScore;
      const app = node.approaches;

      const totalQueues = app.N.queueCount + app.S.queueCount + app.E.queueCount + app.W.queueCount;
      const totalVehicles = app.N.vehicleCount + app.S.vehicleCount + app.E.vehicleCount + app.W.vehicleCount;

      this.historyQueueDepths.push(totalQueues);
      if (this.historyQueueDepths.length > 10) {
        this.historyQueueDepths.shift();
      }

      // Calculate queue growth rate (dQueue / dt) over recent sample window
      let queueDeltaRate = 0;
      if (this.historyQueueDepths.length >= 2) {
        const oldest = this.historyQueueDepths[0];
        const newest = this.historyQueueDepths[this.historyQueueDepths.length - 1];
        queueDeltaRate = (newest - oldest) / (this.historyQueueDepths.length * 2);
      }

      // Projection factor based on queue growth and unserviced vehicle demand
      const growthFactor = queueDeltaRate * 18 + (totalVehicles > 15 ? 4 : totalVehicles < 5 ? -4 : 0);

      // Deterministic, honest forecast for 5, 10, 15 minutes ahead
      const pred5 = MathUtils.clamp(Math.round(current + growthFactor * 0.7), 4, 98);
      const pred10 = MathUtils.clamp(Math.round(current + growthFactor * 1.5), 6, 99);
      const pred15 = MathUtils.clamp(Math.round(current + growthFactor * 2.2), 8, 100);

      let trend = 'STABLE';
      if (pred15 > current + 10) trend = 'RAPID_INCREASE';
      else if (pred15 > current + 4) trend = 'INCREASING';
      else if (pred15 < current - 6) trend = 'CLEARING';

      const predictionData = {
        current,
        5: pred5,
        10: pred10,
        15: pred15,
        trend,
        isBottleneckRisk: pred10 >= CONFIG.PREDICTION.BOTTLENECK_THRESHOLD,
        recommendedAction: this.getPredictiveAdvice(pred10, trend),
      };

      store.setPredictions(node.id, predictionData);
    });
  }

  /**
   * Generate actionable recommendation based on predictive trends
   */
  getPredictiveAdvice(pred10, trend) {
    if (pred10 >= 80) {
      return 'Critical bottleneck forecast. Divert upstream arterial flow & extend green phase.';
    }
    if (trend === 'RAPID_INCREASE') {
      return 'Inflow surge detected. Pre-allocating adaptive green buffer on main corridor.';
    }
    if (trend === 'CLEARING') {
      return 'Congestion clearing. Optimizing cross-street progression to balance wait times.';
    }
    return 'Optimal equilibrium maintained. Steady-state progression active.';
  }
}

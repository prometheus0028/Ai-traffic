/**
 * AI Traffic Command Center - Multi-Intersection Road Network Manager
 */

import { CONFIG } from '../config.js';
import { Intersection } from './intersection.js';

export class RoadNetwork {
  constructor() {
    this.intersections = new Map();
    this.initNetwork();
  }

  initNetwork() {
    CONFIG.INTERSECTIONS.forEach((cfg) => {
      const intersection = new Intersection(cfg);
      this.intersections.set(cfg.id, intersection);
    });
  }

  getIntersection(id) {
    return this.intersections.get(id);
  }

  getAllIntersections() {
    return Array.from(this.intersections.values());
  }

  /**
   * Reset or re-apply scenario configuration across network
   */
  applyScenarioPreset(presetKey) {
    const preset = CONFIG.PRESETS[presetKey] || CONFIG.PRESETS.BALANCED;
    this.intersections.forEach((node) => {
      node.clearManualOverrides();
      if (node.emergencyState.active) {
        node.clearEmergencyPreemption();
      }
    });
    return preset;
  }

  /**
   * Update all intersection signal controllers for dt seconds
   */
  update(dt, isAiMode = true) {
    this.intersections.forEach((intersection) => {
      intersection.update(dt, isAiMode);
    });
  }

  /**
   * Calculate network-wide aggregate telemetry
   */
  getNetworkSummary() {
    let totalVehicles = 0;
    let totalQueued = 0;
    let totalWaitTime = 0;
    let weightedCongestion = 0;

    this.intersections.forEach((node) => {
      let nodeVehicles = 0;
      let nodeQueued = 0;
      let nodeWait = 0;

      ['N', 'S', 'E', 'W'].forEach((dir) => {
        const app = node.approaches[dir];
        nodeVehicles += app.vehicleCount;
        nodeQueued += app.queueCount;
        nodeWait += app.totalWaitTime;
      });

      totalVehicles += nodeVehicles;
      totalQueued += nodeQueued;
      totalWaitTime += nodeWait;
      weightedCongestion += node.congestionScore;
    });

    const nodeCount = Math.max(1, this.intersections.size);
    const avgWaitTime = totalVehicles > 0 ? totalWaitTime / totalVehicles : 0;
    const avgCongestion = Math.round(weightedCongestion / nodeCount);

    return {
      totalVehicles,
      totalQueued,
      avgWaitTime,
      avgCongestion,
    };
  }
}

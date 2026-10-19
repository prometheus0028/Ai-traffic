/**
 * AI Traffic Command Center - Emergency Vehicle Priority & Corridor Preemption
 */

import { store } from '../state/store.js';
import { soundFx } from '../utils/audioUtils.js';

export class EmergencyPriorityManager {
  constructor(engine) {
    this.engine = engine;
    this.activePreemptions = new Map(); // intersectionId -> { vehicle, approach, startTime }
  }

  update(dt) {
    if (!this.engine) return;
    const vehicles = this.engine.vehicles;
    const network = this.engine.network;

    // Scan for active emergency vehicles
    vehicles.forEach((veh) => {
      if (!veh.isEmergency) return;

      const node = network.getIntersection(veh.intersectionId);
      if (!node) return;

      const dist = veh.calculateDistanceToStopLine(node);

      // Trigger preemption if approaching within 200 units of stop line and not yet past
      if (dist > -40 && dist < 220 && veh.state !== 'EXITED') {
        if (!node.emergencyState.active || node.emergencyState.vehicleId !== veh.id) {
          this.activatePreemption(node, veh);
        }
      }

      // If vehicle has crossed and is exiting, clear preemption
      if (node.emergencyState.active && node.emergencyState.vehicleId === veh.id) {
        if (dist <= -60 || veh.state === 'EXITED') {
          this.releasePreemption(node, veh);
        }
      }
    });
  }

  /**
   * Activate Emergency Green Corridor
   */
  activatePreemption(intersection, vehicle) {
    intersection.triggerEmergencyPreemption(vehicle.approach, vehicle.id, 14);

    const dirName = { N: 'Northbound', S: 'Southbound', E: 'Eastbound', W: 'Westbound' }[vehicle.approach] || vehicle.approach;
    const vehName = vehicle.spec.name || 'Emergency Vehicle';

    soundFx.playEmergencySiren();

    const decision = {
      type: 'EMERGENCY_PREEMPTION',
      intersectionId: intersection.id,
      intersectionName: intersection.name,
      action: `🚨 Priority Preemption Activated: ${vehName}`,
      confidence: 99.9,
      primaryReason: `${vehName} detected on ${dirName} approach (${Math.round(vehicle.speed * 10)} km/h). Immediate green corridor established.`,
      tradeOff: `Cross-traffic briefly paused; opposing queues safely held at red signal.`,
      impact: `Zero emergency stop delay. Estimated 45s saved on emergency dispatch route.`,
      rule: 'Emergency Preemption Protocol IEEE-1570 / Smart Corridor v3.1',
      badgeColor: 'red',
    };

    store.addAIDecision(decision);
    store.setEmergencyStatus({
      active: true,
      vehicleId: vehicle.id,
      vehicleType: vehName,
      intersectionId: intersection.id,
      approach: dirName,
    });
  }

  /**
   * Restore normal operations once emergency vehicle has passed
   */
  releasePreemption(intersection, vehicle) {
    intersection.clearEmergencyPreemption();

    const state = store.getState();
    state.metrics.totalEmergenciesHandled = (state.metrics.totalEmergenciesHandled || 0) + 1;

    store.setEmergencyStatus(null);
  }
}

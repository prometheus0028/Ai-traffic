/**
 * CivixFlow - Core Simulation Engine
 * Vehicle dynamics, spawn control, telemetry, Fixed-Time Baseline Twin.
 */

import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/mathUtils.js';
import { Vehicle } from './vehicle.js';
import { RoadNetwork } from './network.js';
import { FixedBaselineTwin } from './fixedBaseline.js';
import { SafetyAnalytics } from '../ai/safetyAnalytics.js';
import { store } from '../state/store.js';

export class SimulationEngine {
  constructor() {
    this.network   = new RoadNetwork();
    this.vehicles  = [];
    this.fixedTwin = new FixedBaselineTwin();
    this.safety    = new SafetyAnalytics();

    this.telemetryTimer = 0;
    this.safetyTimer = 0;
    this.spawnTimers    = { N: 0, S: 0, E: 0, W: 0 };
    this.isRunning      = true;
    this.speedMultiplier = CONFIG.SIMULATION.DEFAULT_SPEED;

    this.simTime = 0;
    this.totalSpawned   = 0;
    this.totalCompleted = 0;
    this.totalWaitTime  = 0;
    this.totalIdleSec   = 0;
    this.completedVehicles = [];   // rolling 50 { waitTime, timestamp }
    this.recentDepartures  = [];   // timestamps of exits in last 60s
  }

  update(dt) {
    const state = store.getState();
    this.isRunning       = state.isRunning;
    this.speedMultiplier = state.simulationSpeed || 1.0;
    if (!this.isRunning) return;

    this.simTime += dt;
    this.network.update(dt, state.isAiMode);
    this.fixedTwin.update(dt);
    this._spawnTraffic(dt, state.currentPreset);
    this._updateVehicles(dt, state.currentPreset);

    this.network.getAllIntersections().forEach(node => {
      node.updateSensors(this.vehicles);
    });

    // Safety detection every frame
    this.safetyTimer += dt;
    if (this.safetyTimer >= 0.1) {
      this.safetyTimer -= 0.1;
      this.safety.update(this.vehicles);
    }

    // Telemetry snapshot every 1.5 s
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 1.5) {
      this.telemetryTimer = 0;
      this._emitTelemetry(state.isAiMode);
    }
  }

  // ─── Spawn ─────────────────────────────────────────────────────────────────

  _spawnTraffic(dt, presetKey) {
    const preset     = CONFIG.PRESETS[presetKey] || CONFIG.PRESETS.BALANCED;
    const activeNode = this.network.getIntersection(store.getState().activeIntersectionId);
    if (!activeNode) return;

    const approaches = ['N', 'S', 'E', 'W'];
    approaches.forEach(dir => {
      this.spawnTimers[dir] += dt;

      const mult = (preset.spawnMultipliers && preset.spawnMultipliers[dir]) || 1.0;
      // Minimum 2.0 s between spawns per approach (stagger them)
      const interval = 2.0 / mult;

      if (this.spawnTimers[dir] < interval) return;
      this.spawnTimers[dir] = 0;

      const inbound = this.vehicles.filter(
        v => v.intersectionId === activeNode.id && v.approach === dir
      );
      // Hard cap: no more than 15 vehicles per approach
      if (inbound.length >= 15) return;

      // Compute spawn position and check clearance
      const laneIndex = MathUtils.randomInt(0, activeNode.lanesPerApproach - 1);
      const center    = activeNode.center || { x: 400, y: 400 };
      const laneOff   = (laneIndex - (activeNode.lanesPerApproach - 1) / 2) * 22;
      const spawnDist = 370;

      let sx = 0, sy = 0;
      switch (dir) {
        case 'S': sx = center.x + 35 + laneOff; sy = center.y + spawnDist; break;
        case 'N': sx = center.x - 35 - laneOff; sy = center.y - spawnDist; break;
        case 'W': sx = center.x - spawnDist;     sy = center.y + 35 + laneOff; break;
        case 'E': sx = center.x + spawnDist;     sy = center.y - 35 - laneOff; break;
      }

      // Don't spawn on top of an existing vehicle (min 50 px separation)
      const tooClose = this.vehicles.some(v =>
        MathUtils.distance(v.x, v.y, sx, sy) < 50
      );
      if (tooClose) return;

      // Vehicle type
      const isEmergency = Math.random() < (preset.emergencyChance || 0.02);
      let typeKey = 'SEDAN';
      if (isEmergency) {
        typeKey = MathUtils.choice(['AMBULANCE', 'FIRE_TRUCK', 'POLICE']);
      } else {
        const r = Math.random();
        if      (r < 0.45) typeKey = 'SEDAN';
        else if (r < 0.63) typeKey = 'SUV';
        else if (r < 0.78) typeKey = 'EV';
        else if (r < 0.90) typeKey = 'TRUCK';
        else               typeKey = 'BUS';
      }

      const turnIntent = laneIndex === 0 ? 'LEFT'
                       : laneIndex === activeNode.lanesPerApproach - 1 ? 'RIGHT'
                       : 'STRAIGHT';

      const angleMap = { S: -Math.PI/2, N: Math.PI/2, W: 0, E: Math.PI };
      const veh = new Vehicle({
        typeKey, x: sx, y: sy,
        angle: angleMap[dir] ?? 0,
        approach: dir, laneIndex, turnIntent,
        intersectionId: activeNode.id,
      });

      this.vehicles.push(veh);
      this.totalSpawned++;
      this.fixedTwin.onVehicleSpawned(veh);
    });
  }

  // ─── Vehicle update ────────────────────────────────────────────────────────

  _updateVehicles(dt, presetKey) {
    const activeId   = store.getState().activeIntersectionId;
    const activeNode = this.network.getIntersection(activeId);
    const preset     = CONFIG.PRESETS[presetKey] || CONFIG.PRESETS.BALANCED;
    const scenConf   = {
      speedFactor:  preset.speedFactor || 1.0,
      headwayFactor: presetKey === 'RAIN_WEATHER' ? 1.4 : 1.0,
    };

    // Build per-lane queues sorted by distance-to-stop-line (closest first)
    const laneQueues = new Map();
    this.vehicles.forEach(v => {
      if (v.state === 'APPROACHING' || v.state === 'QUEUED') {
        const key = `${v.intersectionId}-${v.approach}-${v.laneIndex}`;
        if (!laneQueues.has(key)) laneQueues.set(key, []);
        laneQueues.get(key).push(v);
      }
    });
    laneQueues.forEach(list =>
      list.sort((a, b) =>
        a.calculateDistanceToStopLine(activeNode) -
        b.calculateDistanceToStopLine(activeNode)
      )
    );

    const remaining = [];
    const now = this.simTime * 1000;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v    = this.vehicles[i];
      const node = this.network.getIntersection(v.intersectionId);

      let vehicleAhead = null;
      if (v.state === 'APPROACHING' || v.state === 'QUEUED') {
        const key   = `${v.intersectionId}-${v.approach}-${v.laneIndex}`;
        const queue = laneQueues.get(key);
        if (queue) {
          const idx = queue.indexOf(v);
          if (idx > 0) vehicleAhead = queue[idx - 1];
        }
      }

      try { v.update(dt, node, vehicleAhead, scenConf); }
      catch (err) { console.error('Vehicle update error:', err); }

      if (v.speed < 0.3) this.totalIdleSec += dt;

      if (v.isOutOfBounds(800, 800)) {
        this.totalCompleted++;
        this.totalWaitTime += v.waitTime || 0;
        this.completedVehicles.push({ waitTime: v.waitTime || 0, timestamp: now });
        this.recentDepartures.push(now);
        if (this.completedVehicles.length > 60) this.completedVehicles.shift();
      } else {
        remaining.push(v);
      }
    }

    this.vehicles = remaining;
    const cutoff  = now - 60000;
    this.recentDepartures = this.recentDepartures.filter(t => t > cutoff);
  }

  // ─── Telemetry ─────────────────────────────────────────────────────────────

  _emitTelemetry(isAiMode) {
    const active = this.vehicles.length;

    // Wait time
    let waitSum = 0, waitCnt = 0;
    this.vehicles.forEach(v => { waitSum += v.waitTime; waitCnt++; });
    this.completedVehicles.forEach(c => { waitSum += c.waitTime; waitCnt++; });
    const liveWait = waitCnt > 0 ? waitSum / waitCnt : 0;
    const fixedWait = this.fixedTwin.getAverageWaitTime();
    const avgWaitAI    = liveWait;
    const avgWaitFixed = isAiMode ? fixedWait : liveWait;

    // Congestion
    let queuedCount = 0;
    this.vehicles.forEach(v => { if (v.state === 'QUEUED' || v.speed < 0.4) queuedCount++; });
    const congestion = Math.min(100, Math.round((queuedCount / 36) * 100));

    // Throughput
    const throughput = this.recentDepartures.length;

    // CO2
    const idleSaved = Math.max(0, this.fixedTwin.totalIdleSeconds - this.totalIdleSec);
    const co2Saved  = Math.max(0, idleSaved * CONFIG.EMISSIONS.IDLE_CO2_PER_SEC * 0.001);

    // Average speed (in virtual km/h units ≈ speed * 10)
    let speedSum = 0;
    this.vehicles.forEach(v => { speedSum += v.speed; });
    const avgSpeed = active > 0 ? speedSum / active : 0;

    // Traffic density %
    const densityPct = Math.min(100, Math.round((active / 36) * 100));

    // Safety metrics from actual detector
    const collisionsRecent  = this.safety.countRecent(this.safety.collisions,  60000);
    const nearMissesRecent  = this.safety.countRecent(this.safety.nearMisses,  60000);
    const totalCollisions   = this.safety.collisions.length;
    const totalNearMisses   = this.safety.nearMisses.length;

    const safetyScore = this.safety.computeSafetyScore({
      collisionsLast60s: collisionsRecent,
      nearMissesLast60s: nearMissesRecent,
      avgSpeed,
      densityPct,
      avgWaitTime: liveWait,
      throughput,
    });

    const safetyMetrics = {
      safetyScore,
      collisionsTotal: totalCollisions,
      collisionsRecent,
      nearMissesTotal: totalNearMisses,
      nearMissesRecent,
      avgSpeedKmh: parseFloat((avgSpeed * 10).toFixed(1)),
      densityPct,
    };

    store.recordTelemetry({
      avgWaitTimeAI:    Number(avgWaitAI.toFixed(1)),
      avgWaitTimeFixed: Number(avgWaitFixed.toFixed(1)),
      congestion,
      throughput,
      co2SavedKg: Number(co2Saved.toFixed(1)),
      activeVehicles: active,
      totalSpawned:   this.totalSpawned,
      totalCompleted: this.totalCompleted,
      safetyMetrics,
      avgWaitTime: Number(liveWait.toFixed(1)),
    });
  }

  // ─── Emergency dispatch ────────────────────────────────────────────────────

  dispatchEmergencyVehicle(typeKey = 'AMBULANCE', approach = 'S', intersectionId = 'int-downtown') {
    const node = this.network.getIntersection(intersectionId);
    if (!node) return null;

    const center = node.center || { x: 400, y: 400 };
    const angleMap = { S: -Math.PI/2, N: Math.PI/2, W: 0, E: Math.PI };
    const spawnDist = 370;
    let sx = center.x, sy = center.y;
    switch (approach) {
      case 'S': sx = center.x + 35; sy = center.y + spawnDist; break;
      case 'N': sx = center.x - 35; sy = center.y - spawnDist; break;
      case 'W': sx = center.x - spawnDist; sy = center.y + 35; break;
      case 'E': sx = center.x + spawnDist; sy = center.y - 35; break;
    }

    const veh = new Vehicle({
      typeKey, x: sx, y: sy,
      angle: angleMap[approach] ?? 0,
      approach, laneIndex: 1, turnIntent: 'STRAIGHT',
      intersectionId,
    });
    veh.speed = veh.maxSpeed * 0.9;
    this.vehicles.push(veh);
    this.totalSpawned++;
    return veh;
  }

  reset() {
    this.vehicles          = [];
    this.completedVehicles = [];
    this.recentDepartures  = [];
    this.totalSpawned      = 0;
    this.totalCompleted    = 0;
    this.totalWaitTime     = 0;
    this.totalIdleSec      = 0;
    this.fixedTwin.reset();
    this.safety.reset();
    this.network.initNetwork();
  }
}

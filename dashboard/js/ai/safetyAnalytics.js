/**
 * CivixFlow - Safety Analytics Engine
 * Real-time collision detection, near-miss detection, and intersection safety score.
 * All metrics derived from actual simulation state — no fabrication.
 */

import { store } from '../state/store.js';
import { MathUtils } from '../utils/mathUtils.js';

export class SafetyAnalytics {
  constructor() {
    this.collisions = [];        // Actual collision events
    this.nearMisses = [];        // Genuine dangerous close-proximity events

    // Cooldown sets to avoid re-recording the same pair repeatedly
    this._collisionCooldown = new Map(); // pairKey -> timestamp
    this._nearMissCooldown  = new Map();

    this.COLLISION_OVERLAP_PX   = 6;   // physical body overlap threshold
    this.NEAR_MISS_DISTANCE_PX  = 28;  // edge-to-edge distance for near miss
    this.NEAR_MISS_MIN_RELSPEED = 0.4; // relative speed minimum (avoids parked queues)
    this.COOLDOWN_MS = 3000;           // minimum ms between re-recording same pair
  }

  /**
   * Run detection on every frame.
   * @param {Vehicle[]} vehicles  - all active vehicles
   */
  update(vehicles) {
    const now = Date.now();
    const len = vehicles.length;

    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = vehicles[i];
        const b = vehicles[j];

        // Skip vehicles in completely separate states that can't interact
        if (a.state === 'EXITED' && b.state === 'EXITED') continue;

        const dist = MathUtils.distance(a.x, a.y, b.x, b.y);
        if (!isFinite(dist)) continue;

        // Physical radii (approximate circular bounding from dimensions)
        const radA = (a.spec.length + a.spec.width) / 4;
        const radB = (b.spec.length + b.spec.width) / 4;
        const combinedRadius = radA + radB;

        const edgeDist = dist - combinedRadius;

        const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;

        // ── Collision detection ────────────────────────────────────────────
        if (dist < combinedRadius - this.COLLISION_OVERLAP_PX) {
          const lastCol = this._collisionCooldown.get(pairKey) || 0;
          if (now - lastCol > this.COOLDOWN_MS) {
            this._collisionCooldown.set(pairKey, now);

            const relSpeed = Math.abs(a.speed - b.speed);
            const severity = relSpeed > 2.5 ? 'SEVERE' : relSpeed > 1.0 ? 'MODERATE' : 'MINOR';

            const event = {
              id: `col-${now}-${Math.random().toString(36).slice(2,6)}`,
              timestamp: now,
              vehicleAId: a.id,
              vehicleBId: b.id,
              vehicleAType: a.typeKey,
              vehicleBType: b.typeKey,
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2,
              relativeSpeed: relSpeed,
              severity,
              location: 'Downtown Central',
            };

            this.collisions.push(event);
            if (this.collisions.length > 200) this.collisions.shift();

            store.emit('collision-detected', event);
          }
        }
        // ── Near-miss detection ───────────────────────────────────────────
        else if (edgeDist < this.NEAR_MISS_DISTANCE_PX) {
          const relSpeed = Math.abs(a.speed - b.speed);

          // Only count as near-miss if there's meaningful relative motion
          // (prevents queued vehicles behind each other from registering)
          const headingDiff = Math.abs(
            Math.cos(a.angle) * Math.cos(b.angle) +
            Math.sin(a.angle) * Math.sin(b.angle)
          );
          const isConflicting = headingDiff < 0.85 || relSpeed > this.NEAR_MISS_MIN_RELSPEED;

          if (isConflicting) {
            const lastNM = this._nearMissCooldown.get(pairKey) || 0;
            if (now - lastNM > this.COOLDOWN_MS) {
              this._nearMissCooldown.set(pairKey, now);

              const riskLevel = edgeDist < 8 ? 'HIGH' : edgeDist < 18 ? 'MEDIUM' : 'LOW';

              const event = {
                id: `nm-${now}-${Math.random().toString(36).slice(2,6)}`,
                timestamp: now,
                vehicleAId: a.id,
                vehicleBId: b.id,
                minSeparation: Math.max(0, edgeDist),
                relativeSpeed: relSpeed,
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2,
                riskLevel,
                location: 'Downtown Central',
              };

              this.nearMisses.push(event);
              if (this.nearMisses.length > 200) this.nearMisses.shift();

              store.emit('near-miss-detected', event);
            }
          }
        }
      }
    }

    // Prune cooldown maps to avoid memory leak
    if (this._collisionCooldown.size > 500) {
      for (const [k, t] of this._collisionCooldown) {
        if (now - t > this.COOLDOWN_MS * 2) this._collisionCooldown.delete(k);
      }
    }
    if (this._nearMissCooldown.size > 500) {
      for (const [k, t] of this._nearMissCooldown) {
        if (now - t > this.COOLDOWN_MS * 2) this._nearMissCooldown.delete(k);
      }
    }
  }

  /**
   * Compute the intersection safety score (0–100) from actual simulation metrics.
   * Weights: collisions 40%, near-misses 25%, speed 10%, density 10%, wait 5%, throughput 10%.
   */
  computeSafetyScore(metrics) {
    const {
      collisionsLast60s = 0,
      nearMissesLast60s = 0,
      avgSpeed = 0,
      densityPct = 0,
      avgWaitTime = 0,
      throughput = 0,
    } = metrics;

    // Collision penalty: each collision in last 60s costs up to 40 points (capped at 4 collisions)
    const collisionPenalty = Math.min(40, collisionsLast60s * 10);

    // Near-miss penalty: each near miss costs up to 25 points (capped at 5)
    const nearMissPenalty = Math.min(25, nearMissesLast60s * 5);

    // Congestion penalty (density): 0–10 pts if density > 70%
    const congestionPenalty = Math.min(10, Math.max(0, (densityPct - 70) / 30 * 10));

    // Excessive stopping penalty (wait time > 30s is bad): 0–5 pts
    const waitPenalty = Math.min(5, Math.max(0, (avgWaitTime - 30) / 30 * 5));

    // Speed health bonus: reward smooth flow (avg speed > 60% of desired)
    const speedBonus = Math.min(10, (avgSpeed / 4.0) * 10);

    // Throughput bonus: up to 10 pts for healthy throughput (>= 30 veh/min)
    const throughputBonus = Math.min(10, (throughput / 60) * 10);

    const score = 100
      - collisionPenalty
      - nearMissPenalty
      - congestionPenalty
      - waitPenalty
      + speedBonus * 0.5  // partial bonus (base already at 100)
      + throughputBonus * 0.5;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Get category label and color class for a given score.
   */
  static getCategory(score) {
    if (score >= 90) return { label: 'EXCELLENT',       color: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-600' };
    if (score >= 75) return { label: 'GOOD',            color: 'text-cyan-400',    bg: 'bg-cyan-950',    border: 'border-cyan-600'    };
    if (score >= 60) return { label: 'MODERATE',        color: 'text-yellow-400',  bg: 'bg-yellow-950',  border: 'border-yellow-600'  };
    if (score >= 40) return { label: 'RISK ELEVATED',   color: 'text-amber-400',   bg: 'bg-amber-950',   border: 'border-amber-600'   };
    return               { label: 'CRITICAL',           color: 'text-red-400',     bg: 'bg-red-950',     border: 'border-red-700'     };
  }

  /**
   * Generate a plain-language primary concern from actual current metrics.
   */
  static getPrimaryConcern(score, metrics) {
    const { collisionsLast60s, nearMissesLast60s, densityPct, avgWaitTime, avgSpeed } = metrics;
    if (collisionsLast60s > 0)     return `${collisionsLast60s} collision(s) recorded — immediate safety risk.`;
    if (nearMissesLast60s >= 4)    return `Elevated near-miss rate (${nearMissesLast60s}) — conflicting vehicle paths detected.`;
    if (densityPct > 80)           return `Elevated traffic density (${Math.round(densityPct)}%) reducing reaction margins.`;
    if (avgWaitTime > 30)          return `Prolonged queue wait (${avgWaitTime.toFixed(1)}s avg) — signal cycle mismatch.`;
    if (avgSpeed < 1.5)            return 'Low average speed — widespread queuing across approaches.';
    if (score >= 90)               return 'All parameters nominal. Optimal flow maintained across all corridors.';
    return 'Traffic conditions stable. Monitoring for density fluctuations.';
  }

  /** Count events in the last N milliseconds */
  countRecent(arr, windowMs = 60000) {
    const cutoff = Date.now() - windowMs;
    return arr.filter(e => e.timestamp > cutoff).length;
  }

  reset() {
    this.collisions = [];
    this.nearMisses = [];
    this._collisionCooldown.clear();
    this._nearMissCooldown.clear();
  }
}

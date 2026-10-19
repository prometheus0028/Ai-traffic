/**
 * AI Traffic Command Center - Fixed-Time Baseline Twin Simulator
 * Simulates a parallel shadow intersection operating under a strict, unyielding fixed-time schedule
 * subjected to the EXACT same incoming vehicle arrival stream for genuine, honest benchmarking.
 */

export class FixedBaselineTwin {
  constructor() {
    this.simTime = 0;
    this.phaseIndex = 0; // 0=NS_GREEN, 1=NS_YELLOW, 2=ALL_RED, 3=EW_GREEN, 4=EW_YELLOW, 5=ALL_RED
    this.phaseTimer = 0;

    // Strict fixed timing schedule (seconds)
    this.phaseDurations = [22, 3, 2, 22, 3, 2];

    // Queues per approach
    this.queues = {
      N: [], // Array of { id, spawnTime, waitTime, isEmergency }
      S: [],
      E: [],
      W: [],
    };

    // Discharge timers per approach (saturation headway ~ 1.8s per vehicle across 3 lanes = ~0.6s per departure)
    this.dischargeTimers = { N: 0, S: 0, E: 0, W: 0 };
    this.dischargeInterval = 0.65; // Seconds per vehicle discharge during green

    // Running performance statistics
    this.completedWaitTimes = [];
    this.totalDischarged = 0;
    this.totalIdleSeconds = 0;
    this.recentDepartures = []; // Timestamps of departures in last 60s
  }

  /**
   * Advance fixed baseline twin by dt seconds
   */
  update(dt) {
    // 1. Advance Fixed Phase Timer
    this.simTime += dt;
    this.phaseTimer += dt;
    if (this.phaseTimer >= this.phaseDurations[this.phaseIndex]) {
      this.phaseTimer = 0;
      this.phaseIndex = (this.phaseIndex + 1) % this.phaseDurations.length;
    }

    const currentPhase = this.getCurrentPhaseName();

    // 2. Accumulate Wait Time for Queued Vehicles on Red / Amber
    ['N', 'S', 'E', 'W'].forEach((dir) => {
      const isGreen =
        (currentPhase === 'NS_GREEN' && (dir === 'N' || dir === 'S')) ||
        (currentPhase === 'EW_GREEN' && (dir === 'E' || dir === 'W'));

      // If red or yellow, all queued vehicles accumulate wait time
      if (!isGreen) {
        this.queues[dir].forEach((v) => {
          v.waitTime += dt;
          this.totalIdleSeconds += dt;
        });
      } else {
        // If green, only vehicles further back in the queue accumulate wait time
        this.queues[dir].forEach((v, idx) => {
          if (idx > 0) {
            v.waitTime += dt;
            this.totalIdleSeconds += dt;
          }
        });

        // 3. Discharge vehicles from green approach at saturation flow rate
        if (this.queues[dir].length > 0) {
          this.dischargeTimers[dir] += dt;
          if (this.dischargeTimers[dir] >= this.dischargeInterval) {
            this.dischargeTimers[dir] = 0;
            const departed = this.queues[dir].shift();
            if (departed) {
              this.totalDischarged++;
              this.completedWaitTimes.push(departed.waitTime);
              if (this.completedWaitTimes.length > 50) {
                this.completedWaitTimes.shift();
              }
              this.recentDepartures.push((this.simTime * 1000));
            }
          }
        } else {
          this.dischargeTimers[dir] = 0;
        }
      }
    });

    // Prune old departures > 60s
    const cutoff = (this.simTime * 1000) - 60000;
    this.recentDepartures = this.recentDepartures.filter((t) => t > cutoff);
  }

  /**
   * Receive spawned vehicle from main simulation
   */
  onVehicleSpawned(vehicle) {
    if (this.queues[vehicle.approach]) {
      this.queues[vehicle.approach].push({
        id: vehicle.id,
        approach: vehicle.approach,
        spawnTime: (this.simTime * 1000),
        waitTime: 0,
        isEmergency: vehicle.isEmergency,
      });
    }
  }

  getCurrentPhaseName() {
    switch (this.phaseIndex) {
      case 0: return 'NS_GREEN';
      case 1: return 'NS_YELLOW';
      case 2: return 'ALL_RED';
      case 3: return 'EW_GREEN';
      case 4: return 'EW_YELLOW';
      case 5: return 'ALL_RED';
      default: return 'NS_GREEN';
    }
  }

  /**
   * Calculate honest, live measured average wait time
   */
  getAverageWaitTime() {
    let totalWait = 0;
    let count = 0;

    // Active queued vehicles wait times
    ['N', 'S', 'E', 'W'].forEach((dir) => {
      this.queues[dir].forEach((v) => {
        totalWait += v.waitTime;
        count++;
      });
    });

    // Blend with recent completed vehicle wait times for stability
    if (this.completedWaitTimes.length > 0) {
      const completedSum = this.completedWaitTimes.reduce((a, b) => a + b, 0);
      totalWait += completedSum;
      count += this.completedWaitTimes.length;
    }

    return count > 0 ? Number((totalWait / count).toFixed(1)) : 0;
  }

  getTotalQueuedCount() {
    return (
      this.queues.N.length +
      this.queues.S.length +
      this.queues.E.length +
      this.queues.W.length
    );
  }

  getThroughputPerMinute() {
    return Math.max(0, this.recentDepartures.length);
  }

  reset() {
    this.queues = { N: [], S: [], E: [], W: [] };
    this.completedWaitTimes = [];
    this.totalDischarged = 0;
    this.totalIdleSeconds = 0;
    this.recentDepartures = [];
    this.phaseIndex = 0;
    this.phaseTimer = 0;
  }
}

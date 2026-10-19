/**
 * CivixFlow - Vehicle Agent
 * Simple linear car-following model: smooth traffic flow over complex IDM.
 * Retains signal compliance, Bezier turns, emergency strobes, and telemetry.
 */

import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/mathUtils.js';

export class Vehicle {
  constructor(options = {}) {
    this.id = 'veh-' + Math.random().toString(36).substring(2, 9);
    this.typeKey = options.typeKey || 'SEDAN';
    this.spec = CONFIG.VEHICLES.TYPES[this.typeKey] || CONFIG.VEHICLES.TYPES.SEDAN;

    // Speed variance per driver (+/- 8%)
    this.driverSpeedVariance = 0.93 + Math.random() * 0.14;

    // Position & kinematics
    this.x = typeof options.x === 'number' && !isNaN(options.x) ? options.x : 0;
    this.y = typeof options.y === 'number' && !isNaN(options.y) ? options.y : 0;
    this.maxSpeed = Math.max(1.0, this.spec.maxSpeed * this.driverSpeedVariance);
    this.speed = options.speed !== undefined && !isNaN(options.speed)
      ? options.speed
      : this.maxSpeed * 0.75;
    this.accel = Math.max(0.4, this.spec.accel || 2.2);
    this.decel = 5.0;  // comfortable braking
    this.angle = typeof options.angle === 'number' && !isNaN(options.angle) ? options.angle : 0;

    // Approach & routing
    this.approach = options.approach || 'S';
    this.laneIndex = options.laneIndex !== undefined ? options.laneIndex : 1;
    this.turnIntent = options.turnIntent || 'STRAIGHT';
    this.intersectionId = options.intersectionId || 'int-downtown';

    // State machine
    this.state = 'APPROACHING'; // APPROACHING | QUEUED | CROSSING | EXITED
    this.hasCrossedStopLine = false;
    this.turnProgress = 0;
    this.turnPath = null;

    // Telemetry
    this.spawnTime = performance.now();
    this.waitTime = 0;
    this.totalTripTime = 0;
    this.idleSeconds = 0;
    this.movingSeconds = 0;
    this.distanceTraveled = 0;
    this.isBraking = false;
    this.wasStopped = false;
    this.stopsCount = 0;

    // Emergency
    this.isEmergency = !!this.spec.isEmergency;
    this.emergencyPriority = this.spec.priority || 0;
    this.strobePhase = Math.random() * Math.PI * 2;

    // Visual
    this.color = options.color || this.spec.color;
  }

  /**
   * Simple linear following model.
   * Vehicles: accelerate to desired speed, maintain gap to leader, stop at red.
   */
  update(dt, intersection, vehicleAhead, scenarioConfig = {}) {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.08);
    this.totalTripTime += safeDt;
    this.strobePhase += safeDt * 12;

    const speedFactor = scenarioConfig.speedFactor || 1.0;
    const desiredSpeed = this.maxSpeed * speedFactor;
    const minGap = this.spec.length + 12; // minimum bumper-to-bumper gap in px

    // 1. Signal compliance
    const distToStop = this.calculateDistanceToStopLine(intersection);
    const signalState = intersection
      ? intersection.getSignalStateForApproach(this.approach, this.turnIntent)
      : 'GREEN';

    let mustStop = false;
    if ((this.state === 'APPROACHING' || this.state === 'QUEUED') && !this.hasCrossedStopLine) {
      if (distToStop <= 2) {
        this.hasCrossedStopLine = true;
        this.state = 'CROSSING';
        this._initTurnPath(intersection);
      } else if (distToStop < 260) {
        if (signalState === 'RED') {
          mustStop = true;
        } else if (signalState === 'YELLOW') {
          // stop only if we can comfortably stop before the line
          const stopDist = (this.speed * this.speed) / (2 * this.decel * 28);
          if (distToStop > stopDist + 8) mustStop = true;
        }
      }
    }

    // 2. Target speed — limited by gap to leader and signal
    let targetSpeed = desiredSpeed;

    // Slow for vehicle ahead — simple distance-proportional braking
    if (vehicleAhead && !isNaN(vehicleAhead.x)) {
      const gap = MathUtils.distance(this.x, this.y, vehicleAhead.x, vehicleAhead.y)
                  - (this.spec.length / 2 + vehicleAhead.spec.length / 2);
      const safeGap = Math.max(6, gap);
      if (safeGap < minGap * 2.5) {
        // Proportionally reduce speed as gap shrinks
        const gapRatio = safeGap / (minGap * 2.5);
        targetSpeed = Math.min(targetSpeed, vehicleAhead.speed + gapRatio * desiredSpeed);
      }
      if (safeGap < minGap) targetSpeed = 0; // hold behind stopped leader
    }

    // Slow for stop line
    if (mustStop) {
      const safeStop = Math.max(6, distToStop);
      // ramp down speed over ~80 px approach
      const fraction = Math.min(1, safeStop / 80);
      targetSpeed = Math.min(targetSpeed, fraction * desiredSpeed);
      if (safeStop < 14) targetSpeed = 0;
    }

    // Emergency vehicles ignore red lights (they have preemption)
    // Emergency traffic obeys the preempted signal and the vehicle ahead.

    // Crossing turn speed cap
    if (this.state === 'CROSSING' && this.turnPath && this.turnIntent !== 'STRAIGHT') {
      targetSpeed = Math.min(targetSpeed, desiredSpeed * 0.6);
    }

    // 3. Accelerate/decelerate toward targetSpeed
    const diff = targetSpeed - this.speed;
    const accelLimit = this.accel;
    const decelLimit = this.decel;
    const dv = diff > 0
      ? Math.min(diff, accelLimit * safeDt * 2.5)
      : Math.max(diff, -decelLimit * safeDt * 2.5);

    this.speed = Math.max(0, Math.min(desiredSpeed * 1.3, this.speed + dv));
    if (!isFinite(this.speed)) this.speed = 0;

    this.isBraking = diff < -0.5;

    // 4. Telemetry accumulators
    if (this.speed < 0.3) {
      this.waitTime += safeDt;
      this.idleSeconds += safeDt;
      if (!this.wasStopped) { this.stopsCount++; this.wasStopped = true; }
      if (this.state === 'APPROACHING') this.state = 'QUEUED';
    } else {
      this.movingSeconds += safeDt;
      this.wasStopped = false;
      if (this.state === 'QUEUED') this.state = 'APPROACHING';
    }

    // 5. Move
    if (this.state === 'CROSSING' && this.turnPath) {
      const pathLen = Math.max(10, this.turnPath.length);
      this.turnProgress += (this.speed / pathLen) * safeDt * 28;
      if (this.turnProgress >= 1.0) {
        this.turnProgress = 1.0;
        this.state = 'EXITED';
        this.x = this.turnPath.p2.x;
        this.y = this.turnPath.p2.y;
        this.angle = this.turnPath.endAngle;
      } else {
        const pt = MathUtils.bezierPoint(
          this.turnPath.p0, this.turnPath.p1, this.turnPath.p2, this.turnProgress
        );
        if (isFinite(pt.x) && isFinite(pt.y)) { this.x = pt.x; this.y = pt.y; }
        const ang = MathUtils.bezierTangentAngle(
          this.turnPath.p0, this.turnPath.p1, this.turnPath.p2, this.turnProgress
        );
        if (isFinite(ang)) this.angle = ang;
      }
    } else {
      if (isFinite(this.angle)) {
        this.x += Math.cos(this.angle) * this.speed * safeDt * 28;
        this.y += Math.sin(this.angle) * this.speed * safeDt * 28;
      }
    }
    if (!isFinite(this.x)) this.x = 0;
    if (!isFinite(this.y)) this.y = 0;

    this.distanceTraveled += this.speed * safeDt * 28;
  }

  calculateDistanceToStopLine(intersection) {
    if (!intersection) return 999;
    const center = intersection.center || { x: 400, y: 400 };
    const stopDistance = 135;
    switch (this.approach) {
      case 'S': return this.y - (center.y + stopDistance);
      case 'N': return (center.y - stopDistance) - this.y;
      case 'W': return (center.x - stopDistance) - this.x;
      case 'E': return this.x - (center.x + stopDistance);
      default:  return 999;
    }
  }

  _initTurnPath(intersection) {
    const center = intersection ? intersection.center : { x: 400, y: 400 };
    const p0 = { x: this.x, y: this.y };
    if (this.turnIntent === 'STRAIGHT') { this.turnPath = null; return; }

    let p1 = { ...center }, p2 = { x: this.x, y: this.y }, endAngle = this.angle;

    if (this.turnIntent === 'RIGHT') {
      switch (this.approach) {
        case 'S': p1={x:center.x+80,y:center.y+80}; p2={x:center.x+160,y:center.y+60}; endAngle=0; break;
        case 'N': p1={x:center.x-80,y:center.y-80}; p2={x:center.x-160,y:center.y-60}; endAngle=Math.PI; break;
        case 'W': p1={x:center.x-80,y:center.y+80}; p2={x:center.x-60,y:center.y+160}; endAngle=Math.PI/2; break;
        case 'E': p1={x:center.x+80,y:center.y-80}; p2={x:center.x+60,y:center.y-160}; endAngle=-Math.PI/2; break;
      }
    } else if (this.turnIntent === 'LEFT') {
      switch (this.approach) {
        case 'S': p1={x:center.x-20,y:center.y-20}; p2={x:center.x-160,y:center.y-40}; endAngle=Math.PI; break;
        case 'N': p1={x:center.x+20,y:center.y+20}; p2={x:center.x+160,y:center.y+40}; endAngle=0; break;
        case 'W': p1={x:center.x+20,y:center.y-20}; p2={x:center.x+40,y:center.y-160}; endAngle=-Math.PI/2; break;
        case 'E': p1={x:center.x-20,y:center.y+20}; p2={x:center.x-40,y:center.y+160}; endAngle=Math.PI/2; break;
      }
    }

    const approxLength = Math.max(10,
      MathUtils.distance(p0.x,p0.y,p1.x,p1.y) + MathUtils.distance(p1.x,p1.y,p2.x,p2.y)
    );
    this.turnPath = { p0, p1, p2, length: approxLength, endAngle };
  }

  isOutOfBounds(width = 800, height = 800, padding = 160) {
    if (!isFinite(this.x) || !isFinite(this.y)) return true;
    return this.x < -padding || this.x > width + padding ||
           this.y < -padding || this.y > height + padding;
  }
}

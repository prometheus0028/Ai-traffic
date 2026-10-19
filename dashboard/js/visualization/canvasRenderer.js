/**
 * AI Traffic Command Center - High-Definition 2D Canvas Renderer
 * Renders roads, crosswalks, traffic lights with glow effects, animated vehicles, brake lights, and strobes.
 */

import { PHASES } from '../simulation/intersection.js';
import { CONFIG } from '../config.js';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.radarAngle = 0;
    this.vehicleSprites = new Map();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, 800);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(size * this.dpr);
    this.canvas.height = Math.round(size * this.dpr);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.width = size;
    this.height = size;
  }

  /**
   * Main render frame
   */
  render(intersection, vehicles, isAiMode, activeEmergency, alpha = 1) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Scaling factor if canvas is resized
    const scale = w / 800;
    ctx.save();
    ctx.scale(scale, scale);

    // 1. Draw Background Grid & Terrain
    if (!this.roadLayer || this.roadWidth !== intersection.roadWidth) {
      this.roadLayer = document.createElement('canvas');
      this.roadLayer.width = this.roadLayer.height = 1600;
      const roadContext = this.roadLayer.getContext('2d');
      roadContext.scale(2, 2);
      this.drawBackground(roadContext);
      this.drawRoads(roadContext, intersection);
      this.roadWidth = intersection.roadWidth;
    }
    ctx.drawImage(this.roadLayer, 0, 0, 800, 800);

    // 3. Draw Queue Heatmaps & Sensor Detection Zones
    this.drawSensorOverlays(ctx, intersection);

    // 4. Draw Vehicles with Lights & Strobes
    const positions = vehicles.map(v => [v.x, v.y, v.angle]);
    for (const v of vehicles) {
      v.x = (v.previousX ?? v.x) + (v.x - (v.previousX ?? v.x)) * alpha;
      v.y = (v.previousY ?? v.y) + (v.y - (v.previousY ?? v.y)) * alpha;
      const from = v.previousAngle ?? v.angle;
      const delta = Math.atan2(Math.sin(v.angle - from), Math.cos(v.angle - from));
      v.angle = from + delta * alpha;
    }
    this.drawVehicles(ctx, intersection, vehicles);
    vehicles.forEach((v, i) => { [v.x, v.y, v.angle] = positions[i]; });

    // 5. Draw Traffic Signal Fixtures & Glow
    this.drawTrafficLights(ctx, intersection);

    // 6. Draw Emergency Corridor Highlights (if active)
    if (activeEmergency && activeEmergency.intersectionId === intersection.id) {
      this.drawEmergencyCorridorOverlay(ctx, intersection, activeEmergency);
    }

    // 7. Draw Mini Radar Sweep in corner
    this.drawRadarOverlay(ctx);

    ctx.restore();
  }

  drawBackground(ctx) {
    // Cyberpunk dark blueprint background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 800, 800);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= 800; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 800);
      ctx.stroke();
    }
    for (let y = 0; y <= 800; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }
  }

  drawRoads(ctx, intersection) {
    const cx = 400;
    const cy = 400;
    const rw = intersection ? intersection.roadWidth : 160;
    const halfRw = rw / 2;

    // Road asphalt fill
    ctx.fillStyle = '#161c28';

    // North-South Road
    ctx.fillRect(cx - halfRw, 0, rw, 800);
    // East-West Road
    ctx.fillRect(0, cy - halfRw, 800, rw);

    // Road Borders / Curbs with subtle cyan glow
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;

    // Corner curbs
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(0, cy - halfRw);
    ctx.lineTo(cx - halfRw, cy - halfRw);
    ctx.lineTo(cx - halfRw, 0);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(cx + halfRw, 0);
    ctx.lineTo(cx + halfRw, cy - halfRw);
    ctx.lineTo(800, cy - halfRw);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(0, cy + halfRw);
    ctx.lineTo(cx - halfRw, cy + halfRw);
    ctx.lineTo(cx - halfRw, 800);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(cx + halfRw, 800);
    ctx.lineTo(cx + halfRw, cy + halfRw);
    ctx.lineTo(800, cy + halfRw);
    ctx.stroke();

    // Center Yellow Double Divider Lines
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // North Center
    ctx.beginPath();
    ctx.moveTo(cx - 2, 0);
    ctx.lineTo(cx - 2, cy - halfRw - 30);
    ctx.moveTo(cx + 2, 0);
    ctx.lineTo(cx + 2, cy - halfRw - 30);
    ctx.stroke();

    // South Center
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + halfRw + 30);
    ctx.lineTo(cx - 2, 800);
    ctx.moveTo(cx + 2, cy + halfRw + 30);
    ctx.lineTo(cx + 2, 800);
    ctx.stroke();

    // East Center
    ctx.beginPath();
    ctx.moveTo(cx + halfRw + 30, cy - 2);
    ctx.lineTo(800, cy - 2);
    ctx.moveTo(cx + halfRw + 30, cy + 2);
    ctx.lineTo(800, cy + 2);
    ctx.stroke();

    // West Center
    ctx.beginPath();
    ctx.moveTo(0, cy - 2);
    ctx.lineTo(cx - halfRw - 30, cy - 2);
    ctx.moveTo(0, cy + 2);
    ctx.lineTo(cx - halfRw - 30, cy + 2);
    ctx.stroke();

    // White Dashed Lane Dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 12]);

    const laneOffset = rw / 4;

    // NS lanes
    ctx.beginPath();
    ctx.moveTo(cx - laneOffset, 0);
    ctx.lineTo(cx - laneOffset, cy - halfRw - 30);
    ctx.moveTo(cx + laneOffset, 0);
    ctx.lineTo(cx + laneOffset, cy - halfRw - 30);
    ctx.moveTo(cx - laneOffset, cy + halfRw + 30);
    ctx.lineTo(cx - laneOffset, 800);
    ctx.moveTo(cx + laneOffset, cy + halfRw + 30);
    ctx.lineTo(cx + laneOffset, 800);
    ctx.stroke();

    // EW lanes
    ctx.beginPath();
    ctx.moveTo(0, cy - laneOffset);
    ctx.lineTo(cx - halfRw - 30, cy - laneOffset);
    ctx.moveTo(0, cy + laneOffset);
    ctx.lineTo(cx - halfRw - 30, cy + laneOffset);
    ctx.moveTo(cx + halfRw + 30, cy - laneOffset);
    ctx.lineTo(800, cy - laneOffset);
    ctx.moveTo(cx + halfRw + 30, cy + laneOffset);
    ctx.lineTo(800, cy + laneOffset);
    ctx.stroke();

    ctx.setLineDash([]);

    // Solid Stop Lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;

    // North Stop Line
    ctx.beginPath();
    ctx.moveTo(cx - halfRw, cy - halfRw - 15);
    ctx.lineTo(cx, cy - halfRw - 15);
    ctx.stroke();

    // South Stop Line
    ctx.beginPath();
    ctx.moveTo(cx, cy + halfRw + 15);
    ctx.lineTo(cx + halfRw, cy + halfRw + 15);
    ctx.stroke();

    // West Stop Line
    ctx.beginPath();
    ctx.moveTo(cx - halfRw - 15, cy);
    ctx.lineTo(cx - halfRw - 15, cy + halfRw);
    ctx.stroke();

    // East Stop Line
    ctx.beginPath();
    ctx.moveTo(cx + halfRw + 15, cy - halfRw);
    ctx.lineTo(cx + halfRw + 15, cy);
    ctx.stroke();

    // Pedestrian Zebra Crosswalks
    this.drawCrosswalks(ctx, cx, cy, halfRw);
  }

  drawCrosswalks(ctx, cx, cy, halfRw) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const barWidth = 6;
    const barGap = 6;

    // North Crosswalk
    for (let x = cx - halfRw; x <= cx + halfRw; x += barWidth + barGap) {
      ctx.fillRect(x, cy - halfRw - 10, barWidth, 8);
    }
    // South Crosswalk
    for (let x = cx - halfRw; x <= cx + halfRw; x += barWidth + barGap) {
      ctx.fillRect(x, cy + halfRw + 2, barWidth, 8);
    }
    // West Crosswalk
    for (let y = cy - halfRw; y <= cy + halfRw; y += barWidth + barGap) {
      ctx.fillRect(cx - halfRw - 10, y, 8, barWidth);
    }
    // East Crosswalk
    for (let y = cy - halfRw; y <= cy + halfRw; y += barWidth + barGap) {
      ctx.fillRect(cx + halfRw + 2, y, 8, barWidth);
    }
  }

  drawSensorOverlays(ctx, intersection) {
    if (!intersection) return;
    const cx = 400;
    const cy = 400;
    const app = intersection.approaches;

    // Draw queue level visual heat indicator per approach
    const drawApproachHeat = (dir, queueCount) => {
      if (queueCount === 0) return;
      const alpha = Math.min(0.5, queueCount * 0.08);
      ctx.fillStyle = queueCount > 8 ? `rgba(239, 68, 68, ${alpha})` : `rgba(245, 158, 11, ${alpha})`;

      if (dir === 'S') ctx.fillRect(cx, cy + 95, 80, 220);
      else if (dir === 'N') ctx.fillRect(cx - 80, cy - 315, 80, 220);
      else if (dir === 'W') ctx.fillRect(cx - 315, cy, 220, 80);
      else if (dir === 'E') ctx.fillRect(cx + 95, cy - 80, 220, 80);
    };

    drawApproachHeat('N', app.N.queueCount);
    drawApproachHeat('S', app.S.queueCount);
    drawApproachHeat('E', app.E.queueCount);
    drawApproachHeat('W', app.W.queueCount);
  }

  drawVehicles(ctx, intersection, vehicles) {
    // Cache the expensive shadows/gradients once per vehicle appearance.
    for (const vehicle of vehicles) {
      if (vehicle.intersectionId !== intersection.id) continue;
      if (vehicle.isEmergency) {
        this.drawVehicleShapes(ctx, intersection, [vehicle]);
        continue;
      }
      const braking = vehicle.isBraking || vehicle.speed < 0.3;
      const key = `${vehicle.typeKey}:${vehicle.color}:${braking}`;
      let sprite = this.vehicleSprites.get(key);
      const width = vehicle.spec.length + 85, height = 80;
      const origin = vehicle.spec.length / 2 + 16;
      if (!sprite) {
        sprite = document.createElement('canvas');
        sprite.width = width * 2; sprite.height = height * 2;
        const spriteContext = sprite.getContext('2d');
        spriteContext.scale(2, 2);
        this.drawVehicleShapes(spriteContext, intersection, [{...vehicle, x:origin, y:40, angle:0}]);
        this.vehicleSprites.set(key, sprite);
      }
      ctx.save();
      ctx.translate(vehicle.x, vehicle.y); ctx.rotate(vehicle.angle);
      ctx.drawImage(sprite, -origin, -40, width, height);
      ctx.restore();
    }
  }

  drawVehicleShapes(ctx, intersection, vehicles) {
    vehicles.forEach((veh) => {
      if (intersection && veh.intersectionId !== intersection.id) return;

      ctx.save();
      ctx.translate(veh.x, veh.y);
      ctx.rotate(veh.angle);

      const len = veh.spec.length;
      const wid = veh.spec.width;

      // 1. Vehicle Body Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      // 2. Vehicle Main Chassis
      ctx.fillStyle = veh.color;
      ctx.beginPath();
      ctx.roundRect(-len / 2, -wid / 2, len, wid, 4);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // 3. Windshield & Windows
      ctx.fillStyle = '#0f172a';
      // Front windshield
      ctx.fillRect(len * 0.1, -wid * 0.4, len * 0.22, wid * 0.8);
      // Rear windshield
      ctx.fillRect(-len * 0.35, -wid * 0.35, len * 0.15, wid * 0.7);

      // 4. Headlights (Bright Yellow-White Cone)
      ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.beginPath();
      ctx.arc(len / 2 - 1, -wid / 3, 2, 0, Math.PI * 2);
      ctx.arc(len / 2 - 1, wid / 3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Headlight illumination cone on road
      const grad = ctx.createLinearGradient(len / 2, 0, len / 2 + 40, 0);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
      grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(len / 2, -wid / 2);
      ctx.lineTo(len / 2 + 40, -wid * 1.2);
      ctx.lineTo(len / 2 + 40, wid * 1.2);
      ctx.lineTo(len / 2, wid / 2);
      ctx.closePath();
      ctx.fill();

      // 5. Brake Lights (Glowing Red when braking or stopped)
      if (veh.isBraking || veh.speed < 0.3) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(-len / 2 + 1, -wid / 3, 2.5, 0, Math.PI * 2);
        ctx.arc(-len / 2 + 1, wid / 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
      }

      // 6. Emergency Strobes (Alternating Red/Blue Flashing Bar)
      if (veh.isEmergency) {
        const strobe = Math.sin(veh.strobePhase);
        ctx.shadowBlur = 15;

        // Red strobe
        ctx.fillStyle = strobe > 0 ? '#ef4444' : '#1e3a8a';
        ctx.shadowColor = '#ef4444';
        ctx.fillRect(-2, -wid / 2 + 1, 4, wid * 0.45);

        // Blue strobe
        ctx.fillStyle = strobe <= 0 ? '#3b82f6' : '#7f1d1d';
        ctx.shadowColor = '#3b82f6';
        ctx.fillRect(-2, 1, 4, wid * 0.45);

        ctx.shadowColor = 'transparent';
      }

      ctx.restore();
    });
  }

  drawTrafficLights(ctx, intersection) {
    if (!intersection) return;
    const cx = 400;
    const cy = 400;
    const offset = 95;

    // Draw 4 Traffic Light Gantry Fixtures
    this.drawLightFixture(ctx, cx + 55, cy + offset, intersection.getSignalStateForApproach('S', 'STRAIGHT'), 'S', intersection);
    this.drawLightFixture(ctx, cx - 55, cy - offset, intersection.getSignalStateForApproach('N', 'STRAIGHT'), 'N', intersection);
    this.drawLightFixture(ctx, cx - offset, cy + 55, intersection.getSignalStateForApproach('W', 'STRAIGHT'), 'W', intersection);
    this.drawLightFixture(ctx, cx + offset, cy - 55, intersection.getSignalStateForApproach('E', 'STRAIGHT'), 'E', intersection);
  }

  drawLightFixture(ctx, x, y, state, approach, intersection) {
    ctx.save();
    ctx.translate(x, y);

    // Fixture background box
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-14, -28, 28, 56, 6);
    ctx.fill();
    ctx.stroke();

    // Red Lamp
    const isRed = state === 'RED';
    ctx.fillStyle = isRed ? '#ef4444' : '#450a0a';
    if (isRed) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(0, -16, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Yellow Lamp
    const isYellow = state === 'YELLOW';
    ctx.fillStyle = isYellow ? '#eab308' : '#422006';
    if (isYellow) {
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Green Lamp
    const isGreen = state === 'GREEN';
    ctx.fillStyle = isGreen ? '#10b981' : '#022c22';
    if (isGreen) {
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(0, 16, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Countdown Badge
    if (isGreen) {
      const remaining = Math.max(0, Math.ceil(intersection.allocatedGreenTime - intersection.phaseTimer));
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${remaining}s`, 0, 38);
    }

    ctx.restore();
  }

  drawEmergencyCorridorOverlay(ctx, intersection, emergency) {
    const cx = 400;
    const cy = 400;

    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);

    // Pulsing emergency boundary
    ctx.beginPath();
    ctx.arc(cx, cy, 260 + Math.sin(Date.now() * 0.008) * 15, 0, Math.PI * 2);
    ctx.stroke();

    // Banner Text
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🚨 EMERGENCY CORRIDOR ACTIVE: ${emergency.vehicleType}`, cx, 50);
    ctx.restore();
  }

  drawRadarOverlay(ctx) {
    this.radarAngle += 0.03;
    const rx = 60;
    const ry = 60;
    const radius = 40;

    ctx.save();
    // Radar circle
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx, ry, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Sweep line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + Math.cos(this.radarAngle) * radius, ry + Math.sin(this.radarAngle) * radius);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '8px monospace';
    ctx.fillText('RADAR SENSORS ONLINE', 20, 115);
    ctx.restore();
  }
}

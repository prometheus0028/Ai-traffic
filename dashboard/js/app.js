/** CivixFlow is the primary UI; device telemetry never advances vehicle physics. */
import { SimulationEngine } from './simulation/engine.js';
import { SimulationClock } from './simulation/clock.js';
import { AdaptiveSignalAI } from './ai/adaptiveSignalAI.js';
import { CongestionPredictor } from './ai/predictor.js';
import { EmergencyPriorityManager } from './ai/emergencyPreempt.js';
import { CanvasRenderer } from './visualization/canvasRenderer.js';
import { TelemetryCharts } from './visualization/charts.js';
import { UIComponents } from './visualization/uiComponents.js';
import { store } from './state/store.js';
import { Backend } from './backend.js';

class App {
  init() {
    this.engine = new SimulationEngine();
    this.clock = new SimulationClock();
    this.ai = new AdaptiveSignalAI(this.engine.network);
    this.predictor = new CongestionPredictor(this.engine.network);
    this.emergencyManager = new EmergencyPriorityManager(this.engine);
    this.renderer = new CanvasRenderer(document.getElementById('trafficCanvas'));
    this.charts = new TelemetryCharts();
    this.ui = new UIComponents(this.engine);
    this.backend = new Backend(this.engine);
    store.on('telemetry-updated', () => this.charts.update(store.getState().history));
    const observer = new ResizeObserver(() => this.renderer.resize());
    observer.observe(this.renderer.canvas.parentElement);
    this.renderer.resize();
    window.lucide?.createIcons();
    this.lastTime = performance.now();
    this.frameCount = 0; this.fpsTime = this.lastTime;
    document.addEventListener('visibilitychange', () => { this.lastTime = performance.now(); this.clock.accumulator = 0; });
    requestAnimationFrame(t => this.frame(t));
  }

  frame(now) {
    const state = store.getState();
    this.backend.update();
    const alpha = this.clock.advance((now - this.lastTime) / 1000, state.simulationSpeed, state.isRunning, (dt, time) => {
      for (const v of this.engine.vehicles) { v.previousX = v.x; v.previousY = v.y; v.previousAngle = v.angle; }
      this.engine.update(dt);
      if (!this.backend.controlsSimulation) this.ai.update(dt);
      if (!this.backend.controlsSimulation) this.emergencyManager.update(dt);
      this.predictor.update(dt);
      this.backend.update(time);
    });
    this.lastTime = now;
    const node = this.engine.network.getIntersection(state.activeIntersectionId);
    if (node) this.renderer.render(node, this.engine.vehicles, state.isAiMode, state.activeEmergency, alpha);
    this.frameCount++;
    if (now - this.fpsTime >= 1000) {
      document.getElementById('renderStats').textContent = `${Math.round(this.frameCount * 1000 / (now - this.fpsTime))} fps · ${this.engine.vehicles.length} cars · ${this.clock.time.toFixed(0)}s simulated`;
      this.frameCount = 0; this.fpsTime = now;
    }
    requestAnimationFrame(t => this.frame(t));
  }
}
window.addEventListener('DOMContentLoaded', () => {
  const app = new App(); app.init(); window.__trafficApp = app;
});

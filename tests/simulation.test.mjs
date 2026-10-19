import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationClock } from '../dashboard/js/simulation/clock.js';
import { Vehicle } from '../dashboard/js/simulation/vehicle.js';
import { Intersection } from '../dashboard/js/simulation/intersection.js';
import { SimulationEngine } from '../dashboard/js/simulation/engine.js';
import { store } from '../dashboard/js/state/store.js';
import { AdaptiveSignalAI } from '../dashboard/js/ai/adaptiveSignalAI.js';

test('physics and simulation speed are independent of display refresh rate', () => {
  for (const speed of [1,2,5]) {
    for (const fps of [30,60,144]) {
      const clock = new SimulationClock();
      let distance = 0;
      for (let i = 0; i < fps * 10; i++) clock.advance(1/fps, speed, true, dt => distance += dt * 20);
      assert.ok(Math.abs(distance - 200 * speed) < 0.001);
    }
  }
});

test('pausing does not accumulate time to catch up on resume', () => {
  const clock = new SimulationClock();
  clock.advance(30, 5, false, () => assert.fail('paused'));
  clock.advance(1/60, 1, true, () => {});
  assert.ok(clock.time < 0.02);
});

test('queued and emergency vehicles obey red signal', () => {
  const node = new Intersection();
  for (const typeKey of ['SEDAN','AMBULANCE']) {
    const v = new Vehicle({typeKey, approach:'E', x:545, y:365, angle:Math.PI, speed:0});
    v.state = 'QUEUED';
    for (let i=0; i<300; i++) v.update(1/60, node, null);
    assert.equal(v.speed, 0);
    assert.equal(v.x, 545);
  }
});

test('simulation stays finite across all traffic presets', () => {
  for (const preset of ['BALANCED','RUSH_HOUR','RAIN_WEATHER','INCIDENT_BOTTLENECK','EMERGENCY_RUSH']) {
    store.setPreset(preset);
    const engine = new SimulationEngine();
    for (let i=0; i<3600; i++) engine.update(1/60);
    assert.ok(engine.totalSpawned > 0);
    assert.ok(engine.vehicles.every(v => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.speed)));
    assert.ok(engine.vehicles.length <= 80);
  }
});

test('adaptive controller keeps running through actual phase switches', () => {
  store.setPreset('BALANCED');
  const engine = new SimulationEngine();
  const ai = new AdaptiveSignalAI(engine.network);
  for (let i=0; i<7200; i++) { engine.update(1/60); ai.update(1/60); }
  assert.ok(engine.totalCompleted > 0);
  assert.ok(store.getState().aiDecisions.length > 0);
});

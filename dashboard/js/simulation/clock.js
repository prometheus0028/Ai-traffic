// Fixed physics steps keep acceleration and signal timing identical at 30/60/144 Hz.
export class SimulationClock {
  constructor(step = 1 / 60, maxSteps = 30) {
    this.step = step;
    this.maxSteps = maxSteps;
    this.accumulator = 0;
    this.time = 0;
  }
  advance(realDelta, speed, running, update) {
    if (!running) { this.accumulator = 0; return 1; }
    this.accumulator += Math.min(Math.max(realDelta, 0), 0.1) * speed;
    let steps = 0;
    while (this.accumulator + 1e-10 >= this.step && steps < this.maxSteps) {
      this.time += this.step;
      update(this.step, this.time);
      this.accumulator -= this.step;
      steps++;
    }
    if (steps === this.maxSteps) this.accumulator = Math.min(this.accumulator, this.step);
    return Math.max(0, Math.min(1, this.accumulator / this.step));
  }
}

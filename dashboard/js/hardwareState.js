// The physical board has two red LEDs: 1 = stop, 0 = go.
// Virtual A groups N/S and virtual B groups E/W; cars are always simulated.
export function boardSignals(telemetry, fresh) {
  const stop = {N:'RED',S:'RED',E:'RED',W:'RED'};
  if (!fresh || !telemetry) return stop;
  let a, b;
  if ([0,1].includes(telemetry.la) && [0,1].includes(telemetry.lb)) {
    a = telemetry.la === 0; b = telemetry.lb === 0;
  } else {
    a = telemetry.ph === 'GREEN' && telemetry.g === 'A';
    b = telemetry.ph === 'GREEN' && telemetry.g === 'B';
  }
  // Both LEDs off is a supported LED-bench command, but cannot safely release
  // perpendicular simulated traffic. Show conflict and hold the visual all-red.
  if (a && b) return stop;
  return {N:a?'GREEN':'RED',S:a?'GREEN':'RED',E:b?'GREEN':'RED',W:b?'GREEN':'RED'};
}

export function hasSignalConflict(t) { return t?.la === 0 && t?.lb === 0; }

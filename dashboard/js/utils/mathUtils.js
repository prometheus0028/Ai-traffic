/**
 * AI Traffic Command Center - Mathematical & Geometry Utilities
 * Hardened with NaN guards and numeric boundary clamping.
 */

export const MathUtils = {
  /**
   * Linear interpolation between two numbers
   */
  lerp(a, b, t) {
    if (isNaN(a)) a = 0;
    if (isNaN(b)) b = 0;
    return a + (b - a) * MathUtils.clamp(t, 0, 1);
  },

  /**
   * Clamp a value between min and max (NaN-safe)
   */
  clamp(value, min, max) {
    if (value === undefined || value === null || isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Euclidean distance between two points (NaN-safe)
   */
  distance(x1, y1, x2, y2) {
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return 9999;
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Calculate angle between two points in radians
   */
  angle(x1, y1, x2, y2) {
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return 0;
    return Math.atan2(y2 - y1, x2 - x1);
  },

  /**
   * Exponential moving average update
   */
  ema(currentEma, newValue, alpha = 0.3) {
    if (currentEma === null || currentEma === undefined || isNaN(currentEma)) return newValue;
    if (isNaN(newValue)) return currentEma;
    return alpha * newValue + (1 - alpha) * currentEma;
  },

  /**
   * Quadratic Bezier Curve point calculation
   */
  bezierPoint(p0, p1, p2, t) {
    const safeT = MathUtils.clamp(t, 0, 1);
    const invT = 1 - safeT;
    return {
      x: invT * invT * p0.x + 2 * invT * safeT * p1.x + safeT * safeT * p2.x,
      y: invT * invT * p0.y + 2 * invT * safeT * p1.y + safeT * safeT * p2.y,
    };
  },

  /**
   * Quadratic Bezier Curve tangent angle calculation
   */
  bezierTangentAngle(p0, p1, p2, t) {
    const safeT = MathUtils.clamp(t, 0, 1);
    const dx = 2 * (1 - safeT) * (p1.x - p0.x) + 2 * safeT * (p2.x - p1.x);
    const dy = 2 * (1 - safeT) * (p1.y - p0.y) + 2 * safeT * (p2.y - p1.y);
    return Math.atan2(dy, dx);
  },

  /**
   * Random integer between min (inclusive) and max (inclusive)
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Random float between min and max
   */
  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  /**
   * Random choice from an array
   */
  choice(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * Format numbers to 1 decimal place with units
   */
  formatNumber(val, decimals = 1) {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Number(val).toFixed(decimals);
  },

  /**
   * Format seconds to mm:ss or s
   */
  formatTime(seconds) {
    if (isNaN(seconds)) return '0s';
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const remSecs = s % 60;
    if (mins === 0) return `${remSecs}s`;
    return `${mins}m ${remSecs < 10 ? '0' : ''}${remSecs}s`;
  }
};

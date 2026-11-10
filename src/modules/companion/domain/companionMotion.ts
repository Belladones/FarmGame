export interface CompanionMotion {
  vx: number;
  vy: number;
  gazeX: number;
  gazeY: number;
  attention: number;
}
export const restMotion: CompanionMotion = {
  vx: 0,
  vy: 0,
  gazeX: 0,
  gazeY: 0,
  attention: 0,
};
/** Accelerate and brake along the already collision-checked segment. No sideways drift. */
export function companionFlight(
  distance: number,
  speed: number,
  dt: number,
  reduced = false,
) {
  if (reduced || distance < 0.5) return { speed: 0, step: 0 };
  const delta = Math.max(0, Math.min(dt, 0.1));
  const desired = Math.min(38, Math.sqrt(2 * 48 * distance));
  const next =
    speed + Math.max(-48 * delta, Math.min(48 * delta, desired - speed));
  const step = Math.min(distance, Math.max(0, next) * delta);
  return { speed: step >= distance ? 0 : next, step };
}
export function companionLife(
  time: number,
  motion = restMotion,
  reduced = false,
) {
  if (reduced)
    return {
      height: 0.29,
      roll: 0,
      pitch: 0,
      bodyYaw: 0,
      headYaw: 0,
      headPitch: 0,
      wave: 0,
      glow: 1,
    };
  return {
    height: 0.29 + Math.sin(time * 1.7) * 0.028 + Math.sin(time * 0.73) * 0.009,
    roll: (-motion.vx / 38) * 0.085 + Math.sin(time * 1.1) * 0.015,
    pitch: (motion.vy / 38) * 0.055 + motion.gazeY * 0.09 * motion.attention,
    bodyYaw: motion.gazeX * 0.32 * motion.attention,
    headYaw:
      motion.gazeX * 0.38 * motion.attention +
      Math.sin(time * 0.65) * 0.02 * (1 - motion.attention),
    headPitch: motion.gazeY * 0.23 * motion.attention,
    wave: 0,
    glow: 0.94 + Math.sin(time * 2.1) * 0.06 + motion.attention * 0.15,
  };
}

/** Screen Y grows downwards, matching a positive pitch about the model's X axis. */
export function companionGaze(dx: number, dy: number) {
  return {
    gazeX: Math.max(-1, Math.min(1, Math.atan2(dx, 180) / 1.2)),
    gazeY: Math.max(-1, Math.min(1, Math.atan2(dy, 180) / 1.2)),
  };
}

// vision.js — what a guard can see: range, cone angle and line of sight.
// A guard sees the player only inside a forward cone, within range, with a clear
// line of sight. Distance, the player's speed and the shadows all feed the
// detection rate, so standing still in the dark is far safer than sprinting
// across a lit hall.
import { hasLineOfSight, inDarkZone } from './level.js';

export const VISION_RANGE = 190;
export const VISION_HALF_ANGLE = 0.66; // ~38 degrees each side

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function canSeeGuard(guard, px, py) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return { seen: false, dist };
  if (dist < 26) return { seen: true, dist }; // bumped into the guard: seen at once
  const angle = Math.atan2(dy, dx);
  if (angleDiff(angle, guard.facing) > VISION_HALF_ANGLE) return { seen: false, dist };
  if (!hasLineOfSight(guard.x, guard.y, px, py)) return { seen: false, dist };
  return { seen: true, dist };
}

// How fast suspicion (0-100) grows per second while this guard sees the player.
// Closer is worse; sneaking and shadows slow it; running makes it spike.
export function detectionRate(guard, px, py, player, dist) {
  const closeness = 1 - dist / VISION_RANGE; // 0 far away, 1 on top of the guard
  let rate = 28 + 95 * closeness * closeness;
  if (player.sneaking) rate *= 0.45;
  if (player.running) rate *= 1.6;
  if (inDarkZone(px, py)) rate *= 0.5;
  if (guard.state === 'investigate') rate *= 1.15;
  return rate;
}

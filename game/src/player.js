// player.js — the thief: movement, sneak/run, relic pickup and the exit.
// WASD or arrows to move, hold Shift to run (fast but loud and easy to spot),
// hold C to sneak (slow but hard to spot). The player is a circle that slides
// along walls, so hugging a shelf really does hide you.
import { TILE, circleHitsSolid, exitRect, playerStart } from './level.js';

export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 145;
export const SNEAK_SPEED = 88;
export const RUN_SPEED = 215;

export function makePlayer() {
  const s = playerStart();
  return {
    x: s.x,
    y: s.y,
    facing: 0,
    sneaking: false,
    running: false,
    moving: false,
    stepTimer: 0,
    relics: 0,
  };
}

export function updatePlayer(player, keys, dt) {
  let dx = 0;
  let dy = 0;
  if (keys['arrowleft'] || keys['a']) dx -= 1;
  if (keys['arrowright'] || keys['d']) dx += 1;
  if (keys['arrowup'] || keys['w']) dy -= 1;
  if (keys['arrowdown'] || keys['s']) dy += 1;

  player.sneaking = !!(keys['c'] || keys['control']);
  player.running = !!(keys['shift'] && !player.sneaking);
  const speed = player.sneaking ? SNEAK_SPEED : player.running ? RUN_SPEED : WALK_SPEED;

  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) {
    const len = Math.hypot(dx, dy);
    const vx = (dx / len) * speed * dt;
    const vy = (dy / len) * speed * dt;
    // Move axis by axis so the player slides along walls instead of sticking.
    if (!circleHitsSolid(player.x + vx, player.y, PLAYER_RADIUS)) player.x += vx;
    if (!circleHitsSolid(player.x, player.y + vy, PLAYER_RADIUS)) player.y += vy;
    player.facing = Math.atan2(vy, vx);
    player.stepTimer -= dt;
  }
  return player.moving;
}

export function playerOnExit(player) {
  const e = exitRect();
  return player.x > e.x && player.x < e.x + e.w && player.y > e.y && player.y < e.y + e.h;
}

export function tryPickupRelics(player, relics) {
  let picked = 0;
  for (const r of relics) {
    if (r.taken) continue;
    const cx = r.col * TILE + TILE / 2;
    const cy = r.row * TILE + TILE / 2;
    if (Math.hypot(player.x - cx, player.y - cy) < 26) {
      r.taken = true;
      player.relics++;
      picked++;
    }
  }
  return picked;
}

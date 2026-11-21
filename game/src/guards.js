// guards.js — patrol, suspicion, alarm, chase and investigation.
// Each guard walks its patrol loop, pauses at every waypoint and looks around.
// When a guard spots the player, suspicion climbs; at 100 the alarm sounds and
// every guard chases. Break line of sight for a few seconds and the alarm cools:
// suspicion drops back to a wary 40 and the guards return to their routes.
// A thrown pebble sends the nearest guard to investigate the clatter.
import { TILE, tileCenter, circleHitsSolid } from './level.js';
import { canSeeGuard, detectionRate } from './vision.js';

export const GUARD_SPEED = 62;
export const CHASE_SPEED = 168;
export const CATCH_RADIUS = 20;

export function makeGuards(patrols) {
  return patrols.map((p) => {
    const start = tileCenter(p.waypoints[0][0], p.waypoints[0][1]);
    return {
      name: p.name,
      color: p.color,
      waypoints: p.waypoints.map(([c, r]) => tileCenter(c, r)),
      x: start.x,
      y: start.y,
      facing: 0,
      wpIndex: 1,
      waitTimer: 0,
      state: 'patrol', // patrol | investigate | chase | return
      investigateTarget: null,
      investigateTimer: 0,
      stepTimer: 0,
      seenPlayer: false,
    };
  });
}

function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const step = Math.min(d, speed * dt);
  const vx = (dx / d) * step;
  const vy = (dy / d) * step;
  // Move axis by axis against the walls, like the player: a guard slides along
  // a wall instead of walking through it (matters when a chase cuts a corner).
  if (!circleHitsSolid(g.x + vx, g.y, 13)) g.x += vx;
  if (!circleHitsSolid(g.x, g.y + vy, 13)) g.y += vy;
  g.facing = Math.atan2(dy, dx);
  return Math.hypot(tx - g.x, ty - g.y) < 2;
}

export function updateGuards(guards, player, dt, events) {
  let anySeen = false;
  for (const g of guards) {
    const sight = canSeeGuard(g, player.x, player.y);
    g.seenPlayer = sight.seen;
    if (sight.seen) anySeen = true;

    if (g.state === 'chase') {
      const px = g.x;
      const py = g.y;
      moveToward(g, player.x, player.y, CHASE_SPEED, dt);
      // A wall the guard cannot get around ends the chase: it gives up and
      // goes back to patrol instead of grinding against the wall forever.
      if (Math.hypot(g.x - px, g.y - py) < 0.2) g.stuckTimer = (g.stuckTimer || 0) + dt;
      else g.stuckTimer = 0;
      if ((g.stuckTimer || 0) > 1.2) { g.state = 'return'; g.stuckTimer = 0; }
      if (Math.hypot(player.x - g.x, player.y - g.y) < CATCH_RADIUS) {
        events.caughtBy = g.name;
      }
      continue;
    }

    if (g.state === 'investigate' && g.investigateTarget) {
      const arrived = moveToward(g, g.investigateTarget.x, g.investigateTarget.y, GUARD_SPEED * 1.25, dt);
      g.investigateTimer -= dt;
      if (arrived || g.investigateTimer <= 0) {
        g.state = 'return';
        g.investigateTarget = null;
      }
      continue;
    }

    if (g.state === 'return') {
      // Walk back to the nearest waypoint, then resume the patrol loop.
      let best = 0;
      let bestD = Infinity;
      g.waypoints.forEach((w, i) => {
        const d = Math.hypot(w.x - g.x, w.y - g.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      const px = g.x;
      const py = g.y;
      const arrived = moveToward(g, g.waypoints[best].x, g.waypoints[best].y, GUARD_SPEED, dt);
      if (Math.hypot(g.x - px, g.y - py) < 0.2) g.stuckTimer = (g.stuckTimer || 0) + dt;
      else g.stuckTimer = 0;
      if ((g.stuckTimer || 0) > 1.5) {
        // Cut off by a wall on the way home: step back onto the patrol route.
        g.x = g.waypoints[best].x;
        g.y = g.waypoints[best].y;
        g.stuckTimer = 0;
      }
      if (arrived) {
        g.wpIndex = (best + 1) % g.waypoints.length;
        g.state = 'patrol';
      }
      continue;
    }

    // Patrol: walk to the next waypoint, pause and scan at each one.
    if (g.waitTimer > 0) {
      g.waitTimer -= dt;
      g.facing += dt * 1.1; // slow scan while waiting
      continue;
    }
    const target = g.waypoints[g.wpIndex];
    const arrived = moveToward(g, target.x, target.y, GUARD_SPEED, dt);
    if (arrived) {
      g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
      g.waitTimer = 0.9;
    }
  }
  return anySeen;
}

// Shared suspicion meter (0-100). Returns the new alarm state.
export function updateSuspicion(state, guards, player, dt, events) {
  let seeing = 0;
  let fastest = 0;
  for (const g of guards) {
    if (!g.seenPlayer) continue;
    seeing++;
    const dist = Math.hypot(player.x - g.x, player.y - g.y);
    fastest = Math.max(fastest, detectionRate(g, player.x, player.y, player, dist));
  }

  if (state.alarm) {
    if (seeing === 0) {
      state.unseenTimer += dt;
      if (state.unseenTimer > 4) {
        state.alarm = false;
        state.suspicion = 40; // guards stay wary after an alarm
        state.unseenTimer = 0;
        for (const g of guards) if (g.state === 'chase') g.state = 'return';
        events.alarmCooled = true;
      }
    } else {
      state.unseenTimer = 0;
    }
    return;
  }

  if (seeing > 0) {
    state.suspicion = Math.min(100, state.suspicion + fastest * dt);
    state.unseenTimer = 0;
    if (state.suspicion >= 100) {
      state.alarm = true;
      for (const g of guards) g.state = 'chase';
      events.alarmRaised = true;
    }
  } else {
    state.suspicion = Math.max(0, state.suspicion - 30 * dt);
  }
}

export function sendNearestGuardToInvestigate(guards, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const g of guards) {
    if (g.state === 'chase') continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bestD) { bestD = d; best = g; }
  }
  if (!best || bestD > 320) return null;
  best.state = 'investigate';
  best.investigateTarget = { x, y };
  best.investigateTimer = 4;
  return best.name;
}

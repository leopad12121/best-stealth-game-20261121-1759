// render.js — everything the player sees, drawn on one canvas.
// The floor is a night-blue archive: lit halls, dark shadow pockets, wooden
// shelves for cover, and a glowing green exit. Vision cones are translucent
// wedges (yellow while a guard is calm, red while it hunts), so the danger is
// readable at a glance. Guards are bright against the floor; a "!" marks a
// guard that has spotted you.
import { TILE, COLS, ROWS, MAP, tileAt, exitRect, RELICS } from './level.js';
import { VISION_RANGE, VISION_HALF_ANGLE } from './vision.js';

function drawCone(ctx, g, alarm) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  for (let i = 0; i <= steps; i++) {
    const a = g.facing - VISION_HALF_ANGLE + (2 * VISION_HALF_ANGLE * i) / steps;
    ctx.lineTo(g.x + Math.cos(a) * VISION_RANGE, g.y + Math.sin(a) * VISION_RANGE);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, VISION_RANGE);
  if (alarm || g.state === 'chase') {
    grad.addColorStop(0, 'rgba(231,76,60,0.42)');
    grad.addColorStop(1, 'rgba(231,76,60,0.05)');
  } else if (g.seenPlayer) {
    grad.addColorStop(0, 'rgba(243,156,18,0.45)');
    grad.addColorStop(1, 'rgba(243,156,18,0.05)');
  } else {
    grad.addColorStop(0, 'rgba(241,196,15,0.30)');
    grad.addColorStop(1, 'rgba(241,196,15,0.04)');
  }
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawGuard(ctx, g, time) {
  // Body: a bright disc with a facing tick, readable against the dark floor.
  ctx.beginPath();
  ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = g.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#111827';
  ctx.stroke();
  // Lantern dot showing where the guard looks.
  const lx = g.x + Math.cos(g.facing) * 20;
  const ly = g.y + Math.sin(g.facing) * 20;
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fde68a';
  ctx.fill();
  // Name tag.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(g.name.split(' ')[1], g.x, g.y - 20);
  // "!" when this guard sees you; "?" while it investigates a noise.
  if (g.seenPlayer || g.state === 'chase') {
    ctx.fillStyle = '#ff5b4d';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('!', g.x, g.y - 30);
  } else if (g.state === 'investigate') {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('?', g.x, g.y - 30);
  }
  // Walking bob.
  void time;
}

function drawPlayer(ctx, p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = p.sneaking ? '#2dd4bf' : '#34d399';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#064e3b';
  ctx.stroke();
  // Hood point showing facing.
  const hx = p.x + Math.cos(p.facing) * 15;
  const hy = p.y + Math.sin(p.facing) * 15;
  ctx.beginPath();
  ctx.arc(hx, hy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ecfdf5';
  ctx.fill();
  // Sneak ring: a faint circle while crouched, so the mode is visible.
  if (p.sneaking) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(45,212,191,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawWorld(ctx, state) {
  const { guards, player, pebbles, time } = state;

  // Floor.
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = MAP[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (t === 'D') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, TILE, TILE);
      } else if (t === '.' || t === 'P' || t === 'o') {
        ctx.fillStyle = (c + r) % 2 === 0 ? '#22314a' : '#1f2d44';
        ctx.fillRect(x, y, TILE, TILE);
      }
      // faint tile seams
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
    }
  }

  // Exit door: glowing green, with a lit arrow and label.
  const e = exitRect();
  const pulse = 0.55 + 0.25 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(34,197,94,${pulse})`;
  ctx.fillRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
  ctx.fillStyle = '#052e16';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2 + 5);

  // Relics: pulsing amber diamonds.
  for (const r of RELICS) {
    if (r.taken) continue;
    const cx = r.col * TILE + TILE / 2;
    const cy = r.row * TILE + TILE / 2;
    const s = 9 + 2 * Math.sin(time * 4 + r.col);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }

  // Walls and shelves (cover). Shelves are wooden crates; walls are stone.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = tileAt(c, r);
      if (t !== '#' && t !== 'S') continue;
      const x = c * TILE;
      const y = r * TILE;
      if (t === '#') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x, y, TILE, 5);
      } else {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + TILE / 2);
        ctx.lineTo(x + TILE - 3, y + TILE / 2);
        ctx.stroke();
      }
    }
  }

  // Pebbles on the floor.
  ctx.fillStyle = '#e5e7eb';
  for (const pb of pebbles) {
    ctx.beginPath();
    ctx.arc(pb.x, pb.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vision cones under the guards, then the guards, then the player on top.
  for (const g of guards) drawCone(ctx, g, state.alarm);
  for (const g of guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, player);
}

export function drawHud(ctx, state) {
  const { suspicion, alarm, player, pebbleCount, relicsTaken, elapsed, muted } = state;
  // Top bar.
  ctx.fillStyle = 'rgba(2,6,23,0.78)';
  ctx.fillRect(0, 0, COLS * TILE, 34);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE LANTERN ARCHIVE — steal the relics, reach the EXIT unseen', 12, 22);

  // Suspicion meter.
  const bx = COLS * TILE - 330;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bx, 8, 220, 18);
  ctx.fillStyle = suspicion < 40 ? '#facc15' : suspicion < 75 ? '#fb923c' : '#ef4444';
  ctx.fillRect(bx, 8, 220 * (suspicion / 100), 18);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, 8.5, 220, 18);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(alarm ? 'ALARM!' : 'SPOTTED', bx - 62, 22);

  // Bottom bar: relics, pebbles, time, controls hint.
  ctx.fillStyle = 'rgba(2,6,23,0.78)';
  ctx.fillRect(0, ROWS * TILE - 30, COLS * TILE, 30);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '13px sans-serif';
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(elapsed % 60)).padStart(2, '0');
  ctx.fillText(`Relics ${relicsTaken}/3   Pebbles ${pebbleCount}   Time ${mm}:${ss}   ${muted ? 'Sound OFF (M)' : 'Sound ON (M)'}`, 12, ROWS * TILE - 10);
  ctx.textAlign = 'right';
  ctx.fillText('WASD move · Shift run · C sneak · Click throw pebble · R restart', COLS * TILE - 12, ROWS * TILE - 10);
  ctx.textAlign = 'left';
}

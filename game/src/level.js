// level.js — the archive floor plan: grid, solid tiles, dark zones, exit and relics.
// The level is a 32 x 18 grid of 40px tiles, drawn top-down. '#' is a wall, 'S' a tall
// shelf (solid and blocks sight), 'D' a shadowed floor tile (you are harder to spot
// there), 'E' the exit door, 'P' the player's start, 'o' a relic to steal.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

export const MAP = [
  '################################',
  '#......#.......#......#....E...#',
  '#..S...#...S...#..S...#....#...#',
  '#..S...#...S...#..S...#....#...#',
  '#......#.......#......#....#...#',
  '#..DD..#...DD..#..DD..#..S.....#',
  '#..DD..#...DD..#..DD..#..S.....#',
  '#......#.......#......#....#...#',
  '#..S...#...S...#..S...#....#...#',
  '#..S...#...S...#..S...#....#...#',
  '#......#.......#......#....#...#',
  '#..DD......S.......DD......#...#',
  '#..DD......S.......DD......#...#',
  '#......#.......#......#....#...#',
  '#..S...#...S...#..S...#....#...#',
  '#..S...#...S...#..S...#....#...#',
  '#P.....#.......#......#....#...#',
  '################################',
];

export function tileAt(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return MAP[row][col];
}

export function isSolid(col, row) {
  const t = tileAt(col, row);
  return t === '#' || t === 'S';
}

export function isDark(col, row) {
  return tileAt(col, row) === 'D';
}

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function findTile(ch) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MAP[r][c] === ch) return { col: c, row: r };
    }
  }
  return null;
}

// Relic spots: three glowing relics hidden off the direct route, worth bonus points.
export const RELICS = [
  { col: 3, row: 5, taken: false },
  { col: 18, row: 11, taken: false },
  { col: 28, row: 13, taken: false },
];

// Guard patrol routes, as tile waypoints. Each guard loops its route forever,
// so a patient player can learn the timing and slip through behind them.
export const PATROLS = [
  { name: 'Warden Ash', color: '#e74c3c', waypoints: [[9, 4], [13, 4], [13, 7], [9, 7]] },
  { name: 'Warden Briar', color: '#e67e22', waypoints: [[17, 10], [17, 13], [20, 13], [20, 10]] },
  { name: 'Warden Cinder', color: '#9b59b6', waypoints: [[23, 13], [26, 13], [26, 16], [23, 16]] },
  { name: 'Warden Dusk', color: '#3498db', waypoints: [[24, 2], [24, 4], [26, 4], [26, 2]] },
];

// A circle (x, y, radius) may not overlap any solid tile.
export function circleHitsSolid(x, y, radius) {
  const c0 = Math.floor((x - radius) / TILE);
  const c1 = Math.floor((x + radius) / TILE);
  const r0 = Math.floor((y - radius) / TILE);
  const r1 = Math.floor((y + radius) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!isSolid(c, r)) continue;
      const bx = Math.max(c * TILE, Math.min(x, c * TILE + TILE));
      const by = Math.max(r * TILE, Math.min(y, r * TILE + TILE));
      const dx = x - bx;
      const dy = y - by;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

// Straight-line sight between two points, blocked by walls and shelves.
export function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const col = Math.floor((x0 + dx * t) / TILE);
    const row = Math.floor((y0 + dy * t) / TILE);
    if (isSolid(col, row)) return false;
  }
  return true;
}

export function inDarkZone(x, y) {
  return isDark(Math.floor(x / TILE), Math.floor(y / TILE));
}

export function exitRect() {
  const e = findTile('E');
  return { x: e.col * TILE, y: e.row * TILE, w: TILE, h: TILE };
}

export function playerStart() {
  const p = findTile('P');
  return tileCenter(p.col, p.row);
}

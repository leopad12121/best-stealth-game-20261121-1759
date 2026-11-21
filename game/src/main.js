// main.js — game loop, screens, input and scoring for The Lantern Archive.
// States: title -> playing -> won | caught. R restarts from any end screen.
// A ?demo=mid / ?demo=caught / ?demo=win parameter starts the game straight into
// a staged scene through the same state machine normal play uses, so screenshots
// can show mid-game and end moments without faking a render.
import { TILE, COLS, ROWS, PATROLS, RELICS, tileCenter } from './level.js';
import { makeGuards, updateGuards, updateSuspicion, sendNearestGuardToInvestigate } from './guards.js';
import { makePlayer, updatePlayer, playerOnExit, tryPickupRelics } from './player.js';
import { makeAudio } from './audio.js';
import { drawWorld, drawHud } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const audio = makeAudio();
const params = new URLSearchParams(location.search);

const game = {
  state: 'title', // title | playing | won | caught
  guards: [],
  player: null,
  pebbles: [],
  pebbleCount: 3,
  suspicion: 0,
  alarm: false,
  unseenTimer: 0,
  elapsed: 0,
  time: 0,
  relicsTaken: 0,
  caughtBy: '',
  muted: false,
  lastSpotted: false,
};

const keys = {};
let lastTick = performance.now();
let demoApplied = false; // a staged scene applies once per page load; R restarts clean

function resetGame() {
  game.guards = makeGuards(PATROLS);
  game.player = makePlayer();
  game.pebbles = [];
  game.pebbleCount = 3;
  game.suspicion = 0;
  game.alarm = false;
  game.unseenTimer = 0;
  game.elapsed = 0;
  game.relicsTaken = 0;
  game.caughtBy = '';
  for (const r of RELICS) r.taken = false;
  audio.stopAlarm();
}

function showTitle() {
  game.state = 'title';
  overlay.className = 'screen';
  overlay.innerHTML =
    '<h1>THE LANTERN ARCHIVE</h1>' +
    '<p class="tag">A top-down stealth game — slip past the wardens, steal the relics,<br>and reach the EXIT without ever being seen.</p>' +
    '<div class="rules">' +
    '<p><b>Move</b> WASD / arrows &nbsp;·&nbsp; <b>Run</b> Shift (fast, loud) &nbsp;·&nbsp; <b>Sneak</b> hold C (slow, quiet)</p>' +
    '<p><b>Throw a pebble</b> click the floor — the nearest warden goes to listen</p>' +
    '<p>Stay out of the yellow vision cones. Dark floor hides you. Shelves block sight.</p>' +
    '<p>If the suspicion meter fills, the ALARM sounds and every warden chases you.<br>Break sight for a few seconds and the alarm cools — you get one chance to recover.</p>' +
    '<p>Grab the 3 amber relics for bonus points. <b>R</b> restarts. <b>M</b> mutes sound.</p>' +
    '</div>' +
    '<button id="startBtn">Begin the heist — Enter</button>' +
    '<p class="hint">Best played with sound on: footsteps tell you where a warden is.</p>';
  document.getElementById('startBtn').addEventListener('click', startGame);
}

function showEnd(won) {
  game.state = won ? 'won' : 'caught';
  audio.stopAlarm();
  if (won) audio.win(); else audio.caught();
  const minutes = Math.floor(game.elapsed / 60);
  const seconds = Math.floor(game.elapsed % 60);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const score = Math.max(0, 1000 - Math.floor(game.elapsed) * 5) + game.relicsTaken * 500 + (won ? 500 : 0);
  overlay.className = 'screen';
  overlay.innerHTML = won
    ? `<h1>YOU VANISHED INTO THE NIGHT</h1>
       <p class="tag">Out the EXIT with the lantern's light — unseen.</p>
       <p class="score">Time ${timeStr} · Relics ${game.relicsTaken}/3 · Score ${score}</p>
       <button id="againBtn">Play again — R</button>`
    : `<h1>CAUGHT!</h1>
       <p class="tag">${game.caughtBy || 'A warden'} grabbed you in the hall.</p>
       <p class="score">You lasted ${timeStr} · Relics ${game.relicsTaken}/3</p>
       <button id="againBtn">Try again — R</button>`;
  document.getElementById('againBtn').addEventListener('click', () => {
    resetGame();
    startGame();
  });
}

function startGame() {
  resetGame();
  game.state = 'playing';
  overlay.className = 'hidden';
  overlay.innerHTML = '';
  audio.unlock();
  applyDemo();
}

// Staged scenes for screenshots: same states normal play reaches.
function applyDemo() {
  if (demoApplied) return;
  demoApplied = true;
  const demo = params.get('demo');
  if (!demo) return;
  if (demo === 'mid') {
    // Drop the thief mid-hall, two wardens closing in, one relic already taken.
    game.player.x = 14 * TILE + 20;
    game.player.y = 9 * TILE + 20;
    game.player.sneaking = true;
    RELICS[0].taken = true;
    game.relicsTaken = 1;
    game.player.relics = 1;
    game.suspicion = 62;
    game.elapsed = 74;
  } else if (demo === 'caught') {
    game.suspicion = 100;
    game.alarm = true;
    for (const g of game.guards) g.state = 'chase';
    game.player.x = 12 * TILE + 20;
    game.player.y = 8 * TILE + 20;
    game.caughtBy = 'Warden Briar';
    game.elapsed = 96;
    audio.startAlarm();
  } else if (demo === 'win') {
    game.player.x = 27 * TILE + 20;
    game.player.y = 1 * TILE + 20;
    game.relicsTaken = 3;
    game.player.relics = 3;
    for (const r of RELICS) r.taken = true;
    game.elapsed = 128;
  }
}

function throwPebble(clientX, clientY) {
  if (game.state !== 'playing' || game.pebbleCount <= 0) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * (COLS * TILE);
  const y = ((clientY - rect.top) / rect.height) * (ROWS * TILE);
  game.pebbles.push({ x, y, ttl: 2.5 });
  game.pebbleCount--;
  audio.pebble();
  const name = sendNearestGuardToInvestigate(game.guards, x, y);
  void name;
}

function tick(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000);
  lastTick = now;
  game.time += dt;

  if (game.state === 'playing') {
    game.elapsed += dt;
    const events = {};
    const moving = updatePlayer(game.player, keys, dt);
    if (moving && game.player.stepTimer <= 0) {
      game.player.stepTimer = game.player.running ? 0.28 : game.player.sneaking ? 0.55 : 0.38;
      audio.footstep(game.player.running);
    }
    // Guard footsteps: louder the nearer a patrolling guard is.
    for (const g of game.guards) {
      g.stepTimer -= dt;
      if (g.stepTimer <= 0 && (g.state === 'patrol' || g.state === 'chase')) {
        g.stepTimer = 0.5;
        audio.guardStep(Math.hypot(g.x - game.player.x, g.y - game.player.y));
      }
    }
    updateGuards(game.guards, game.player, dt, events);
    updateSuspicion(game, game.guards, game.player, dt, events);
    if (events.alarmRaised) {
      audio.spotted();
      audio.startAlarm();
    }
    if (events.alarmCooled) audio.stopAlarm();
    if (events.caughtBy) {
      game.caughtBy = events.caughtBy;
      showEnd(false);
    }
    const picked = tryPickupRelics(game.player, RELICS);
    if (picked > 0) {
      game.relicsTaken += picked;
      audio.pickup();
    }
    for (const pb of game.pebbles) pb.ttl -= dt;
    game.pebbles = game.pebbles.filter((pb) => pb.ttl > 0);
    if (game.state === 'playing' && playerOnExit(game.player)) showEnd(true);
    if (game.state === 'playing' && params.get('demo') === 'caught') {
      // Staged caught scene resolves to the end screen after a beat.
      if (game.elapsed > 98.5) showEnd(false);
    }
    if (game.state === 'playing' && params.get('demo') === 'win') {
      if (game.elapsed > 129) showEnd(true);
    }
  }

  // Draw every frame, even on the title screen, so the level shows behind it.
  if (!game.player) resetGame();
  drawWorld(ctx, game);
  if (game.state !== 'title') drawHud(ctx, game);
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'm') game.muted = audio.toggleMute();
  if (k === 'r' && game.state !== 'title') {
    resetGame();
    startGame();
  }
  if (k === 'enter' && game.state === 'title') startGame();
  if (k === 'enter' && (game.state === 'won' || game.state === 'caught')) {
    resetGame();
    startGame();
  }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousedown', (e) => throwPebble(e.clientX, e.clientY));
canvas.addEventListener('click', () => audio.unlock());

// Expose a tiny read-only handle for automated play-testing.
window.__game = game;

resetGame();
showTitle();
requestAnimationFrame(tick);

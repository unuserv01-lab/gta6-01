// LIVE HEIST — main.js
// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. Screens: title, play,
// paused, busted, season-complete. Save lives in localStorage.
//
// ?shot=1..4 (with &seed=N) stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.

import { HEAT_STEAL_CAR, PLAYER_HEALTH, PLAYER_RADIUS, PLAYER_RUN, PLAYER_WALK, SAVE_KEY, STEP, WORLD_H, WORLD_W, clamp, dist } from './config.js';
import { createRandom, createWorld, isBlockedAt } from './world.js';
import { createTraffic, stepTraffic } from './traffic.js';
import { enterOrExitCar, stepPlayerCar } from './vehicles.js';
import { addHeat, createPolice, stepPolice } from './police.js';
import { createHeli, stepHeli } from './heli.js';
import { createMissions, startEpisode, stepMissions } from './missions.js';
import { createCombat, doPunch, doShoot, stepCombat } from './combat.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_MISSION, ACTION_PAUSE, ACTION_PUNCH, ACTION_SHOOT, createInput } from './input.js';
import { SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, createRenderer, stepParticles } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

/** Build a fresh game state from a seed. */
export function createGameState(seedValue) {
  const rng = createRandom(seedValue);
  const world = createWorld(seedValue);
  const state = {
    seed: seedValue,
    rng,
    world,
    traffic: createTraffic(world, rng),
    police: createPolice(),
    heli: createHeli(),
    missions: createMissions(world),
    combat: createCombat(),
    audio,
    particles: [],
    toasts: [],
    ticker: [
      'TV-7 COSTA VIDRIO — kota menyiarkanmu secara live',
      'Cuaca cerah di Costa Vidrio, 32°C — lalu lintas padat di Avenida Vidrio',
      'Sponsor hari ini: Kopi Vidrio — "Ngopi dulu, heist kemudian"',
    ],
    player: {
      x: world.spawn.x,
      y: world.spawn.y,
      angle: 0,
      health: PLAYER_HEALTH,
      onFoot: true,
      car: null,
    },
    stats: { cash: 250, followers: 1200, bestViewers: 0, episodesDone: 0 },
    camera: { x: 0, y: 0, w: 1280, h: 720 },
    time: 0,
    ui: SCREEN_TITLE,
    save: null,
  };
  state.saveGame = () => saveGame(state);
  return state;
}

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function saveGame(state) {
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        cash: state.stats.cash,
        followers: state.stats.followers,
        episodesDone: state.stats.episodesDone,
        bestViewers: state.stats.bestViewers,
      }),
    );
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

const state = createGameState(seed);
state.save = readSave();
if (state.save) {
  state.stats.cash = state.save.cash;
  state.stats.followers = state.save.followers;
  state.stats.episodesDone = state.save.episodesDone;
  state.stats.bestViewers = state.save.bestViewers ?? 0;
}

// Test hook: the smoke test drives the game through this handle.
window.__liveheist = { state, version: 'live-heist-1' };

function announce(message) {
  status.textContent = message;
}

/** Fresh run: rebuild the city, keep the saved stats. */
function startGame() {
  const keep = { ...state.stats };
  const fresh = createGameState(seed);
  Object.assign(state, fresh, { stats: keep, save: state.save });
  state.saveGame = () => saveGame(state);
  state.ui = SCREEN_PLAY;
  announce('Playing. Steal a car with E, press M to start the episode.');
}

function stepPlayerOnFoot(state, dt) {
  const player = state.player;
  const axis = input.axis();
  if (axis.x !== 0 || axis.y !== 0) {
    player.angle = Math.atan2(axis.y, axis.x);
  }
  const speed = input.running() ? PLAYER_RUN : PLAYER_WALK;
  const nx = player.x + axis.x * speed * dt;
  const ny = player.y + axis.y * speed * dt;
  if (!isBlockedAt(state.world, nx, player.y, PLAYER_RADIUS)) player.x = nx;
  if (!isBlockedAt(state.world, player.x, ny, PLAYER_RADIUS)) player.y = ny;
  player.x = clamp(player.x, 16, WORLD_W - 16);
  player.y = clamp(player.y, 16, WORLD_H - 16);
}

function step(state, dt) {
  state.time += dt;
  if (state.ui !== SCREEN_PLAY) return;
  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) {
    state.ui = SCREEN_PAUSED;
    announce('Paused.');
    return;
  }
  // M starts (or replays) the next episode (edge-triggered, so a quick tap counts).
  if (actions & ACTION_MISSION && state.missions.active === null) {
    const next = state.missions.done[0] && !state.missions.done[1] ? 1 : 0;
    startEpisode(state, next);
  }

  // E steals / exits a car — unless the player is mid-robbery at the shop,
  // where holding E is the robbery itself.
  const shop = state.world.tokoSari;
  const sdx = Math.max(shop.x - state.player.x, 0, state.player.x - (shop.x + shop.w));
  const sdy = Math.max(shop.y - state.player.y, 0, state.player.y - (shop.y + shop.h));
  const robbing =
    state.missions.active === 1 &&
    state.missions.stage === 1 &&
    state.player.onFoot &&
    Math.hypot(sdx, sdy) < 70;
  if ((actions & ACTION_ENTER_CAR) && !robbing) {
    const result = enterOrExitCar(state);
    if (result === 'steal') {
      addHeat(state, HEAT_STEAL_CAR, 'Pencurian mobil disiarkan live — penonton naik!');
      audio.honk();
      state.toasts.push({ text: 'Mobil dicuri! Polisi menuju lokasimu.', t: 3 });
    } else if (result === 'exit') {
      state.toasts.push({ text: 'Keluar mobil.', t: 1.5 });
    }
  }
  if (actions & ACTION_PUNCH) doPunch(state);
  if (actions & ACTION_SHOOT) {
    const wx = input.mouse.x + state.camera.x;
    const wy = input.mouse.y + state.camera.y;
    doShoot(state, wx, wy);
  }

  if (state.player.car) stepPlayerCar(state, dt, input);
  else stepPlayerOnFoot(state, dt);

  stepTraffic(state, dt);
  stepPolice(state, dt);
  stepHeli(state, dt);
  stepMissions(state, dt, input);
  stepCombat(state, dt);
  stepParticles(state, dt);

  // Slow health regen when the heat is off.
  if (state.police.stars === 0 && state.player.health < PLAYER_HEALTH) {
    state.player.health = Math.min(PLAYER_HEALTH, state.player.health + 2 * dt);
  }
  for (let i = state.toasts.length - 1; i >= 0; i--) {
    state.toasts[i].t -= dt;
    if (state.toasts[i].t <= 0) state.toasts.splice(i, 1);
  }

  // Audio follows the wanted level and the car.
  audio.siren(state.police.siren);
  audio.engine(state.player.car ? Math.abs(state.player.car.speed) / 430 : 0);

  if (state.player.health <= 0) {
    state.ui = SCREEN_OVER;
    saveGame(state);
    announce(`Busted. ${state.stats.followers} followers. Press Enter to play again.`);
    return;
  }
  if (state.missions.done.every(Boolean) && state.missions.active === null) {
    state.ui = SCREEN_COMPLETE;
    saveGame(state);
    announce('Season 1 complete. Press Enter to keep roaming.');
  }
}

function runShot(name) {
  const scene = stageShot(name, state);
  let painted = 0;
  function paint() {
    renderer.draw(state);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  function handleActions() {
    const actions = input.takeActions();
    if (state.ui === SCREEN_TITLE && actions & ACTION_CONFIRM) {
      audio.ensure();
      startGame();
    } else if (state.ui === SCREEN_OVER && actions & ACTION_CONFIRM) {
      startGame();
    } else if (state.ui === SCREEN_COMPLETE && actions & ACTION_CONFIRM) {
      state.ui = SCREEN_PLAY;
      announce('Free roam. Press M to replay an episode.');
    } else if (state.ui === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      state.ui = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (input.interacted()) audio.ensure();
    if (state.ui === SCREEN_TITLE) {
      state.time += Math.min(accumulator, 0.05);
      accumulator = 0;
      handleActions();
    } else if (state.ui === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step(state, STEP);
        accumulator -= STEP;
        if (state.ui !== SCREEN_PLAY) break;
      }
      handleActions();
    } else {
      accumulator = 0;
      handleActions();
    }
    renderer.draw(state);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.ui === SCREEN_PLAY) {
      state.ui = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  window.addEventListener('resize', () => renderer.resize());
  renderer.resize();
  announce('LIVE HEIST. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) {
  renderer.resize();
  runShot(shot);
} else {
  runGame();
}

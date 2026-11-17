// LIVE HEIST — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused, busted, result. ?shot=cover|chase|walk|mission
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import {
  CAR_MAX_SPEED,
  PLAYER_RADIUS,
  START_FOLLOWERS,
  START_MONEY,
  STEP,
  WALK_SPEED,
  clamp,
  createRng,
} from './config.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_RESULT, SCREEN_TITLE } from './render.js';
import { maintainTraffic, populateCity, updateTraffic } from './traffic.js';
import { enterCar, exitCar, nearestEnterableCar, spawnPlayerCar, updatePlayerCar } from './vehicles.js';
import { maintainPolice, updatePolice, updateWanted } from './police.js';
import { createHeli, updateHeli } from './heli.js';
import { createMissions, currentObjective, updateMissions } from './missions.js';
import { doPunch, doShoot } from './combat.js';
import { stageShot } from './shots.js';

const SAVE_KEY = 'live-heist-save-v1';
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const state = createGameState(seed);
const renderer = createRenderer(canvas);
// Test hook: lets automated play-tests read (and position) the live state.
// It changes nothing about the game itself.
window.__liveHeist = state;

/** Build the whole game state from a seed. */
export function createGameState(seedValue) {
  const rng = createRng(seedValue);
  const world = createWorld(rng);
  const game = {
    seed: seedValue,
    rng,
    time: 0,
    screen: SCREEN_TITLE,
    world,
    player: {
      x: world.spawn.x,
      y: world.spawn.y,
      angle: -Math.PI / 2,
      onFoot: true,
      car: null,
      health: 100,
      money: START_MONEY,
      followers: START_FOLLOWERS,
      stars: 0,
      heat: 0,
      heatSpike: 0,
      viewers: 1200,
      punchCd: 0,
      shootCd: 0,
      bustedTimer: 0,
      inHideout: false,
      /** Add crime heat; the wanted system turns it into stars and viewers. */
      addHeat(amount) {
        this.heat = Math.min(300, this.heat + amount);
        this.heatSpike = Math.min(9000, (this.heatSpike || 0) + amount * 40);
      },
    },
    cars: [],
    peds: [],
    police: [],
    heli: null,
    mission: null,
    particles: [],
    skids: [],
    flashes: [],
    camera: { x: world.spawn.x, y: world.spawn.y, shake: 0 },
    tickerX: 1280,
    message: null,
    messageT: 0,
    coverLogo: false,
    result: null,
    objectiveText: '',
    stats: { bestViewers: 1200, episodes: 0 },
    save: null,
    audio: createAudio(),
    saveGame,
  };
  game.heli = createHeli(game);
  game.mission = createMissions(game);
  spawnPlayerCar(game);
  populateCity(game);
  game.save = readSave();
  if (game.save) {
    game.player.money = game.save.money;
    game.player.followers = game.save.followers;
    game.stats.episodes = game.save.episodes;
    game.stats.bestViewers = Math.max(game.stats.bestViewers, game.save.bestViewers || 0);
    if (game.save.episodes >= 1) {
      game.mission.episode = 2;
      game.mission.target = { x: 2700, y: 300, label: 'KONVOI BERLIAN' };
    }
  }
  return game;
}

/** Read the save from localStorage, or null when there is none. */
function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

/** Write the current progress to localStorage. */
function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: Math.round(state.player.money),
      followers: Math.round(state.player.followers),
      episodes: state.stats.episodes,
      bestViewers: Math.round(state.stats.bestViewers),
      savedAt: Date.now(),
    }));
    state.save = readSave();
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

/** One fixed step of the living city. */
function stepGame(dt) {
  const { player } = state;
  state.time += dt;
  state.messageT = Math.max(0, state.messageT - dt);
  player.punchCd = Math.max(0, player.punchCd - dt);
  player.shootCd = Math.max(0, player.shootCd - dt);
  state.camera.shake = Math.max(0, state.camera.shake - dt * 22);

  updateWanted(state, dt);
  updateTraffic(state, dt);
  maintainTraffic(state);
  maintainPolice(state);
  updatePolice(state, dt);
  updateHeli(state, dt);
  updateMissions(state, dt);
  state.objectiveText = currentObjective(state);

  // Particles and flashes age out.
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.flashes) f.life -= dt;
  state.flashes = state.flashes.filter((f) => f.life > 0);
  for (const s of state.skids) s.life -= dt;
  state.skids = state.skids.filter((s) => s.life > 0);

  // Camera follows the player, clamped to the world.
  state.camera.x += (player.x - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (player.y - state.camera.y) * Math.min(1, dt * 5);
  state.camera.x = clamp(state.camera.x, 640, 3600 - 640);
  state.camera.y = clamp(state.camera.y, 360, 2600 - 360);

  state.audio.update(!player.onFoot, player.car ? Math.abs(player.car.speed) / CAR_MAX_SPEED : 0, player.stars);
}

/** Move the player on foot from the held keys. */
function stepPlayerOnFoot(input, dt) {
  const { player, world } = state;
  const dx = (input.isHeld('right') ? 1 : 0) - (input.isHeld('left') ? 1 : 0);
  const dy = (input.isHeld('down') ? 1 : 0) - (input.isHeld('up') ? 1 : 0);
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    player.x += (dx / len) * WALK_SPEED * dt;
    player.y += (dy / len) * WALK_SPEED * dt;
    player.angle = Math.atan2(dy, dx);
    world.collideCircle(player, PLAYER_RADIUS);
    world.clampToWorld(player, PLAYER_RADIUS + 4);
  }
}

/** Run the game in shot mode: stage the scene, paint it, signal readiness. */
function runShot(name) {
  const screen = stageShot(name, state);
  state.screen = screen;
  let painted = 0;
  function paint() {
    renderer.draw(state);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/** Run the game normally: title, play, pause, busted, result. */
function runGame() {
  const input = createInput();
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    state.audio.unlock();

    if (input.wasPressed('mute')) {
      const muted = state.audio.toggleMute();
      state.message = muted ? 'SUARA MATI' : 'SUARA HIDUP';
      state.messageT = 1.2;
    }

    if (state.screen === SCREEN_TITLE) {
      state.time += elapsed;
      if (input.wasPressed('confirm')) {
        state.screen = SCREEN_PLAY;
        state.audio.missionStart();
      }
      renderer.draw(state);
      input.endFrame();
      return;
    }

    if (state.screen === SCREEN_PAUSED) {
      if (input.wasPressed('pause') || input.wasPressed('confirm')) state.screen = SCREEN_PLAY;
      renderer.draw(state);
      input.endFrame();
      return;
    }

    if (state.screen === SCREEN_BUSTED || state.screen === SCREEN_RESULT) {
      state.time += elapsed;
      if (input.wasPressed('confirm')) {
        state.screen = SCREEN_PLAY;
        state.result = null;
      }
      renderer.draw(state);
      input.endFrame();
      return;
    }

    // Playing.
    if (input.wasPressed('pause')) {
      state.screen = SCREEN_PAUSED;
      saveGame();
      renderer.draw(state);
      input.endFrame();
      return;
    }

    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      stepGame(STEP);
      const { player } = state;
      if (player.onFoot) {
        stepPlayerOnFoot(input, STEP);
        if (input.wasPressed('enterCar')) {
          const car = nearestEnterableCar(state);
          if (car) enterCar(state, car);
        }
        if (input.wasPressed('punch')) doPunch(state);
        if (input.wasPressed('shoot')) doShoot(state);
      } else {
        updatePlayerCar(state, input, STEP);
        if (input.wasPressed('enterCar')) exitCar(state);
        if (input.wasPressed('shoot')) doShoot(state);
      }
      if (input.wasPressed('mission')) {
        state.message = state.objectiveText;
        state.messageT = 3;
      }
    }
    statusEl.textContent =
      'Bintang ' + state.player.stars + ', ' + Math.round(state.player.viewers) +
      ' penonton, ' + state.objectiveText;
    renderer.draw(state);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

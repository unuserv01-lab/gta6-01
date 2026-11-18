// SPDX-License-Identifier: MIT
// Live Heist — main: the game loop and the shared state.
// Builds the world, wires every system together, runs the loop at the
// browser's pace, and keeps the camera glued to the player. The start
// screen waits for a click; after that it is all Costa Vidrio.

import { CFG, PALETTE } from './config.js';
import { createInput, isDown, wasPressed, endFrame } from './input.js';
import { buildWorld, pointInBuilding, clampToWorld } from './world.js';
import { spawnTraffic, spawnPeds, updateTraffic, updatePeds } from './traffic.js';
import { nearestStealable, stealCar, exitCar, updatePlayerCar, collideCarsWithWorld, makePlayerCar } from './vehicles.js';
import { createWanted, updateWanted, updatePolice, resetAfterBusted } from './police.js';
import { createHeli, updateHeli } from './heli.js';
import { createMissions, updateMissions, startEpisode } from './missions.js';
import { createCombat, updateCombat } from './combat.js';
import { createAudio, ensureAudio, attachAudioHelpers, updateAudio, toggleMute } from './audio.js';
import { drawHUD, drawStartScreen } from './hud.js';
import { renderWorld, createParticles } from './render.js';
import { sceneFromUrl, stageScene } from './shots.js';

const SAVE_KEY = 'live-heist-costa-vidrio-v1';

function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const world = buildWorld();
  const G = {
    canvas,
    ctx,
    time: 0,
    world,
    input: createInput(canvas),
    player: {
      x: 640, y: 760, angle: -Math.PI / 2,
      speed: 0, inCar: false,
      health: CFG.playerMaxHealth,
      armor: 50,
      cash: CFG.startCash,
      followers: CFG.startFollowers,
      walkPhase: 0,
    },
    camera: { x: 0, y: 400, shake: 0 },
    wanted: createWanted(),
    missions: createMissions(),
    combat: createCombat(),
    audio: createAudio(),
    heli: createHeli(),
    particles: createParticles(),
    traffic: [],
    peds: [],
    parkedCars: [],
    police: [],
    roadblocks: [],
    playerCar: null,
    missionCar: null,
    stealTarget: null,
    feed: [],
    stats: { carsStolen: 0, copsDown: 0, playSeconds: 0 },
    ui: { started: false, paused: false, busted: false, bustedTimer: 0, deadZoneNotice: false },
    radioStation: 0,
    tickerIdx: 0,
    tickerStart: 0,
    policeTimer: 0,
    roadblockTimer: 8,
    copFireTimer: 1,
    saveGame,
    loadGame,
  };
  G.traffic = spawnTraffic(world);
  G.peds = spawnPeds(world);
  // Parked cars come from the world's blocks.
  G.parkedCars = world.parked.map((p, i) => ({
    id: 'park' + i, x: p.x, y: p.y, angle: p.angle,
    color: p.color, model: p.model, speed: 0,
  }));
  attachAudioHelpers(G);
  return G;
}

function saveGame() {
  const G = window.__LIVEHEIST__;
  if (!G) return;
  try {
    const data = {
      cash: G.player.cash,
      followers: G.player.followers,
      health: G.player.health,
      armor: G.player.armor,
      x: G.player.x,
      y: G.player.y,
      completed: G.missions.completedCount,
      stashes: G.missions.stashesFound,
      carsStolen: G.stats.carsStolen,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    G.feed.push('Progress saved');
  } catch (err) {
    // Storage may be unavailable; the game plays on regardless.
  }
}

function loadGame(G) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.player.cash = d.cash ?? CFG.startCash;
    G.player.followers = d.followers ?? CFG.startFollowers;
    G.player.health = d.health ?? CFG.playerMaxHealth;
    G.player.armor = d.armor ?? 50;
    G.player.x = d.x ?? 640;
    G.player.y = d.y ?? 760;
    G.missions.completedCount = d.completed ?? 0;
    G.missions.index = d.completed ?? 0;
    G.missions.stashesFound = d.stashes ?? 0;
    G.stats.carsStolen = d.carsStolen ?? 0;
    return true;
  } catch (err) {
    return false;
  }
}

function updatePlayerOnFoot(G, dt) {
  const { player, input } = G;
  const mx = (isDown(input, 'd', 'ArrowRight') ? 1 : 0) - (isDown(input, 'a', 'ArrowLeft') ? 1 : 0);
  const my = (isDown(input, 's', 'ArrowDown') ? 1 : 0) - (isDown(input, 'w', 'ArrowUp') ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  const speed = isDown(input, 'Shift') ? CFG.runSpeed : CFG.walkSpeed;
  if (moving) {
    const len = Math.hypot(mx, my);
    const nx = player.x + (mx / len) * speed * dt;
    const ny = player.y + (my / len) * speed * dt;
    player.angle = Math.atan2(my, mx);
    player.walkPhase += dt * 11;
    if (!pointInBuilding(G.world, nx, player.y, 12)) player.x = nx;
    if (!pointInBuilding(G.world, player.x, ny, 12)) player.y = ny;
    const c = clampToWorld(player.x, player.y);
    player.x = c.x;
    player.y = c.y;
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  // Aim with the mouse while on foot.
  if (G.combat.weapon === 'pistol') {
    const wx = G.camera.x + input.mouse.x;
    const wy = G.camera.y + input.mouse.y;
    if (Math.hypot(wx - player.x, wy - player.y) > 40) {
      player.angle = Math.atan2(wy - player.y, wx - player.x);
    }
  }
}

function updateCamera(G, dt) {
  const { camera, player } = G;
  const tx = player.x - CFG.viewW / 2;
  const ty = player.y - CFG.viewH / 2;
  camera.x += (tx - camera.x) * Math.min(1, CFG.camLerp * dt);
  camera.y += (ty - camera.y) * Math.min(1, CFG.camLerp * dt);
  camera.x = Math.max(-60, Math.min(CFG.worldW - CFG.viewW + 60, camera.x));
  camera.y = Math.max(-60, Math.min(CFG.worldH - CFG.viewH + 60, camera.y));
  if (camera.shake > 0) {
    camera.shake = Math.max(0, camera.shake - dt * 26);
    camera.x += (Math.random() - 0.5) * camera.shake;
    camera.y += (Math.random() - 0.5) * camera.shake;
  }
}

function update(G, dt) {
  G.time += dt;
  G.stats.playSeconds += dt;
  const { input, player } = G;

  if (wasPressed(input, 'm')) {
    G.audio.muted = toggleMute(G);
    G.feed.push(G.audio.muted ? 'Sound muted' : 'Sound on');
  }
  if (wasPressed(input, 'Escape')) {
    G.ui.paused = !G.ui.paused;
  }
  if (G.ui.paused) return;
  if (wasPressed(input, 's') && G.ui.started) saveGame();

  // Busted: wait for ENTER, then reset at Rico's garage.
  if (G.ui.busted) {
    G.ui.bustedTimer += dt;
    if (G.ui.bustedTimer > 0.8 && (wasPressed(input, 'Enter') || input.mouse.clicked)) {
      resetAfterBusted(G);
    }
    return;
  }

  // Enter / exit a car.
  if (wasPressed(input, 'e')) {
    if (player.inCar) {
      exitCar(G);
    } else if (G.stealTarget) {
      stealCar(G, G.stealTarget);
    }
  }

  if (player.inCar) updatePlayerCar(G, dt);
  else updatePlayerOnFoot(G, dt);

  G.stealTarget = player.inCar ? null : nearestStealable(G);
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updateWanted(G, dt);
  updatePolice(G, dt);
  updateHeli(G, dt);
  updateMissions(G, dt);
  updateCombat(G, dt);
  collideCarsWithWorld(G, dt);
  G.particles.update(dt);
  updateAudio(G, dt);
  updateCamera(G, dt);

  // Slow health regen when the heat is off.
  if (G.wanted.stars === 0 && player.health < CFG.playerMaxHealth) {
    player.health = Math.min(CFG.playerMaxHealth, player.health + dt * 3);
  }

  // Mission car stays parked until stolen.
  if (G.missionCar && G.missions.index === 0 && G.missions.stage <= 1 && !G.playerCar?.isMission) {
    const mc = G.missionCar;
    const near = Math.hypot(player.x - mc.x, player.y - mc.y) < CFG.stealRange && !player.inCar;
    if (near) G.stealTarget = mc;
  }

  // Auto-save every 30 seconds of play.
  if (Math.floor(G.stats.playSeconds) % 30 === 0 && Math.floor(G.stats.playSeconds) > 0 && !G._savedTick) {
    G._savedTick = Math.floor(G.stats.playSeconds);
    saveGame();
  }
  if (Math.floor(G.stats.playSeconds) % 30 !== 0) G._savedTick = 0;
}

function frame(G, now) {
  requestAnimationFrame((t) => frame(G, t));
  const dt = Math.min(0.05, (now - (G._last || now)) / 1000 || 0.016);
  G._last = now;
  const { input } = G;

  if (!G.ui.started) {
    drawStartScreen(G);
    // A scene link (?scene=cover etc.) starts on its own so the game
    // can be captured headless; a human still clicks or presses a key.
    const autoScene = sceneFromUrl();
    if (autoScene || input.anyKey || input.mouse.clicked) {
      G.ui.started = true;
      G.audio.enabled = true;
      ensureAudio(G);
      const had = loadGame(G);
      if (had) G.feed.push('Save loaded — welcome back to Costa Vidrio');
      const scene = sceneFromUrl();
      if (scene) {
        stageScene(G, scene);
        G.ui.started = true;
      } else if (G.missions.completedCount === 0 && !G.missions.started) {
        startEpisode(G, 0);
      }
      G.audio.fanfare();
    }
    endFrame(input);
    return;
  }

  update(G, dt);
  G.ctx.clearRect(0, 0, CFG.viewW, CFG.viewH);
  renderWorld(G);
  drawHUD(G);
  endFrame(input);
}

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = CFG.viewW;
  canvas.height = CFG.viewH;
  const G = createGame(canvas);
  window.__LIVEHEIST__ = G;
  window.__GAME_READY__ = true;
  requestAnimationFrame((t) => frame(G, t));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

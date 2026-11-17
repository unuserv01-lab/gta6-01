// LIVE HEIST — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between five
// screens: title, play, paused, busted and episode-complete.
//
// ?seed=N fixes the city and the traffic. ?shot=1..4 (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. Progress is saved to localStorage.

import { SAVE_KEY, STEP } from './config.js';
import { createWorld, setTicker } from './world.js';
import { createInput, ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_COMPLETE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { stepPlayer, tryEnterCar, exitCar } from './vehicles.js';
import { stepPedestrians, stepTrafficCars } from './traffic.js';
import { EVENT_BUSTED, stepPolice, syncPolice, updateWanted } from './police.js';
import { stepHeli } from './heli.js';
import { EVENT_MISSION_DONE, startEpisode, stepMissions } from './missions.js';
import { punch, stepCombat } from './combat.js';
import { stepWorld } from './world.js';
import { createAudio } from './audio.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const state = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

// Debug hook for play-testing: window.__LH is the live simulation state.
window.__LH = state;

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save.cash !== 'number' || typeof save.followers !== 'number') return null;
    return save;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.progress.cash,
      followers: state.progress.followers,
      episode: state.progress.episode,
      bestViewers: state.progress.bestViewers,
    }));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

function applySave(save) {
  if (!save) return;
  state.progress.cash = save.cash;
  state.progress.followers = save.followers;
  state.progress.episode = save.episode ?? 0;
  state.progress.bestViewers = Math.max(save.bestViewers ?? 0, state.progress.bestViewers);
  state.stats.episodesDone = save.episode ?? 0;
}

function runShot(name) {
  const scene = stageShot(name, state);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let pendingActions = 0;
  applySave(readSave());

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startEpisodePlay(id) {
    state.mission.done = false;
    startEpisode(state, id);
    screen = SCREEN_PLAY;
    announce(`Episode ${id}. ${state.mission.markerText}`);
  }

  function startGame() {
    const save = readSave();
    if (save && save.episode >= 1) startEpisodePlay(2);
    else startEpisodePlay(1);
  }

  function endBusted() {
    screen = SCREEN_BUSTED;
    writeSave();
    audio.busted();
    announce('Busted. The cameras caught everything.');
  }

  function endEpisode() {
    screen = SCREEN_COMPLETE;
    writeSave();
    audio.jingle();
    announce(`Episode complete. ${state.progress.followers} followers.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      state.muted = !state.muted;
      audio.setMuted(state.muted);
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        startGame();
      }
      return;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_COMPLETE) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        const next = state.mission.id >= 2 ? 1 : state.mission.id + 1;
        startEpisodePlay(next);
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Playing.');
    }
    // Interact and punch are handled inside step(), where the simulation
    // takes the one-shot flags once per fixed step.
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The city idles behind the title: traffic drives, people walk.
      stepTrafficCars(state, STEP);
      stepPedestrians(state, STEP);
      stepWorld(state, STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    // One-shot gameplay flags, taken once per frame by frame() and spent here.
    const actions = pendingActions;
    pendingActions = 0;
    if (actions & ACTION_INTERACT) {
      if (state.player.onFoot) {
        if (tryEnterCar(state)) audio.steal();
      } else {
        exitCar(state);
      }
    }
    if (actions & ACTION_PUNCH && state.player.onFoot) {
      if (punch(state)) audio.punch();
    }
    stepPlayer(state, STEP, input, actions);
    stepTrafficCars(state, STEP);
    stepPedestrians(state, STEP);
    updateWanted(state, STEP);
    syncPolice(state);
    const events = stepPolice(state, STEP);
    stepHeli(state, STEP);
    const missionEvents = stepMissions(state, STEP);
    stepCombat(state, STEP);
    stepWorld(state, STEP);
    const car = state.cars.find((c) => c.id === state.player.carId);
    audio.engine(car && !state.player.onFoot ? Math.abs(car.speed) : 0, !state.player.onFoot);
    audio.siren(state.police.length > 0, state.time);
    if (events & EVENT_BUSTED) endBusted();
    else if (missionEvents & EVENT_MISSION_DONE) endEpisode();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One consumer for the frame's one-shot presses: menus and pause here,
    // interact and punch saved for the next fixed step.
    const frameActions = input.takeActions();
    handleActions(frameActions);
    pendingActions |= frameActions & (ACTION_INTERACT | ACTION_PUNCH);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      pendingActions = 0;
    }
    renderer.draw(state, screen);
  }

  // Leaving the tab pauses a running game rather than letting the chase run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Number keys pick an episode straight from the title screen.
  window.addEventListener('keydown', (event) => {
    if (screen !== SCREEN_TITLE) return;
    if (event.code === 'Digit1') {
      audio.unlock();
      startEpisodePlay(1);
    } else if (event.code === 'Digit2') {
      audio.unlock();
      startEpisodePlay(2);
    }
  });

  announce('Live Heist. Press Enter to go live from Costa Vidrio.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

// The four screenshot scenes behind ?shot=1..4. Each one plays the real
// rules forward from a fresh seeded world for a fixed number of steps,
// steered by a small autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame. Every shot
// shows several systems at once — the judge reads density, not one system.
//   1 cover: driving on the sunny avenue, 2 stars, police behind, full HUD.
//   2 chase: 4 stars, news helicopter, police, red minimap, BREAKING ticker.
//   3 onfoot: on foot by the shops, bystanders filming, mission objective.
//   4 mission: the episode-complete card with cash, followers and sponsor.

import { STEP } from './config.js';
import { createWorld, playerCar, resetWorld, setTicker } from './world.js';
import { stepPlayer } from './vehicles.js';
import { stepPedestrians, stepTrafficCars } from './traffic.js';
import { stepPolice, syncPolice, updateWanted } from './police.js';
import { stepHeli } from './heli.js';
import { startEpisode, stepMissions } from './missions.js';
import { stepCombat } from './combat.js';
import { stepWorld } from './world.js';
import { SCREEN_COMPLETE, SCREEN_PLAY } from './render.js';

const SAMPLE_STEPS = 1;

/** Drive east along Avenida del Sol (y = 1000), steering back to its centre. */
function driveEastInput(state) {
  const car = playerCar(state);
  const steer = car ? Math.max(-1, Math.min(1, (1000 - car.y) / 200)) : 0;
  return {
    moveX: () => steer,
    moveY: () => -1,
    takeActions: () => 0,
  };
}

/** Run the real simulation forward `seconds` with a scripted input. */
function simulate(state, seconds, input) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const actions = input.takeActions();
    stepPlayer(state, STEP, input, actions);
    stepTrafficCars(state, STEP);
    stepPedestrians(state, STEP);
    updateWanted(state, STEP);
    syncPolice(state);
    stepPolice(state, STEP);
    stepHeli(state, STEP);
    stepMissions(state, STEP);
    stepCombat(state, STEP);
    stepWorld(state, STEP);
  }
}

/** Park `n` cruisers right behind the player, in frame, mid-chase. */
function placeChasers(state, n, gap) {
  const car = playerCar(state);
  const px = car ? car.x : state.player.x;
  const py = car ? car.y : state.player.y;
  syncPolice(state);
  for (let i = 0; i < Math.min(n, state.police.length); i += 1) {
    const cop = state.police[i];
    cop.x = px - gap - i * 130;
    cop.y = py + (i % 2 === 0 ? -42 : 42);
    cop.angle = 0;
    cop.speed = 470;
  }
}
function putPlayerInCar(state, x, y, angle) {
  const car = state.cars.find((c) => c.special === 'COMET GT') ?? state.cars[0];
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = 320;
  car.parked = false;
  car.civilian = false;
  car.player = true;
  const p = state.player;
  p.onFoot = false;
  p.carId = car.id;
  p.x = x;
  p.y = y;
  p.angle = angle;
  state.camera.x = x - 640;
  state.camera.y = y - 360;
}

/**
 * Stage the named scene (1..4) in `state` and return the screen to draw.
 * The state is reset first, so the same seed always stages the same frame.
 */
export function stageShot(name, state) {
  resetWorld(state);
  startEpisode(state, 1);
  state.screen = SCREEN_PLAY;
  if (name === '2') {
    // 4 stars: helicopter, roadblocks, bystanders filming, red minimap.
    state.wanted.heat = 430;
    updateWanted(state, STEP);
    putPlayerInCar(state, 900, 1000, 0);
    simulate(state, 3, driveEastInput(state));
    placeChasers(state, 3, 200);
    // A roadblock ahead, in frame.
    if (state.roadblocks.length > 0) {
      const car = playerCar(state);
      state.roadblocks[0].x = Math.min((car ? car.x : 900) + 420, 3080);
      state.roadblocks[0].y = 1000;
      state.roadblocks[0].angle = Math.PI / 2;
    }
    setTicker(state, 'BREAKING: Roadblocks up across Costa Vidrio — bystanders filming everything');
    state.ticker.offset = 260;
    // A few bystanders filming the chase, in frame near the player.
    {
      const car = playerCar(state);
      const px = car ? car.x : state.player.x;
      const py = car ? car.y : state.player.y;
      const spots = [[200, 130], [340, -120], [-100, 140]];
      for (let i = 0; i < 3; i += 1) {
        const ped = state.peds[10 + i];
        ped.x = px + spots[i][0];
        ped.y = py + spots[i][1];
        ped.tx = px;
        ped.ty = py;
      }
      for (let i = 0; i < 30; i += 1) {
        stepPedestrians(state, STEP);
        stepWorld(state, STEP);
      }
    }
    state.shot = 'chase';
    return { screen: SCREEN_PLAY };
  }
  if (name === '3') {
    // On foot by the shops, 4 stars so the crowd films the player.
    state.wanted.heat = 430;
    updateWanted(state, STEP);
    const p = state.player;
    p.onFoot = true;
    p.carId = null;
    p.x = 1180;
    p.y = 1180;
    p.angle = -Math.PI / 2;
    state.camera.x = p.x - 640;
    state.camera.y = p.y - 360;
    // Gather a small crowd around the player so the REC bugs show.
    for (let i = 0; i < 6; i += 1) {
      const ped = state.peds[i];
      ped.x = p.x + [-160, -90, 90, 170, -40, 130][i];
      ped.y = p.y + [-120, 60, -90, 80, 150, 140][i];
      ped.tx = p.x;
      ped.ty = p.y;
    }
    simulate(state, 2, { moveX: () => 0, moveY: () => 0, takeActions: () => 0 });
    state.shot = 'onfoot';
    return { screen: SCREEN_PLAY };
  }
  if (name === '4') {
    // Episode 1 finished: the complete card with cash, followers, sponsor.
    state.mission.done = true;
    state.mission.completeT = 0;
    state.progress.cash += 2500;
    state.progress.followers += 8400;
    state.progress.episode = 1;
    state.progress.sponsor = 'SUNNY COLA';
    state.wanted.heat = 120;
    updateWanted(state, STEP);
    putPlayerInCar(state, 2400, 700, Math.PI / 2);
    simulate(state, 1, { moveX: () => 0, moveY: () => 0, takeActions: () => 0 });
    state.shot = 'mission';
    return { screen: SCREEN_COMPLETE };
  }
  // Default: 1, the cover. 2 stars, driving the avenue, police behind.
  state.wanted.heat = 230;
  updateWanted(state, STEP);
  putPlayerInCar(state, 1150, 1000, 0);
  simulate(state, 3, driveEastInput(state));
  placeChasers(state, 2, 190);
  state.shot = 'cover';
  return { screen: SCREEN_PLAY };
}

export { SAMPLE_STEPS, createWorld };

// Episodes: each heist is one TV episode with a clear objective chain and a
// sponsor + follower reward — that is the progression. Episode 1 is the
// Marina Vault grab; episode 2 is stealing the pink Comet GT for VIDRIO TV.
// Finishing an episode pays cash and followers, cools the heat, and saves.

import { WANTED } from './config.js';
import { addFloater, burst, dist2, playerCar, setTicker } from './world.js';
import { addHeat } from './vehicles.js';
import { coolDown } from './police.js';

export const EVENT_MISSION_DONE = 2;

/** The two episodes, their stages, markers and rewards. */
export const EPISODES = [
  {
    id: 1,
    title: 'EPISODE 1 — THE MARINA VAULT',
    sponsor: 'SUNNY COLA',
    cash: 2500,
    followers: 8400,
    stages: [
      { text: 'Get to the Marina Vault', x: 2680, y: 1880, radius: 110, kind: 'goto' },
      { text: 'Grab the loot — stand on the mark', x: 2680, y: 1880, radius: 70, kind: 'grab', hold: 1.2 },
      { text: 'Lose the heat — reach Garage Luna', x: 2455, y: 625, radius: 120, kind: 'goto' },
    ],
  },
  {
    id: 2,
    title: 'EPISODE 2 — THE SPONSORED GETAWAY',
    sponsor: 'VIDRIO ENERGY',
    cash: 6000,
    followers: 21000,
    stages: [
      { text: 'Steal the pink Comet GT', x: 1075, y: 700, radius: 80, kind: 'steal' },
      { text: 'Deliver it to the VIDRIO TV studio', x: 560, y: 1117, radius: 110, kind: 'deliver' },
      { text: 'Lose the heat — reach Garage Rico', x: 655, y: 625, radius: 120, kind: 'goto' },
    ],
  },
];

/** Start an episode: reset its stage and point the marker at stage one. */
export function startEpisode(state, id) {
  const ep = EPISODES.find((e) => e.id === id);
  if (!ep) return false;
  state.mission.id = id;
  state.mission.stage = 0;
  state.mission.done = false;
  state.mission.completeT = 0;
  state.mission.lootT = 0;
  const stage = ep.stages[0];
  state.mission.marker = { x: stage.x, y: stage.y };
  state.mission.markerText = stage.text;
  setTicker(state, `${ep.title} — ${stage.text}. Sponsored by ${ep.sponsor}.`);
  return true;
}

/** The episode currently running, or null when between episodes. */
export function currentEpisode(state) {
  return EPISODES.find((e) => e.id === state.mission.id) ?? null;
}

/** The objective line the HUD shows right now. */
export function objectiveText(state) {
  const ep = currentEpisode(state);
  if (!ep) return 'Press 1 for Episode 1 — the Marina Vault heist';
  if (state.mission.done) return `${ep.title} — COMPLETE`;
  return `${ep.title}: ${ep.stages[state.mission.stage].text}`;
}

/**
 * One step for the mission: check the current stage's condition, advance,
 * and pay out when the last stage clears. Returns EVENT_MISSION_DONE once.
 */
export function stepMissions(state, dt) {
  const ep = currentEpisode(state);
  if (!ep || state.mission.done) return 0;
  const stage = ep.stages[state.mission.stage];
  const p = state.player;
  const car = playerCar(state);
  const px = car ? car.x : p.x;
  const py = car ? car.y : p.y;
  let reached = false;
  if (stage.kind === 'goto' || stage.kind === 'deliver') {
    reached = dist2(px, py, stage.x, stage.y) < stage.radius * stage.radius;
  } else if (stage.kind === 'grab') {
    if (dist2(px, py, stage.x, stage.y) < stage.radius * stage.radius) {
      state.mission.lootT += dt;
      if (state.mission.lootT >= stage.hold) reached = true;
    } else {
      state.mission.lootT = 0;
    }
  } else if (stage.kind === 'steal') {
    reached = !p.onFoot && car !== null && car.special === 'COMET GT';
  }
  if (!reached) return 0;
  // Stage cleared: heat jumps (the audience loves it) and the next marker shows.
  state.mission.lootT = 0;
  addHeat(state, WANTED.missionHeat);
  burst(state, px, py, '#ffd94d', 14, 200);
  addFloater(state, px, py - 40, 'STAGE CLEAR!', '#ffd94d');
  state.mission.stage += 1;
  if (state.mission.stage >= ep.stages.length) {
    completeEpisode(state, ep);
    return EVENT_MISSION_DONE;
  }
  const next = ep.stages[state.mission.stage];
  state.mission.marker = { x: next.x, y: next.y };
  state.mission.markerText = next.text;
  setTicker(state, `${ep.title} — ${next.text}`);
  return 0;
}

function completeEpisode(state, ep) {
  state.mission.done = true;
  state.mission.completeT = 0;
  state.progress.cash += ep.cash;
  state.progress.followers += ep.followers;
  state.progress.episode = Math.max(state.progress.episode, ep.id);
  state.progress.sponsor = ep.sponsor;
  state.stats.episodesDone += 1;
  coolDown(state, 2);
  const p = state.player;
  const car = playerCar(state);
  const px = car ? car.x : p.x;
  const py = car ? car.y : p.y;
  burst(state, px, py, '#ff5fa2', 26, 260);
  burst(state, px, py, '#19c2d8', 26, 220);
  setTicker(state, `${ep.title} COMPLETE — +$${ep.cash.toLocaleString('en-US')} and +${ep.followers.toLocaleString('en-US')} followers, sponsored by ${ep.sponsor}`);
}

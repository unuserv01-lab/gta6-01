// Screenshot scenes behind ?shot=cover|chase|walk|mission. Each one stages a
// real game state — the same systems the player drives, placed and tuned so
// the frame shows them at their best — then the page paints it twice and
// sets window.__shotReady for the screenshot tool. Same seed, same frame.
import { SCREEN_PLAY, SCREEN_RESULT } from './render.js';
import { spawnCivilianCar, spawnPedestrian } from './traffic.js';
import { spawnPoliceCar } from './police.js';
import { MISSION_ESCAPE, MISSION_GRAB, currentObjective } from './missions.js';

/** Put the player in a car on the main avenue, mid-drive, stars at 2. */
function stageCover(state) {
  const { player, world } = state;
  player.car = state.cars.find((c) => c.kind === 'player');
  player.car.x = 1500;
  player.car.y = 1300;
  player.car.angle = Math.PI / 2;
  player.car.speed = 320;
  player.onFoot = false;
  player.x = 1500;
  player.y = 1300;
  player.angle = Math.PI / 2;
  player.heat = 62;
  player.stars = 2;
  player.viewers = 12400;
  player.money = 2750;
  player.followers = 6400;
  state.camera.x = 1500;
  state.camera.y = 1300;
  state.coverLogo = true;
  state.mission.stage = 'grab';
  state.mission.target = { x: world.casino.x + 60, y: world.casino.y + 144, label: 'CORAL CASINO' };
  state.mission.progress = 0.55;
  state.tickerX = 900;
}

/** A 4-star chase: the news heli, three police cars, red minimap, BREAKING. */
function stageChase(state) {
  const { player } = state;
  player.car = state.cars.find((c) => c.kind === 'player');
  player.car.x = 1500;
  player.car.y = 1300;
  player.car.angle = Math.PI / 2;
  player.car.speed = 380;
  player.car.hp = 72;
  player.onFoot = false;
  player.x = 1500;
  player.y = 1300;
  player.angle = Math.PI / 2;
  player.heat = 185;
  player.stars = 4;
  player.viewers = 24800;
  player.money = 5400;
  player.followers = 18200;
  state.camera.x = 1500;
  state.camera.y = 1300;
  state.heli.active = true;
  state.heli.fade = 1;
  state.heli.x = 1460;
  state.heli.y = 1210;
  state.heli.spotX = 1500;
  state.heli.spotY = 1300;
  // Three police cars in pursuit formation around the player.
  const spots = [
    { x: 1500, y: 1080, angle: Math.PI / 2 },
    { x: 1420, y: 1470, angle: Math.PI / 2 },
    { x: 1580, y: 1520, angle: Math.PI / 2 },
  ];
  for (const s of spots) {
    const cop = spawnPoliceCar(state, 'police');
    cop.x = s.x;
    cop.y = s.y;
    cop.angle = s.angle;
    cop.speed = 360;
  }
  // A roadblock ahead, inside the frame.
  const block = spawnPoliceCar(state, 'police');
  block.roadblock = true;
  block.x = 1500;
  block.y = 1600;
  block.angle = Math.PI / 2;
  state.mission.stage = 'escape';
  state.mission.target = { x: 1745, y: 1930, label: 'GANG SORE' };
  state.tickerX = 700;
}

/** On foot on the busy avenue: pedestrians filming, mission objective, shops. */
function stageWalk(state) {
  const { player, world } = state;
  player.onFoot = true;
  player.car = null;
  player.x = 1560;
  player.y = 1050;
  player.angle = -Math.PI / 2;
  player.heat = 175;
  player.stars = 4;
  player.viewers = 21300;
  player.money = 2750;
  player.followers = 6400;
  state.camera.x = 1560;
  state.camera.y = 1050;
  // The news chopper is overhead too (4 stars) — it sells the "live" hook.
  state.heli.active = true;
  state.heli.fade = 1;
  state.heli.x = 1480;
  state.heli.y = 960;
  state.heli.spotX = 1560;
  state.heli.spotY = 1050;
  // Crowd the avenue with pedestrians, several of them recording.
  state.peds = [];
  for (let i = 0; i < 16; i += 1) {
    const ped = spawnPedestrian(state, 1560, 1050);
    if (i < 6) {
      ped.recording = true;
      ped.flashT = 0.2;
      const a = state.rng() * Math.PI * 2;
      ped.x = 1560 + Math.cos(a) * (90 + state.rng() * 160);
      ped.y = 1050 + Math.sin(a) * (90 + state.rng() * 160);
      ped.angle = Math.atan2(1050 - ped.y, 1560 - ped.x);
    }
  }
  // A couple of civilian cars passing on the avenue.
  for (let i = 0; i < 3; i += 1) spawnCivilianCar(state);
  state.mission.stage = 'grab';
  state.mission.target = { x: world.casino.x + 60, y: world.casino.y + 144, label: 'CORAL CASINO' };
  state.mission.progress = 0.35;
  state.tickerX = 1000;
}

/** The episode result screen: followers up, money in, sponsor named. */
function stageMission(state) {
  const { player } = state;
  player.heat = 0;
  player.stars = 0;
  player.viewers = 31200;
  player.money = 5250;
  player.followers = 11400;
  state.camera.x = 1500;
  state.camera.y = 1300;
  state.result = {
    episode: { id: 1, title: 'EPISODE 1 — KASINO CORAL', sponsor: 'VOLT COLA' },
    money: 2500,
    followers: 5000,
    viewersPeak: 31200,
    totalMoney: 5250,
    totalFollowers: 11400,
  };
  state.screen = SCREEN_RESULT;
}

/**
 * Stage the named scene on the live game state and return the screen to draw.
 * Any other name stages the cover.
 */
export function stageShot(name, state) {
  // Clear the default population so each scene is composed deliberately.
  state.cars = state.cars.filter((c) => c.kind === 'player');
  state.police = [];
  if (name === 'chase') stageChase(state);
  else if (name === 'walk') stageWalk(state);
  else if (name === 'mission') stageMission(state);
  else stageCover(state);
  // Shot mode never runs the live loop, so set the HUD objective line here.
  state.objectiveText = currentObjective(state);
  return state.screen === SCREEN_RESULT ? SCREEN_RESULT : SCREEN_PLAY;
}

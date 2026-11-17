// LIVE HEIST — police.js
// The wanted system: heat -> stars -> viewers, and the response. Stars 1-2 send
// patrol cars, star 3 adds the news heli (see heli.js), stars 4-5 add roadblocks
// and a SWAT van. Hiding in the garage or an alley ("putus siaran") drains heat
// fast. The whole city is watching: wanted IS the viewer count.

import {
  HEAT_DECAY,
  HEAT_HIDEOUT_DECAY,
  STAR_THRESHOLDS,
  VIEWERS_BASE,
  WORLD_H,
  WORLD_W,
  angleDiff,
  clamp,
  dist,
  formatCount,
} from './config.js';
import { isHideoutAt, pointInRect } from './world.js';
import { drawCarShape } from './traffic.js';

/** Stars from heat: thresholds 12 / 30 / 52 / 72 / 90. */
export function policeStars(heat) {
  let stars = 0;
  for (let i = 1; i < STAR_THRESHOLDS.length; i++) {
    if (heat >= STAR_THRESHOLDS[i]) stars = i;
  }
  return stars;
}

/** Fresh wanted state. */
export function createPolice() {
  return {
    heat: 0,
    stars: 0,
    viewers: VIEWERS_BASE,
    cars: [],
    blocks: [],
    swat: [],
    spawnT: 0,
    siren: false,
    lastCrimeT: -99,
    bustedT: 0,
  };
}

/** Add heat for a crime and remember when it happened (for decay + ticker). */
export function addHeat(state, amount, label) {
  const police = state.police;
  police.heat = clamp(police.heat + amount, 0, 100);
  police.lastCrimeT = state.time;
  if (label) pushTicker(state, label);
  updateViewers(state);
}

/** Viewers follow the stars: the louder the crime, the bigger the audience. */
export function updateViewers(state) {
  const police = state.police;
  const target =
    VIEWERS_BASE +
    police.stars * 2600 +
    police.heat * 42 +
    (state.missions.active !== null ? 1400 : 0) +
    state.stats.followers * 0.02;
  police.viewers += (target - police.viewers) * 0.12;
  state.stats.bestViewers = Math.max(state.stats.bestViewers, Math.floor(police.viewers));
}

/** Push a line onto the news ticker. */
export function pushTicker(state, text) {
  state.ticker.push(text);
  if (state.ticker.length > 6) state.ticker.shift();
}

function spawnPoliceCar(state) {
  const player = state.player;
  // Spawn just off-screen in the direction the player is not facing.
  const a = state.rng() * Math.PI * 2;
  const x = clamp(player.x + Math.cos(a) * 620, 40, WORLD_W - 40);
  const y = clamp(player.y + Math.sin(a) * 620, 40, WORLD_H - 40);
  return {
    x,
    y,
    angle: Math.atan2(player.y - y, player.x - x),
    speed: 0,
    maxSpeed: 440 + state.police.stars * 8,
    color: '#f7ede2',
    kind: 'sedan',
    parked: false,
    ramT: 0,
  };
}

function spawnRoadblock(state) {
  // Two parked patrol cars + cones across the road ahead of the player.
  const player = state.player;
  const a = player.car ? player.car.angle : player.angle;
  const bx = player.x + Math.cos(a) * 420;
  const by = player.y + Math.sin(a) * 420;
  return { x: clamp(bx, 60, 2500), y: clamp(by, 60, 1860), angle: a + Math.PI / 2, t: 0 };
}

function stepPoliceCar(state, car, dt) {
  const player = state.player;
  const d = dist(car.x, car.y, player.x, player.y);
  const want = Math.atan2(player.y - car.y, player.x - car.x);
  const turn = clamp(angleDiff(car.angle, want), -2.4 * dt, 2.4 * dt);
  car.angle += turn;
  const targetSpeed = d > 90 ? car.maxSpeed : car.maxSpeed * 0.55;
  car.speed += clamp(targetSpeed - car.speed, -500 * dt, 320 * dt);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Police drive through the city (they can cut across blocks slowly); keep in bounds.
  car.x = clamp(nx, 24, 2536);
  car.y = clamp(ny, 24, 1896);
  // Ram: touching the player hurts and shoves.
  if (d < 52) {
    car.ramT += dt;
    if (car.ramT > 0.5) {
      car.ramT = 0;
      state.player.health -= player.car ? 4 : 12;
      state.audio.thud();
      state.particles.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        life: 0.3,
        maxLife: 0.3,
        size: 22,
        color: '#ff2d2d',
        kind: 'flash',
      });
      if (!player.car) addHeat(state, 2, '');
    }
  } else {
    car.ramT = Math.max(0, car.ramT - dt);
  }
}

/** Advance the wanted system: decay, spawns, chases, roadblocks, SWAT. */
export function stepPolice(state, dt) {
  const police = state.police;
  const starsBefore = policeStars(police.heat);
  // Decay: slow in the open (and only after 3 s without a crime), instant and
  // fast in a hideout — entering the garage or an alley cuts the broadcast.
  const hiding = isHideoutAt(state.world, state.player.x, state.player.y);
  if (hiding) {
    police.heat = Math.max(0, police.heat - HEAT_HIDEOUT_DECAY * dt);
  } else if (state.time - police.lastCrimeT > 3) {
    police.heat = Math.max(0, police.heat - HEAT_DECAY * dt);
  }
  police.stars = policeStars(police.heat);
  if (hiding && police.stars < starsBefore) {
    pushTicker(state, 'SIARAN PUTUS — penonton kehilangan jejakmu di gang Costa Vidrio');
  }
  updateViewers(state);
  police.siren = police.stars > 0;

  // Patrol cars: one per star, up to 5.
  const want = police.stars === 0 ? 0 : Math.min(5, police.stars + 1);
  police.spawnT -= dt;
  while (police.cars.length < want && police.spawnT <= 0) {
    police.cars.push(spawnPoliceCar(state));
    police.spawnT = 0.8;
  }
  if (police.cars.length > want) police.cars.splice(want);
  for (const car of police.cars) stepPoliceCar(state, car, dt);

  // Roadblocks at 4+ stars, two of them, refreshed as the player moves.
  if (police.stars >= 4) {
    if (police.blocks.length < 2) police.blocks.push(spawnRoadblock(state));
    for (const b of police.blocks) b.t += dt;
    if (police.blocks.length > 0 && police.blocks[0].t > 14) police.blocks.shift();
  } else {
    police.blocks.length = 0;
  }

  // SWAT van at 5 stars.
  if (police.stars >= 5 && police.swat.length === 0) {
    const van = spawnPoliceCar(state);
    van.kind = 'van';
    van.maxSpeed = 500;
    van.color = '#2b2f3a';
    police.swat.push(van);
    pushTicker(state, 'BREAKING: SWAT dikerahkan — Costa Vidrio dikunci total');
  }
  if (police.stars < 5) police.swat.length = 0;
  for (const van of police.swat) stepPoliceCar(state, van, dt);
}

/** Draw patrol cars (flashing light bars), roadblocks and the SWAT van. */
export function drawPolice(ctx, state) {
  for (const car of state.police.cars) {
    drawCarShape(ctx, car.x, car.y, car.angle, car.color, car.kind, true, state.time);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillText('POLISI', 0, 3);
    ctx.restore();
  }
  for (const b of state.police.blocks) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    drawCarShape(ctx, -34, 0, 0, '#f7ede2', 'sedan', true, state.time);
    drawCarShape(ctx, 34, 0, 0, '#f7ede2', 'sedan', true, state.time);
    ctx.fillStyle = '#ff6b35';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 40 - 8, -46);
      ctx.lineTo(i * 40 + 8, -46);
      ctx.lineTo(i * 40, -62);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  for (const van of state.police.swat) {
    drawCarShape(ctx, van.x, van.y, van.angle, van.color, van.kind, true, state.time);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(van.x, van.y);
    ctx.rotate(van.angle);
    ctx.fillText('SWAT', 0, 4);
    ctx.restore();
  }
}

/** One-line wanted summary for the HUD. */
export function wantedLabel(state) {
  return `${state.police.stars} BINTANG • ${formatCount(state.police.viewers)} MENONTON`;
}

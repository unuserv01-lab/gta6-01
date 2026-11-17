// The law and the audience: wanted stars, the viewer count that follows
// them, police cars that chase, roadblocks and SWAT at high heat, and the
// "busted" timer when a cruiser sits on the player. The wanted level IS the
// viewer count — more chaos, more viewers, more police — and cutting the
// broadcast in an alley or garage is the only way it falls fast.

import { POLICE, ROAD_X, ROAD_Y, SWAT, WANTED, WORLD } from './config.js';
import { addFloater, angleDiff, angleTo, burst, clamp, dist2, inSafeZone, playerCar, resolveCircle, setTicker } from './world.js';

export const EVENT_BUSTED = 1;

/** Recompute stars and viewers from the heat, and decay heat over time. */
export function updateWanted(state, dt) {
  const w = state.wanted;
  const p = state.player;
  const car = playerCar(state);
  const px = car ? car.x : p.x;
  const py = car ? car.y : p.y;
  const safe = inSafeZone(state, px, py);
  const before = w.stars;
  if (safe) {
    // SIGNAL LOST: the broadcast is cut, the audience leaves, stars fall.
    w.heat = Math.max(0, w.heat - WANTED.decaySafe * dt);
    w.signalLost += dt;
    if (w.lostFlash <= 0 && w.heat > 0) {
      w.lostFlash = 2.2;
      setTicker(state, `SIGNAL LOST — the Wheelman vanished into ${safe.name}. Viewers are leaving...`);
    }
  } else {
    w.heat = Math.max(0, w.heat - WANTED.decayOpen * dt);
    w.signalLost = 0;
  }
  w.stars = Math.min(5, Math.floor(w.heat / WANTED.heatPerStar));
  w.viewers = Math.round(WANTED.baseViewers + w.stars * WANTED.viewersPerStar + w.heat * WANTED.viewersPerHeat);
  if (w.viewers > state.progress.bestViewers) state.progress.bestViewers = w.viewers;
  if (w.stars > before) {
    state.stats.chases += 1;
    if (w.stars === 3) setTicker(state, 'BREAKING: News helicopter overhead — the whole city is watching now');
    else if (w.stars === 4) setTicker(state, 'BREAKING: Roadblocks up across Costa Vidrio — bystanders filming everything');
    else if (w.stars === 5) setTicker(state, 'BREAKING: SWAT deployed — five stars, the biggest audience in city history');
    else setTicker(state, `Police responding — wanted level ${w.stars} star${w.stars > 1 ? 's' : ''}, viewers climbing`);
  }
}

/** Keep the right number of cruisers (and one SWAT van at 5 stars) on the road. */
export function syncPolice(state) {
  const want = state.wanted.stars === 0 ? 0 : state.wanted.stars <= 2 ? state.wanted.stars : state.wanted.stars === 3 ? 3 : 4;
  while (state.police.length < want) spawnPolice(state, false);
  while (state.police.length > want) state.police.pop();
  const wantSwat = state.wanted.stars >= 5;
  const hasSwat = state.police.some((c) => c.kind === 'swat');
  if (wantSwat && !hasSwat) spawnPolice(state, true);
  if (!wantSwat && hasSwat) {
    const i = state.police.findIndex((c) => c.kind === 'swat');
    if (i >= 0) state.police.splice(i, 1);
  }
  // Roadblocks at 4+ stars: two stopped cruisers ahead on the player's road.
  const wantBlocks = state.wanted.stars >= 4 ? 2 : 0;
  while (state.roadblocks.length < wantBlocks) {
    const p = state.player;
    const car = playerCar(state);
    const px = car ? car.x : p.x;
    const py = car ? car.y : p.y;
    const ahead = 500 + state.rng() * 300;
    const side = state.rng() < 0.5 ? -1 : 1;
    state.roadblocks.push({
      x: clamp(px + (state.rng() < 0.5 ? ahead : 0), 120, WORLD.width - 120),
      y: clamp(py + (state.rng() < 0.5 ? ahead * side : 0), 120, WORLD.height - 120),
      angle: state.rng() * Math.PI * 2,
    });
  }
  while (state.roadblocks.length > wantBlocks) state.roadblocks.pop();
}

function spawnPolice(state, swat) {
  const p = state.player;
  const car = playerCar(state);
  const px = car ? car.x : p.x;
  const py = car ? car.y : p.y;
  // Spawn on a road edge away from the player, then close in.
  const edge = Math.floor(state.rng() * 4);
  let x = px;
  let y = py;
  if (edge === 0) { x = ROAD_X[Math.floor(state.rng() * ROAD_X.length)]; y = 120; }
  else if (edge === 1) { x = ROAD_X[Math.floor(state.rng() * ROAD_X.length)]; y = WORLD.height - 120; }
  else if (edge === 2) { x = 120; y = ROAD_Y[Math.floor(state.rng() * ROAD_Y.length)]; }
  else { x = WORLD.width - 120; y = ROAD_Y[Math.floor(state.rng() * ROAD_Y.length)]; }
  state.police.push({
    x, y, angle: angleTo(x, y, px, py), speed: 0,
    kind: swat ? 'swat' : 'car', bustedT: 0, sirenT: state.rng() * 2,
  });
}

/**
 * One step for every cruiser: steer at the player, ram the player's car,
 * and sit on a player on foot until the busted timer runs out.
 * Returns EVENT_BUSTED when the player is caught.
 */
export function stepPolice(state, dt) {
  const p = state.player;
  const car = playerCar(state);
  const px = car ? car.x : p.x;
  const py = car ? car.y : p.y;
  let caught = false;
  for (const cop of state.police) {
    const top = cop.kind === 'swat' ? SWAT.maxSpeed : POLICE.maxSpeed;
    const accel = cop.kind === 'swat' ? SWAT.accel : POLICE.accel;
    const wantAngle = angleTo(cop.x, cop.y, px, py);
    cop.angle += clamp(angleDiff(cop.angle, wantAngle), -POLICE.turn * dt, POLICE.turn * dt);
    cop.speed = Math.min(top, cop.speed + accel * dt);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    const pos = resolveCircle(state, nx, ny, POLICE.radius);
    if (pos.x !== nx || pos.y !== ny) cop.speed *= 0.5;
    cop.x = pos.x;
    cop.y = pos.y;
    cop.sirenT += dt;
    const d = dist2(cop.x, cop.y, px, py);
    const radius = cop.kind === 'swat' ? SWAT.radius : POLICE.radius;
    if (car) {
      // Ram: damage the player's car and throw sparks.
      if (d < (radius + 24) * (radius + 24)) {
        const dmg = (cop.kind === 'swat' ? SWAT.ramDamage : POLICE.ramDamage) * dt;
        car.hp -= dmg;
        if (state.rng() < dt * 6) burst(state, cop.x, cop.y, '#ffd94d', 4, 130);
        if (car.hp <= 0) {
          car.hp = 0;
          car.speed = 0;
          p.bustedT += dt;
          if (p.bustedT > POLICE.bustedSeconds) caught = true;
        }
      } else {
        p.bustedT = Math.max(0, p.bustedT - dt);
      }
    } else if (d < POLICE.catchRadius * POLICE.catchRadius) {
      p.bustedT += dt;
      if (Math.floor(p.bustedT * 4) !== Math.floor((p.bustedT - dt) * 4)) {
        addFloater(state, px, py - 30, 'BUSTED?!', '#ff2e3e');
      }
      if (p.bustedT > POLICE.bustedSeconds) caught = true;
    } else {
      p.bustedT = Math.max(0, p.bustedT - dt * 2);
    }
  }
  return caught ? EVENT_BUSTED : 0;
}

/** Drop one star outright (used when an episode is finished cleanly). */
export function coolDown(state, stars) {
  state.wanted.heat = Math.max(0, state.wanted.heat - stars * WANTED.heatPerStar);
}

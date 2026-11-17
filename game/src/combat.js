// Combat, kept simple and readable: a punch on foot that knocks a
// bystander or a cop back (and adds heat — violence is content), plus the
// car-ram damage that happens when cruisers hit the player's car at speed.
// No guns: the show is the chase, not a shootout.

import { PLAYER } from './config.js';
import { addFloater, angleDiff, burst, dist2, playerCar } from './world.js';
import { addHeat } from './vehicles.js';

/** The punch: a short arc in front of the player on foot. */
export function punch(state) {
  const p = state.player;
  if (!p.onFoot || p.punchT > 0) return false;
  p.punchT = 0.35;
  p.punchHit = false;
  let hit = false;
  const targets = [...state.peds, ...state.police];
  for (const t of targets) {
    const d = dist2(p.x, p.y, t.x, t.y);
    if (d > PLAYER.punchRange * PLAYER.punchRange) continue;
    const ang = Math.atan2(t.y - p.y, t.x - p.x);
    if (Math.abs(angleDiff(p.angle, ang)) > PLAYER.punchArc) continue;
    const push = 260;
    t.x += Math.cos(ang) * push * 0.12;
    t.y += Math.sin(ang) * push * 0.12;
    if (t.speed !== undefined) t.speed = Math.max(60, (t.speed ?? 0) + 120);
    burst(state, t.x, t.y, '#fff7e6', 8, 160);
    addFloater(state, t.x, t.y - 26, 'WHAM!', '#ffe14d');
    hit = true;
  }
  if (hit) {
    p.punchHit = true;
    state.stats.punches += 1;
    addHeat(state, 16);
  }
  return hit;
}

/** Ram damage between the player's car and a police car that touches it. */
export function stepCombat(state, dt) {
  const car = playerCar(state);
  if (!car) return;
  for (const cop of state.police) {
    const d = dist2(car.x, car.y, cop.x, cop.y);
    if (d < 46 * 46 && Math.abs(car.speed) > 200) {
      // A hard ram at speed shoves the cruiser aside.
      const ang = Math.atan2(cop.y - car.y, cop.x - car.x);
      cop.x += Math.cos(ang) * 60 * dt * 10;
      cop.y += Math.sin(ang) * 60 * dt * 10;
      cop.speed *= 0.6;
      car.speed *= 0.92;
      if (state.rng() < dt * 8) burst(state, cop.x, cop.y, '#ff5fa2', 5, 150);
    }
  }
}

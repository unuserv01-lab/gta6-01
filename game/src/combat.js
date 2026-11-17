// Combat: a simple punch and a simple shot. Punching knocks a pedestrian
// back and scares them; shooting hits the nearest police car, convoy car or
// pedestrian in front of the player. Both raise heat — the city is watching.
import { HEAT_PUNCH, HEAT_SHOOT, PUNCH_COOLDOWN, PUNCH_RANGE, SHOOT_COOLDOWN, SHOOT_RANGE, angleDiff } from './config.js';
import { nearestPed } from './traffic.js';
import { spawnSparks } from './vehicles.js';

/** The player throws a punch at whatever is in front of them. */
export function doPunch(state) {
  const { player } = state;
  if (player.punchCd > 0 || !player.onFoot) return;
  player.punchCd = PUNCH_COOLDOWN;
  state.audio.punch();
  const px = player.x + Math.cos(player.angle) * PUNCH_RANGE;
  const py = player.y + Math.sin(player.angle) * PUNCH_RANGE;
  // Punch a pedestrian: they run away, and the crowd sees it.
  const ped = nearestPed(state, px, py, PUNCH_RANGE + 10);
  if (ped) {
    ped.panic = 3;
    player.addHeat(HEAT_PUNCH);
    spawnSparks(state, ped.x, ped.y, 6);
    return;
  }
  // Punch a police car: dents it and really raises the heat.
  for (const car of state.cars) {
    if (car.kind !== 'police' && car.kind !== 'swat') continue;
    const d = Math.hypot(car.x - px, car.y - py);
    if (d < 60) {
      car.hp -= 6;
      player.addHeat(HEAT_PUNCH * 2);
      spawnSparks(state, car.x, car.y, 8);
      return;
    }
  }
}

/** The player fires one shot in the direction they face. */
export function doShoot(state) {
  const { player } = state;
  if (player.shootCd > 0) return;
  player.shootCd = SHOOT_COOLDOWN;
  state.audio.shoot();
  const ox = player.onFoot ? player.x : player.car.x;
  const oy = player.onFoot ? player.y : player.car.y;
  const oa = player.angle;
  // Muzzle flash particle.
  state.particles.push({
    x: ox + Math.cos(oa) * 24,
    y: oy + Math.sin(oa) * 24,
    vx: Math.cos(oa) * 60, vy: Math.sin(oa) * 60,
    life: 0.12, maxLife: 0.12, size: 7, color: '#ffe066',
  });
  let best = null;
  let bestD = SHOOT_RANGE;
  for (const car of state.cars) {
    if (car === player.car) continue;
    const dx = car.x - ox;
    const dy = car.y - oy;
    const d = Math.hypot(dx, dy);
    if (d > bestD) continue;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), oa)) > 0.45) continue;
    bestD = d;
    best = { kind: 'car', target: car };
  }
  if (!best) {
    const ped = nearestPed(state, ox + Math.cos(oa) * 120, oy + Math.sin(oa) * 120, 130);
    if (ped) best = { kind: 'ped', target: ped };
  }
  if (!best) return;
  player.addHeat(HEAT_SHOOT);
  if (best.kind === 'car') {
    best.target.hp -= 20;
    spawnSparks(state, best.target.x, best.target.y, 10);
    if (best.target.kind === 'police' || best.target.kind === 'swat') {
      best.target.speed = Math.max(best.target.speed, 200);
    }
    if (best.target.kind === 'convoy' && best.target.hp <= 0) {
      best.target.stopped = true;
      best.target.speed = 0;
    }
    if ((best.target.kind === 'police' || best.target.kind === 'swat') && best.target.hp <= 0) {
      state.cars = state.cars.filter((c) => c !== best.target);
      state.police = state.police.filter((c) => c !== best.target);
      spawnSparks(state, best.target.x, best.target.y, 24);
      state.message = 'MOBIL POLISI DILUMPUHKAN!';
      state.messageT = 2;
    }
  } else {
    best.target.panic = 4;
    spawnSparks(state, best.target.x, best.target.y, 6);
  }
}

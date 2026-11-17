// Vehicles: the player's car — stealing a civilian's ride, driving it, and
// wrecking it. Driving is arcade: accelerate, brake/reverse, steer by speed,
// skid marks and a little drift when turning hard.
import {
  CAR_ACCEL,
  CAR_BRAKE,
  CAR_LENGTH,
  CAR_MAX_SPEED,
  CAR_REVERSE_MAX,
  CAR_TURN,
  CAR_WIDTH,
  HEAT_CAR_STEAL,
  PALETTE,
  angleDiff,
  clamp,
} from './config.js';
import { isOnRoad } from './world.js';

/** The player's own starter car, parked by the spawn point. */
export function spawnPlayerCar(state) {
  const car = {
    kind: 'player',
    x: state.world.spawn.x + 60,
    y: state.world.spawn.y,
    angle: 0,
    speed: 0,
    color: PALETTE.playerCar,
    hp: 100,
    driver: 'none',
  };
  state.cars.push(car);
  return car;
}

/** Nearest car the player could steal / enter, within reach. */
export function nearestEnterableCar(state) {
  const { player } = state;
  let best = null;
  let bestD = 70;
  for (const car of state.cars) {
    if (car.kind === 'police' || car.kind === 'swat') continue;
    if (car.driver === 'player') continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/** Step into a car (steal it if it is a civilian's). */
export function enterCar(state, car) {
  const { player } = state;
  const wasCivil = car.kind === 'civil';
  if (wasCivil) {
    car.kind = 'player';
    player.addHeat(HEAT_CAR_STEAL);
    state.message = 'MOBIL DICURI! +' + Math.round(HEAT_CAR_STEAL) + ' HEAT — DITONTON LIVE';
    state.messageT = 2.5;
    state.audio.sirenBlip();
  } else {
    player.addHeat(0);
  }
  car.driver = 'player';
  player.car = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
}

/** Step out of the car, onto the road beside it. */
export function exitCar(state) {
  const { player } = state;
  const car = player.car;
  if (!car) return;
  car.driver = 'none';
  car.speed = 0;
  player.car = null;
  player.onFoot = true;
  player.x = car.x - Math.sin(car.angle) * (CAR_WIDTH / 2 + 18);
  player.y = car.y + Math.cos(car.angle) * (CAR_WIDTH / 2 + 18);
  player.angle = car.angle;
  state.world.collideCircle(player, 14);
}

/** Drive the player's car one step from the held keys. */
export function updatePlayerCar(state, input, dt) {
  const { player, world } = state;
  const car = player.car;
  if (!car) return;
  const up = input.isHeld('up');
  const down = input.isHeld('down');
  const left = input.isHeld('left');
  const right = input.isHeld('right');

  if (up) car.speed += CAR_ACCEL * dt;
  if (down) car.speed -= (car.speed > 10 ? CAR_BRAKE : CAR_ACCEL * 0.6) * dt;
  if (!up && !down) car.speed -= Math.sign(car.speed) * 260 * dt;
  if (Math.abs(car.speed) < 8 && !up && !down) car.speed = 0;
  car.speed = clamp(car.speed, -CAR_REVERSE_MAX, CAR_MAX_SPEED);

  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const turnRate = CAR_TURN * clamp(Math.abs(car.speed) / 160, 0.25, 1);
  car.angle += steer * turnRate * Math.sign(car.speed || 1) * dt;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx;
  car.y = ny;

  // Skid marks when turning hard at speed.
  if (Math.abs(steer) > 0 && Math.abs(car.speed) > 240 && state.rng() < dt * 30) {
    state.skids.push({
      x: car.x - Math.cos(car.angle) * CAR_LENGTH / 2,
      y: car.y - Math.sin(car.angle) * CAR_LENGTH / 2,
      angle: car.angle,
      life: 5,
    });
    if (state.skids.length > 220) state.skids.shift();
  }

  // Bumping a building slows the car and throws sparks.
  const before = { x: car.x, y: car.y };
  if (world.collideCircle(car, CAR_LENGTH / 2)) {
    if (Math.abs(car.speed) > 180) {
      state.audio.thud();
      state.camera.shake = Math.min(10, Math.abs(car.speed) / 40);
      spawnSparks(state, car.x, car.y, 10);
      car.hp -= 8;
    }
    car.speed *= 0.55;
  }
  world.clampToWorld(car, 30);

  // Off-road driving is slower (sand and grass drag).
  if (!isOnRoad(car.x, car.y)) car.speed *= 1 - dt * 0.35;

  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  if (car.hp <= 0) wreckPlayerCar(state);
}

/** The player's car is wrecked: it burns out and the player is on foot. */
export function wreckPlayerCar(state) {
  const { player } = state;
  const car = player.car;
  if (!car) return;
  spawnSparks(state, car.x, car.y, 26);
  state.message = 'MOBIL HANCUR! Cari mobil lain — tekan E di dekat mobil';
  state.messageT = 3;
  state.audio.explosion();
  state.cars = state.cars.filter((c) => c !== car);
  player.car = null;
  player.onFoot = true;
  player.x = car.x + 40;
  player.y = car.y;
}

/** Small orange sparks at a point. */
export function spawnSparks(state, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const a = state.rng() * Math.PI * 2;
    const sp = 60 + state.rng() * 160;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.4 + state.rng() * 0.4,
      maxLife: 0.8,
      size: 2 + state.rng() * 3,
      color: state.rng() < 0.5 ? '#ffb347' : '#ff5d8f',
    });
  }
}

/** Two cars bumping: push apart and trade a little speed. */
export function collideCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const min = CAR_LENGTH * 0.85;
  if (d >= min || d < 0.01) return false;
  const push = (min - d) / 2;
  const nx = dx / d;
  const ny = dy / d;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const swap = a.speed;
  a.speed = b.speed * 0.6;
  b.speed = swap * 0.6;
  return true;
}

/** Keep the player's car angle facing its motion after a bump. */
export function faceMotion(car) {
  if (Math.abs(car.speed) > 20) {
    car.angle += angleDiff(Math.atan2(Math.sin(car.angle), Math.cos(car.angle)), car.angle) * 0;
  }
}

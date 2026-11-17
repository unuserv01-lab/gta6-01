// LIVE HEIST — vehicles.js
// The player's car: stealing, driving, exiting. Top-down arcade physics —
// throttle, steering that bites with speed, braking, drift smoke, and
// building collision that slides instead of stopping dead.

import {
  CAR_ACCEL,
  CAR_BRAKE,
  CAR_DRAG,
  CAR_MAX,
  CAR_REVERSE,
  CAR_TURN,
  PLAYER_RADIUS,
  WORLD_H,
  WORLD_W,
  angleDiff,
  clamp,
} from './config.js';
import { isBlockedAt } from './world.js';
import { drawCarShape } from './traffic.js';

/** A fresh vehicle entity. */
export function createVehicle(x, y, angle, color, kind = 'sedan') {
  return { x, y, angle, speed: 0, color, kind, parked: false, flashT: 0 };
}

const PLAYER_CAR_COLORS = ['#ff6b35', '#38b6d3', '#ffd166', '#ff6b9d'];

/** The nearest stealable civilian car within reach of the player, or null. */
export function nearestStealableCar(state) {
  let best = null;
  let bestD = 86;
  for (const car of state.traffic.cars) {
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/** E pressed on foot: steal the nearest car (heat!) or exit the car. */
export function enterOrExitCar(state) {
  const player = state.player;
  if (player.car) {
    // Exit: step out to the side of the car, leave it parked in traffic.
    const side = player.car.angle + Math.PI / 2;
    const px = player.car.x + Math.cos(side) * 34;
    const py = player.car.y + Math.sin(side) * 34;
    player.car.parked = true;
    player.car.speed = 0;
    state.traffic.cars.push(player.car);
    player.x = isBlockedAt(state.world, px, py, PLAYER_RADIUS) ? player.car.x - Math.cos(side) * 34 : px;
    player.y = isBlockedAt(state.world, px, py, PLAYER_RADIUS) ? player.car.y - Math.sin(side) * 34 : py;
    player.car = null;
    player.onFoot = true;
    player.angle = side;
    return 'exit';
  }
  const car = nearestStealableCar(state);
  if (!car) return null;
  state.traffic.cars.splice(state.traffic.cars.indexOf(car), 1);
  car.parked = false;
  car.speed = 0;
  player.car = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  return 'steal';
}

/** Drive the player's car one step. Returns true when drifting (for smoke + sound). */
export function stepPlayerCar(state, dt, input) {
  const car = state.player.car;
  if (!car) return false;
  const axis = input.axis();
  // Forward is W / Up, reverse S / Down, steer A/D.
  if (axis.y < 0) car.speed += CAR_ACCEL * dt;
  else if (axis.y > 0) car.speed -= (car.speed > 0 ? CAR_BRAKE : CAR_ACCEL * 0.5) * dt;
  else car.speed -= car.speed * CAR_DRAG * dt;
  car.speed = clamp(car.speed, -CAR_REVERSE, CAR_MAX);
  const steer = axis.x;
  const grip = clamp(Math.abs(car.speed) / 120, 0, 1);
  car.angle += steer * CAR_TURN * grip * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Collide with buildings: try x then y so the car slides along walls.
  const r = 20;
  if (!isBlockedAt(state.world, nx, car.y, r)) car.x = nx;
  else car.speed *= 0.55;
  if (!isBlockedAt(state.world, car.x, ny, r)) car.y = ny;
  else car.speed *= 0.55;
  car.x = clamp(car.x, 24, WORLD_W - 24);
  car.y = clamp(car.y, 24, WORLD_H - 24);
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = car.angle;
  // Roadblock collision: a hard stop + damage.
  for (const block of state.police.blocks) {
    if (Math.hypot(car.x - block.x, car.y - block.y) < 52 && Math.abs(car.speed) > 60) {
      car.speed *= -0.25;
      state.player.health -= 6;
      state.audio.thud();
      spawnCrash(state, car.x, car.y);
    }
  }
  const drifting = Math.abs(steer) > 0.6 && Math.abs(car.speed) > 240;
  if (drifting && state.rng() < 0.6) {
    state.particles.push({
      x: car.x - Math.cos(car.angle) * 26,
      y: car.y - Math.sin(car.angle) * 26,
      vx: (state.rng() - 0.5) * 30,
      vy: (state.rng() - 0.5) * 30,
      life: 0.5,
      maxLife: 0.5,
      size: 10,
      color: 'rgba(200,200,200,0.6)',
      kind: 'smoke',
    });
  }
  return drifting;
}

function spawnCrash(state, x, y) {
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      x,
      y,
      vx: (state.rng() - 0.5) * 260,
      vy: (state.rng() - 0.5) * 260,
      life: 0.5,
      maxLife: 0.5,
      size: 5,
      color: '#ffd166',
      kind: 'spark',
    });
  }
}

/** Draw the player's car (with a gold outline so it reads as "yours"). */
export function drawPlayerCar(ctx, state) {
  const car = state.player.car;
  if (!car) return;
  ctx.save();
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(car.x, car.y, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawCarShape(ctx, car.x, car.y, car.angle, car.color, car.kind, false, state.time);
}

/** A fresh player car colour, cycling the hero palette. */
export function nextPlayerCarColor(state) {
  return PLAYER_CAR_COLORS[state.stats.episodesDone % PLAYER_CAR_COLORS.length];
}

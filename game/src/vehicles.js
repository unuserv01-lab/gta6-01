// SPDX-License-Identifier: MIT
// Live Heist — vehicles: stealing, driving, crashing.
// The player walks up to any parked or crawling civilian car, taps E,
// yanks the driver out and takes the wheel. Driving is arcade-simple:
// W/S for gas and brake, A/D to steer, and the car only turns well
// while it is moving — like a real getaway, just friendlier.

import { CFG } from './config.js';
import { pointInBuilding, clampToWorld } from './world.js';
import { isDown } from './input.js';

const PLAYER_CARS = [
  { model: 'Comet GT', color: '#ff7a1a', top: 600 },
  { model: 'Brisa Coupe', color: '#19d3e6', top: 540 },
  { model: 'Sol Runner', color: '#ff4d8d', top: 500 },
];

export function makePlayerCar(x, y, angle, modelIdx = 0) {
  const spec = PLAYER_CARS[modelIdx % PLAYER_CARS.length];
  return {
    id: 'playerCar',
    x, y, angle,
    speed: 0,
    color: spec.color,
    model: spec.model,
    top: spec.top,
    isPlayer: true,
    damage: 0,
    smoke: 0,
  };
}

export function nearestStealable(G) {
  const { player } = G;
  let best = null;
  let bestD = CFG.stealRange;
  const pool = [...G.traffic, ...G.parkedCars];
  for (const car of pool) {
    if (car.isPlayer) continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function stealCar(G, car) {
  const { player, wanted } = G;
  // Yank the driver out: the civilian car becomes the player's ride.
  const idx = G.traffic.indexOf(car);
  if (idx >= 0) G.traffic.splice(idx, 1);
  const pIdx = G.parkedCars.indexOf(car);
  if (pIdx >= 0) G.parkedCars.splice(pIdx, 1);
  const ride = {
    id: 'playerCar',
    x: car.x, y: car.y, angle: car.angle,
    speed: 0,
    color: car.color,
    model: car.model,
    top: 520,
    isPlayer: true,
    isMission: car.isMission === true,
    damage: 0,
    smoke: 0,
  };
  G.playerCar = ride;
  player.inCar = true;
  player.x = ride.x;
  player.y = ride.y;
  player.angle = ride.angle;
  G.wanted.heat += CFG.heatPerSteal;
  G.stats.carsStolen += 1;
  G.feed.push(`CAR STOLEN — a ${car.model} joins the broadcast`);
  G.audio.blip(880, 0.08);
  G.audio.blip(660, 0.12);
  return ride;
}

export function exitCar(G) {
  const { player } = G;
  if (!G.playerCar) return;
  player.inCar = false;
  player.x = G.playerCar.x + Math.cos(G.playerCar.angle + Math.PI / 2) * 34;
  player.y = G.playerCar.y + Math.sin(G.playerCar.angle + Math.PI / 2) * 34;
  player.angle = G.playerCar.angle;
  G.playerCar.speed = 0;
  G.playerCar = null;
}

export function updatePlayerCar(G, dt) {
  const car = G.playerCar;
  if (!car) return;
  const { input, player } = G;
  const fwd = isDown(input, 'w', 'ArrowUp') ? 1 : 0;
  const back = isDown(input, 's', 'ArrowDown') ? 1 : 0;
  const steerL = isDown(input, 'a', 'ArrowLeft') ? 1 : 0;
  const steerR = isDown(input, 'd', 'ArrowRight') ? 1 : 0;

  if (fwd) car.speed += CFG.carAccel * dt;
  else if (back) {
    car.speed -= (car.speed > 20 ? CFG.carBrake : CFG.carAccel * 0.55) * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 240 * dt);
  }
  car.speed = Math.max(-CFG.carMaxReverse, Math.min(car.top, car.speed));
  // A wrecked car (damage past 100) loses half its top speed and
  // pours smoke — time to ditch it and steal a fresh one.
  if (car.damage > 100) car.speed = Math.max(-CFG.carMaxReverse, Math.min(car.top * 0.5, car.speed));

  const steer = (steerR - steerL) * CFG.carTurn * Math.min(1, Math.abs(car.speed) / 160);
  car.angle += steer * Math.sign(car.speed || 1) * dt * (car.speed >= 0 ? 1 : -1);

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = pointInBuilding(G.world, nx, ny, 4);
  if (hit) {
    car.speed *= -0.25;
    car.damage += Math.abs(car.speed) * 0.02 + 4;
    G.audio.thud();
    G.particles.burst(car.x, car.y, '#ffd23f', 8);
  } else {
    const c = clampToWorld(nx, ny);
    if (c.x !== nx || c.y !== ny) car.speed *= 0.4;
    car.x = c.x;
    car.y = c.y;
  }
  car.smoke = Math.max(0, car.damage - 55) / 45;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = Math.abs(car.speed);

  // Speeding past a cop car feeds the broadcast.
  if (Math.abs(car.speed) > 420 && G.wanted.stars >= 1) {
    G.wanted.heat += CFG.heatPerSpeeding * dt;
  }
  // Skid marks and dust while cornering hard.
  if (Math.abs(car.speed) > 300 && (steerL || steerR) && Math.random() < dt * 22) {
    G.particles.puff(car.x - Math.cos(car.angle) * 22, car.y - Math.sin(car.angle) * 22);
  }
}

export function collideCarsWithWorld(G, dt) {
  // Police and traffic bounce off buildings; the player car handles
  // its own collision in updatePlayerCar.
  for (const car of [...G.police, ...G.traffic]) {
    if (pointInBuilding(G.world, car.x, car.y, 2)) {
      car.x -= Math.cos(car.angle) * car.speed * dt * 2;
      car.y -= Math.sin(car.angle) * car.speed * dt * 2;
      car.speed *= 0.5;
      car.angle += (Math.random() - 0.5) * 0.9;
    }
  }
}

// The player's body and cars: walking the sidewalks, stealing a parked or
// civilian car, and driving it. Stealing is the crime that starts the show:
// it adds wanted heat and a ticker line, and the whole city starts watching.

import { CAR, PLAYER, WANTED } from './config.js';
import { angleDiff, burst, clamp, nearestCar, playerCar, resolveCircle, setTicker } from './world.js';

/** Try to enter the nearest car (E). Stealing a civilian car adds heat. */
export function tryEnterCar(state) {
  const p = state.player;
  if (!p.onFoot) return false;
  const car = nearestCar(state, p.x, p.y, 78);
  if (!car) return false;
  p.onFoot = false;
  p.carId = car.id;
  car.player = true;
  car.parked = false;
  car.civilian = false;
  if (!car.stolen) {
    car.stolen = true;
    state.stats.steals += 1;
    addHeat(state, WANTED.stealHeat);
    setTicker(state, `BREAKING: ${car.special ? 'Pink Comet GT' : 'A car'} stolen live on Avenida del Sol — viewers are pouring in`);
    burst(state, car.x, car.y, '#ffd94d', 10, 160);
  }
  p.angle = car.angle;
  return true;
}

/** Step out of the car (E) onto the roadside. */
export function exitCar(state) {
  const p = state.player;
  const car = playerCar(state);
  if (p.onFoot || !car) return false;
  p.onFoot = true;
  p.carId = null;
  car.player = false;
  car.speed = 0;
  const side = car.angle + Math.PI / 2;
  const pos = resolveCircle(state, car.x + Math.cos(side) * 46, car.y + Math.sin(side) * 46, PLAYER.radius);
  p.x = pos.x;
  p.y = pos.y;
  p.angle = car.angle;
  p.speed = 0;
  return true;
}

/** Add wanted heat; stars and the viewer count follow from it. */
export function addHeat(state, amount) {
  state.wanted.heat = Math.min(520, state.wanted.heat + amount);
}

/** One step for the player, on foot or behind the wheel. */
export function stepPlayer(state, dt, input, actions) {
  const p = state.player;
  const mx = input.moveX();
  const my = input.moveY();
  p.moving = mx !== 0 || my !== 0;
  if (p.onFoot) {
    const len = Math.hypot(mx, my) || 1;
    const vx = (mx / len) * PLAYER.walkSpeed;
    const vy = (my / len) * PLAYER.walkSpeed;
    if (p.moving) p.angle = Math.atan2(vy, vx);
    const pos = resolveCircle(state, p.x + vx * dt, p.y + vy * dt, PLAYER.radius);
    p.x = pos.x;
    p.y = pos.y;
    p.speed = p.moving ? PLAYER.walkSpeed : 0;
    if (p.punchT > 0) p.punchT -= dt;
  } else {
    stepPlayerCar(state, dt, mx, my, actions);
  }
}

function stepPlayerCar(state, dt, mx, my, actions) {
  const p = state.player;
  const car = playerCar(state);
  if (!car) {
    p.onFoot = true;
    return;
  }
  // Space is a one-shot nitro pulse behind the wheel (a punch on foot).
  const boostPulse = (actions & 8) !== 0 && p.boost > 20;
  const throttle = my < 0 ? 1 : my > 0 ? -0.55 : 0;
  const maxSpeed = CAR.maxSpeed;
  if (throttle > 0) car.speed += CAR.accel * dt;
  else if (throttle < 0) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * 260 * dt;
  if (boostPulse) {
    car.speed = Math.min(maxSpeed * 1.4, car.speed + 230);
    p.boost = Math.max(0, p.boost - 30);
    burst(state, car.x, car.y, '#19c2d8', 8, 200);
  } else {
    p.boost = Math.min(CAR.boostMax, p.boost + CAR.boostRegen * dt);
  }
  car.speed = clamp(car.speed, -CAR.reverseMax, maxSpeed);
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  const steer = mx * CAR.turn * clamp(Math.abs(car.speed) / 220, 0, 1) * (car.speed >= 0 ? 1 : -1);
  car.angle += steer * dt;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const pos = resolveCircle(state, nx, ny, CAR.radius);
  if (pos.x !== nx || pos.y !== ny) {
    // Bumped a building: lose speed and throw sparks.
    if (Math.abs(car.speed) > 120) burst(state, nx, ny, '#ffd94d', 6, 140);
    car.speed *= 0.45;
  }
  car.x = pos.x;
  car.y = pos.y;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = Math.abs(car.speed);
  // Speeding past the law while already hot adds heat.
  if (Math.abs(car.speed) > 430 && state.wanted.stars >= 1) {
    state.wanted.heat = Math.min(520, state.wanted.heat + WANTED.speedHeat * dt);
  }
}

/** Keep two cars from overlapping: a soft push apart, for traffic bumps. */
export function separateCars(state) {
  const cars = state.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      const min = 44;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        if (!a.parked) {
          a.x -= ux * push;
          a.y -= uy * push;
        }
        if (!b.parked) {
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  }
}

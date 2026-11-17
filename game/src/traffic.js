// Traffic and pedestrians: civilian cars that drive the road grid and
// people who walk the sidewalks. At 4 stars and up, bystanders near the
// player raise their phones and film — the city itself becomes the audience.

import { ROAD_W, ROAD_X, ROAD_Y, WORLD } from './config.js';
import { angleDiff, angleTo, clamp, dist2, pickPedTarget } from './world.js';

/** One step for every civilian car: hold its lane, slow for the car ahead. */
export function stepTrafficCars(state, dt) {
  for (const car of state.cars) {
    if (car.parked || car.player) continue;
    // A car ahead on the same road slows this one down.
    let targetSpeed = car.speed;
    for (const other of state.cars) {
      if (other === car || other.parked) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = car.axis === 'v' ? dy * car.dir : dx * car.dir;
      const side = car.axis === 'v' ? Math.abs(dx) : Math.abs(dy);
      if (ahead > 0 && ahead < 90 && side < 40) targetSpeed = Math.min(targetSpeed, 40);
    }
    const speed = targetSpeed;
    car.x += Math.cos(car.angle) * speed * dt;
    car.y += Math.sin(car.angle) * speed * dt;
    // Reached the end of the road: turn onto a cross road and keep going.
    if (car.axis === 'v') {
      if ((car.dir > 0 && car.y > WORLD.height - 80) || (car.dir < 0 && car.y < 80)) {
        turnCar(state, car);
      }
    } else if ((car.dir > 0 && car.x > WORLD.width - 80) || (car.dir < 0 && car.x < 80)) {
      turnCar(state, car);
    }
  }
}

function turnCar(state, car) {
  const rng = state.rng;
  const cross = car.axis === 'v' ? ROAD_Y : ROAD_X;
  const at = cross[Math.floor(rng() * cross.length)];
  const lane = rng() < 0.5 ? -35 : 35;
  const dir = rng() < 0.5 ? 1 : -1;
  if (car.axis === 'v') {
    car.axis = 'h';
    car.y = at + lane;
    car.x = clamp(car.x, 100, WORLD.width - 100);
    car.dir = dir;
    car.angle = dir > 0 ? 0 : Math.PI;
  } else {
    car.axis = 'v';
    car.x = at + lane;
    car.y = clamp(car.y, 100, WORLD.height - 100);
    car.dir = dir;
    car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

/** One step for every pedestrian: walk to the target, then pick a new one. */
export function stepPedestrians(state, dt) {
  const p = state.player;
  const px = p.onFoot ? p.x : (state.cars.find((c) => c.id === p.carId)?.x ?? p.x);
  const py = p.onFoot ? p.y : (state.cars.find((c) => c.id === p.carId)?.y ?? p.y);
  const filming = state.wanted.stars >= 4;
  for (const ped of state.peds) {
    const near = dist2(ped.x, ped.y, px, py) < 260 * 260;
    if (filming && near) {
      // Stop, face the star of the show, raise the phone.
      ped.recording = true;
      ped.phoneUp = true;
      ped.angle += angleDiff(ped.angle, angleTo(ped.x, ped.y, px, py)) * Math.min(1, dt * 6);
      ped.recT += dt;
      continue;
    }
    ped.recording = false;
    ped.phoneUp = false;
    const d = dist2(ped.x, ped.y, ped.tx, ped.ty);
    if (d < 30 * 30) {
      pickPedTarget(state, ped);
    } else {
      const want = angleTo(ped.x, ped.y, ped.tx, ped.ty);
      ped.angle += angleDiff(ped.angle, want) * Math.min(1, dt * 4);
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      // Stay on the sidewalk strip beside a road, not in the buildings.
      ped.x = clamp(ped.x, 60, WORLD.width - 60);
      ped.y = clamp(ped.y, 60, WORLD.height - 60);
    }
  }
}

/** How many bystanders are filming the player right now (for the HUD). */
export function filmingCount(state) {
  let n = 0;
  for (const ped of state.peds) if (ped.recording) n += 1;
  return n;
}

// Traffic and pedestrians: civilian cars that drive the road grid and people
// who walk the sidewalks. At high wanted levels some pedestrians stop, raise
// their phones and record the player — the city itself becomes the audience.
import {
  CAR_LENGTH,
  HORIZONTAL_ROADS,
  PALETTE,
  ROAD_WIDTH,
  VERTICAL_ROADS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clamp,
  pick,
} from './config.js';
import { isOnSidewalk, nearestHorizontalRoad, nearestVerticalRoad } from './world.js';

const CIVIL_COUNT = 14;
const PED_COUNT = 26;
const TRAFFIC_SPEED = 130;

/** Spawn one civilian car on a random road, driving its lane. */
export function spawnCivilianCar(state) {
  const { rng, world } = state;
  const vertical = rng() < 0.5;
  const road = vertical
    ? pick(rng, VERTICAL_ROADS)
    : pick(rng, HORIZONTAL_ROADS);
  const lane = (rng() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 4);
  const dir = rng() < 0.5 ? 1 : -1;
  const car = {
    kind: 'civil',
    x: vertical ? road + lane : 100 + rng() * (WORLD_WIDTH - 200),
    y: vertical ? 100 + rng() * (WORLD_HEIGHT - 200) : road + lane,
    angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI,
    speed: TRAFFIC_SPEED * (0.8 + rng() * 0.4),
    cruise: TRAFFIC_SPEED * (0.8 + rng() * 0.4),
    color: pick(rng, PALETTE.civilCar),
    axis: vertical ? 'v' : 'h',
    road,
    dir,
    lane,
    hp: 100,
    stuck: 0,
  };
  if (vertical) car.y = clamp(car.y, 80, WORLD_HEIGHT - 80);
  else car.x = clamp(car.x, 80, WORLD_WIDTH - 200);
  state.cars.push(car);
  return car;
}

/** Spawn one pedestrian on a sidewalk near a random road. */
export function spawnPedestrian(state, nearX, nearY) {
  const { rng } = state;
  let x;
  let y;
  let tries = 0;
  do {
    if (nearX !== undefined && rng() < 0.7) {
      x = nearX + (rng() - 0.5) * 700;
      y = nearY + (rng() - 0.5) * 700;
    } else {
      x = 100 + rng() * (WORLD_WIDTH - 400);
      y = 100 + rng() * (WORLD_HEIGHT - 200);
    }
    tries += 1;
  } while (!isOnSidewalk(x, y) && tries < 12);
  if (!isOnSidewalk(x, y)) {
    x = nearestVerticalRoad(x) + ROAD_WIDTH / 2 + 14;
    y = nearestHorizontalRoad(y);
  }
  const ped = {
    x: clamp(x, 60, WORLD_WIDTH - 120),
    y: clamp(y, 60, WORLD_HEIGHT - 60),
    tx: 0,
    ty: 0,
    angle: rng() * Math.PI * 2,
    speed: 42 + rng() * 26,
    color: pick(rng, PALETTE.pedShirt),
    skin: ['#f2c89b', '#e8b07e', '#c98d5f', '#8a5a3b'][Math.floor(rng() * 4)],
    recording: false,
    flashT: 0,
    panic: 0,
    wait: 0,
  };
  pickNewTarget(state, ped);
  state.peds.push(ped);
  return ped;
}

/** Give a pedestrian a new sidewalk waypoint to walk to. */
function pickNewTarget(state, ped) {
  const { rng } = state;
  for (let tries = 0; tries < 10; tries += 1) {
    const x = 100 + rng() * (WORLD_WIDTH - 400);
    const y = 100 + rng() * (WORLD_HEIGHT - 200);
    if (isOnSidewalk(x, y)) {
      ped.tx = x;
      ped.ty = y;
      return;
    }
  }
  ped.tx = nearestVerticalRoad(ped.x) + ROAD_WIDTH / 2 + 14;
  ped.ty = ped.y;
}

/** Fill the city with its starting traffic and pedestrians. */
export function populateCity(state) {
  for (let i = 0; i < CIVIL_COUNT; i += 1) spawnCivilianCar(state);
  for (let i = 0; i < PED_COUNT; i += 1) spawnPedestrian(state);
}

/** Keep the streets busy: replace cars/peds that drifted too far away. */
export function maintainTraffic(state) {
  const { player } = state;
  let civils = 0;
  for (const car of state.cars) if (car.kind === 'civil') civils += 1;
  if (civils < CIVIL_COUNT - 2) spawnCivilianCar(state);
  if (state.peds.length < PED_COUNT - 4) spawnPedestrian(state, player.x, player.y);
}

/** Advance every civilian car and pedestrian one step. */
export function updateTraffic(state, dt) {
  const { player, world } = state;
  const wanted = player.stars;

  for (const car of state.cars) {
    if (car.kind !== 'civil') continue;
    // At intersections, sometimes turn onto the crossing road.
    const onV = VERTICAL_ROADS.some((rx) => Math.abs(car.x - rx) < 8);
    const onH = HORIZONTAL_ROADS.some((ry) => Math.abs(car.y - ry) < 8);
    if (onV && onH && state.rng() < dt * 0.35) {
      const vertical = state.rng() < 0.5;
      car.axis = vertical ? 'v' : 'h';
      car.road = vertical ? nearestVerticalRoad(car.x) : nearestHorizontalRoad(car.y);
      car.dir = state.rng() < 0.5 ? 1 : -1;
      car.lane = (state.rng() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 4);
    }
    // Slow down for a car ahead on the same road.
    let target = car.cruise;
    for (const other of state.cars) {
      if (other === car || other.kind === 'civil' && false) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = car.axis === 'v'
        ? Math.sign(dy) === car.dir && Math.abs(dx) < 60 && Math.abs(dy) < 90
        : Math.sign(dx) === car.dir && Math.abs(dy) < 60 && Math.abs(dx) < 90;
      if (ahead) target = 0;
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2);
    car.angle = car.axis === 'v'
      ? car.dir > 0 ? Math.PI / 2 : -Math.PI / 2
      : car.dir > 0 ? 0 : Math.PI;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (car.axis === 'v') {
      car.x = car.road + car.lane;
      if (car.y < 60 || car.y > WORLD_HEIGHT - 60) {
        car.dir *= -1;
        car.y = clamp(car.y, 60, WORLD_HEIGHT - 60);
      }
    } else {
      car.y = car.road + car.lane;
      if (car.x < 60 || car.x > WORLD_WIDTH - 140) {
        car.dir *= -1;
        car.x = clamp(car.x, 60, WORLD_WIDTH - 140);
      }
    }
    world.clampToWorld(car, 30);
  }

  for (const ped of state.peds) {
    ped.flashT = Math.max(0, ped.flashT - dt);
    // High wanted level: nearby pedestrians stop and film the player.
    const dPlayer = Math.hypot(ped.x - player.x, ped.y - player.y);
    const shouldRecord = wanted >= 4 && dPlayer < 420 && !ped.panic;
    if (shouldRecord && !ped.recording) {
      ped.recording = true;
      ped.flashT = 0.4 + state.rng() * 0.8;
    }
    if (wanted < 4) ped.recording = false;
    if (ped.recording) {
      ped.angle = Math.atan2(player.y - ped.y, player.x - ped.x);
      if (ped.flashT <= 0 && state.rng() < dt * 0.5) ped.flashT = 0.25;
      continue;
    }
    if (ped.panic > 0) {
      ped.panic -= dt;
      const away = Math.atan2(ped.y - player.y, ped.x - player.x);
      ped.x += Math.cos(away) * 120 * dt;
      ped.y += Math.sin(away) * 120 * dt;
      ped.angle = away;
      world.clampToWorld(ped, 40);
      continue;
    }
    if (ped.wait > 0) {
      ped.wait -= dt;
      continue;
    }
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) {
      ped.wait = 1 + state.rng() * 3;
      pickNewTarget(state, ped);
      continue;
    }
    ped.angle = Math.atan2(dy, dx);
    ped.x += (dx / d) * ped.speed * dt;
    ped.y += (dy / d) * ped.speed * dt;
  }
}

/** A pedestrian near a point, for punching / scaring. */
export function nearestPed(state, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const ped of state.peds) {
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < bestD) {
      bestD = d;
      best = ped;
    }
  }
  return best;
}

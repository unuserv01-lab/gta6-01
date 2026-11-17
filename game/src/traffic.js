// LIVE HEIST — traffic.js
// Civilian traffic and pedestrians. Cars drive the avenues and streets, turn at
// intersections and slow for the car ahead. Pedestrians stroll the sidewalks —
// and when the wanted level hits 4+, nearby ones stop, raise their phones and
// record the player (REC icon + camera flash).

import { AVENUES, STREETS, TILE, WORLD_H, WORLD_W, clamp, dist } from './config.js';
import { isBlockedAt, isRoadAt, randomRoadPoint, randomSidewalkPoint } from './world.js';

const CAR_COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#6d6875', '#457b9d', '#f7ede2', '#ff6b9d'];
const PED_COLORS = ['#ff9f43', '#38b6d3', '#ff6b9d', '#2ec4b6', '#ffd166', '#e63946', '#6d6875', '#f7ede2'];
const PED_NAMES = ['Rani', 'Dito', 'Sari', 'Bimo', 'Lala', 'Agus', 'Maya', 'Rizky', 'Nina', 'Fajar'];

function makeCar(world, rng, parked = false) {
  const p = randomRoadPoint(world, rng);
  const axis = p.axis;
  const dir = p.dir;
  const lane = axis === 'v' ? p.x : p.y;
  return {
    kind: rng() < 0.12 ? 'taxi' : rng() < 0.1 ? 'van' : 'sedan',
    color: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
    x: p.x,
    y: p.y,
    angle: axis === 'v' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI,
    axis,
    dir,
    road: p.road,
    lane,
    speed: parked ? 0 : 90 + rng() * 60,
    maxSpeed: 110 + rng() * 50,
    parked,
    flashT: 0,
  };
}

/** Lane centre (px) for a road index and driving direction. */
function laneFor(axis, road, dir) {
  if (axis === 'v') return (road + (dir > 0 ? 0.5 : 1.5)) * TILE;
  return (road + (dir > 0 ? 1.5 : 0.5)) * TILE;
}

function makePed(world, rng) {
  const p = randomSidewalkPoint(world, rng);
  return {
    x: p.x,
    y: p.y,
    tx: p.x,
    ty: p.y,
    speed: 42 + rng() * 30,
    color: PED_COLORS[Math.floor(rng() * PED_COLORS.length)],
    name: PED_NAMES[Math.floor(rng() * PED_NAMES.length)],
    recording: false,
    flashT: rng() * 2,
    angle: rng() * Math.PI * 2,
  };
}

/** Build the traffic population for a fresh city. */
export function createTraffic(world, rng) {
  const cars = [];
  for (let i = 0; i < 14; i++) cars.push(makeCar(world, rng));
  for (let i = 0; i < 3; i++) cars.push(makeCar(world, rng, true));
  const peds = [];
  for (let i = 0; i < 26; i++) peds.push(makePed(world, rng));
  return { cars, peds };
}

/** Is (x, y) near a road crossing (an intersection)? */
function nearIntersection(world, x, y) {
  for (const a of AVENUES) {
    for (const s of STREETS) {
      const cx = (a + 1) * TILE;
      const cy = (s + 1) * TILE;
      if (Math.abs(x - cx) < TILE * 0.7 && Math.abs(y - cy) < TILE * 0.7) return true;
    }
  }
  return false;
}

/** Slow down when another car (or the player car) is right ahead. */
function carAhead(state, car) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const all = [...state.traffic.cars];
  if (state.player.car) all.push(state.player.car);
  for (const other of all) {
    if (other === car || other.parked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(dx * -fy + dy * fx);
    if (along > 0 && along < 78 && side < 26) return true;
  }
  return false;
}

function stepCar(state, car, dt, rng) {
  if (car.parked) return;
  const target = carAhead(state, car) ? 0 : car.maxSpeed;
  car.speed += clamp(target - car.speed, -260 * dt, 150 * dt);
  // At an intersection, sometimes turn onto the crossing road (lane matches direction).
  if (nearIntersection(state.world, car.x, car.y) && rng() < 0.012) {
    if (car.axis === 'v') {
      const s = STREETS[Math.floor(rng() * STREETS.length)];
      car.axis = 'h';
      car.dir = rng() < 0.5 ? 1 : -1;
      car.angle = car.dir > 0 ? 0 : Math.PI;
      car.road = s;
      car.lane = laneFor('h', s, car.dir);
      car.y = car.lane;
    } else {
      const a = AVENUES[Math.floor(rng() * AVENUES.length)];
      car.axis = 'v';
      car.dir = rng() < 0.5 ? 1 : -1;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.road = a;
      car.lane = laneFor('v', a, car.dir);
      car.x = car.lane;
    }
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Stay on roads: if the step leaves the road, snap back to the lane.
  if (isRoadAt(state.world, nx, ny)) {
    car.x = nx;
    car.y = ny;
  } else if (car.axis === 'v') {
    car.x = car.lane;
    car.y = ny;
  } else {
    car.y = car.lane;
    car.x = nx;
  }
  car.x = clamp(car.x, 20, WORLD_W - 20);
  car.y = clamp(car.y, 20, WORLD_H - 20);
  // At the end of a road, U-turn instead of piling up at the map edge.
  const atEdge =
    (car.axis === 'v' && ((car.dir < 0 && car.y <= 28) || (car.dir > 0 && car.y >= 27 * TILE))) ||
    (car.axis === 'h' && ((car.dir < 0 && car.x <= 28) || (car.dir > 0 && car.x >= WORLD_W - 28)));
  if (atEdge) {
    car.dir *= -1;
    car.angle += Math.PI;
    car.lane = laneFor(car.axis, car.road, car.dir);
    if (car.axis === 'v') car.x = car.lane;
    else car.y = car.lane;
  }
}

function stepPed(state, ped, dt, rng) {
  const stars = state.police.stars;
  const dPlayer = dist(ped.x, ped.y, state.player.x, state.player.y);
  // High wanted: nearby pedestrians stop and record the player.
  if (stars >= 4 && dPlayer < 420 && rng() < 0.02) ped.recording = true;
  if (ped.recording) {
    if (stars < 4 || dPlayer > 560) ped.recording = false;
    else {
      ped.angle = Math.atan2(state.player.y - ped.y, state.player.x - ped.x);
      ped.flashT -= dt;
      if (ped.flashT <= 0) {
        ped.flashT = 0.9 + rng() * 1.6;
        state.particles.push({ x: ped.x, y: ped.y - 18, vx: 0, vy: -12, life: 0.25, maxLife: 0.25, size: 14, color: '#ffffff', kind: 'flash' });
      }
      return;
    }
  }
  const d = dist(ped.x, ped.y, ped.tx, ped.ty);
  if (d < 12) {
    const p = randomSidewalkPoint(state.world, rng);
    ped.tx = clamp(p.x, 20, WORLD_W - 20);
    ped.ty = clamp(p.y, 20, WORLD_H - 20);
    return;
  }
  const a = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
  ped.angle = a;
  const nx = ped.x + Math.cos(a) * ped.speed * dt;
  const ny = ped.y + Math.sin(a) * ped.speed * dt;
  if (!isBlockedAt(state.world, nx, ny, 10)) {
    ped.x = nx;
    ped.y = ny;
  } else {
    ped.tx = ped.x;
    ped.ty = ped.y;
  }
}

/** Advance traffic and pedestrians one step. */
export function stepTraffic(state, dt) {
  const rng = state.rng;
  for (const car of state.traffic.cars) stepCar(state, car, dt, rng);
  for (const ped of state.traffic.peds) stepPed(state, ped, dt, rng);
}

/** Draw a car top-down: body, windshield, roof, wheels, headlights. */
export function drawCarShape(ctx, x, y, angle, color, kind, lightBar = false, time = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const len = kind === 'van' ? 76 : 62;
  const wid = kind === 'van' ? 34 : 30;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-len / 2 + 4, -wid / 2 + 5, len, wid);
  ctx.fillStyle = '#111';
  ctx.fillRect(-len / 2 + 6, -wid / 2 - 3, 12, 6);
  ctx.fillRect(-len / 2 + 6, wid / 2 - 3, 12, 6);
  ctx.fillRect(len / 2 - 18, -wid / 2 - 3, 12, 6);
  ctx.fillRect(len / 2 - 18, wid / 2 - 3, 12, 6);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 30, 50, 0.85)';
  ctx.fillRect(-8, -wid / 2 + 4, 16, wid - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(len / 2 - 14, -wid / 2 + 4, 8, wid - 8);
  if (kind === 'taxi') {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 3, 3, 5);
  ctx.fillRect(len / 2 - 2, wid / 2 - 8, 3, 5);
  if (lightBar) {
    const on = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff2d2d' : '#2d7bff';
    ctx.fillRect(-6, -wid / 2 + 2, 12, 5);
    ctx.fillStyle = on ? '#2d7bff' : '#ff2d2d';
    ctx.fillRect(-6, wid / 2 - 7, 12, 5);
  }
  ctx.restore();
}

/** Draw all traffic cars and pedestrians. */
export function drawTraffic(ctx, state) {
  for (const car of state.traffic.cars) {
    drawCarShape(ctx, car.x, car.y, car.angle, car.color, car.kind);
  }
  for (const ped of state.traffic.peds) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    // Shadow + body + head.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3, 5.5, 0, Math.PI * 2);
    ctx.fill();
    if (ped.recording) {
      // Phone raised + REC icon above the head.
      ctx.rotate(ped.angle);
      ctx.fillStyle = '#111';
      ctx.fillRect(8, -9, 12, 6);
      ctx.rotate(-ped.angle);
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(0, -20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('REC', 0, -27);
    }
    ctx.restore();
  }
}

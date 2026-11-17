// Costa Vidrio: the city itself. Builds the road grid, the blocks between
// the roads, the buildings, shops, alleys and garages, and holds the whole
// simulation state. Every other module reads or steps this one state object.
// A "safe zone" (alley or garage) is where the live broadcast is cut:
// standing in one drops the wanted heat, which the HUD shows as SIGNAL LOST.

import { CAR, PALETTE, PLAYER, POLICE, ROAD_W, ROAD_X, ROAD_Y, STEP, TICKER_LINES, WANTED, WORLD } from './config.js';

/** Small deterministic generator: the same seed always builds the same city. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Is this point on a road (including the sidewalk strip beside it)? */
export function onRoad(x, y) {
  const half = ROAD_W / 2;
  for (const rx of ROAD_X) if (Math.abs(x - rx) <= half) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) <= half) return true;
  return false;
}

/** The nearest road centre line, for traffic that has to stay on the grid. */
export function nearestRoad(x, y) {
  let best = { axis: 'v', at: ROAD_X[0], d: Infinity };
  for (const rx of ROAD_X) {
    const d = Math.abs(x - rx);
    if (d < best.d) best = { axis: 'v', at: rx, d };
  }
  for (const ry of ROAD_Y) {
    const d = Math.abs(y - ry);
    if (d < best.d) best = { axis: 'h', at: ry, d };
  }
  return best;
}

function buildCity(rng) {
  const buildings = [];
  const shops = [];
  const palms = [];
  // Blocks are the rectangles between neighbouring roads: the bounds list
  // holds each road's near and far edge, so block i spans bounds[2i]..bounds[2i+1].
  const xBounds = [0, ...ROAD_X.flatMap((x) => [x - ROAD_W / 2, x + ROAD_W / 2]), WORLD.width];
  const yBounds = [0, ...ROAD_Y.flatMap((y) => [y - ROAD_W / 2, y + ROAD_W / 2]), WORLD.height];
  for (let bx = 0; bx < xBounds.length / 2; bx += 1) {
    for (let by = 0; by < yBounds.length / 2; by += 1) {
      const x0 = xBounds[bx * 2] + 14;
      const y0 = yBounds[by * 2] + 14;
      const x1 = xBounds[bx * 2 + 1] - 14;
      const y1 = yBounds[by * 2 + 1] - 14;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 60 || h < 60) continue;
      // The beach strip on the east edge stays open sand, no buildings.
      if (x0 > 2900) continue;
      const count = w > 200 && h > 160 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const bw = 60 + rng() * Math.max(40, w / count - 80);
        const bh = 60 + rng() * Math.max(40, h - 80);
        const px = x0 + (count === 1 ? (w - bw) / 2 : i * (w / count) + 10 + rng() * 20);
        const py = y0 + (h - bh) / 2 + (rng() - 0.5) * 20;
        buildings.push({
          x: px,
          y: py,
          w: bw,
          h: bh,
          color: PALETTE.building[Math.floor(rng() * PALETTE.building.length)],
          roof: rng() < 0.5,
        });
      }
      if (rng() < 0.55) {
        palms.push({ x: x0 + 20 + rng() * (w - 40), y: y0 + 20 + rng() * (h - 40), s: 0.8 + rng() * 0.5 });
      }
    }
  }
  // Named shopfronts along the sunny main avenue (Avenida del Sol, y = 1000).
  const shopNames = ['TACO VIDA', 'SURF SHOP', 'NEON DONUTS', 'VIDRIO TV', 'HOTEL PALMA', 'CAFÉ SOL'];
  for (let i = 0; i < shopNames.length; i += 1) {
    shops.push({ x: 480 + i * 380, y: 1090, w: 150, h: 54, name: shopNames[i], color: PALETTE.building[i % PALETTE.building.length] });
  }
  // Alleys: narrow cuts through blocks where the broadcast drops.
  const alleys = [
    { x: 1450, y: 470, w: 44, h: 460, name: 'GANG MATAHARI' },
    { x: 2050, y: 1070, w: 44, h: 460, name: 'GANG SIARAN' },
    { x: 850, y: 1670, w: 44, h: 330, name: 'GANG SENJA' },
  ];
  // Garages: drive or walk in to cut the broadcast ("putus siaran").
  const garages = [
    { x: 560, y: 560, w: 190, h: 130, name: 'GARASI RICO' },
    { x: 2360, y: 560, w: 190, h: 130, name: 'GARASI LUNA' },
  ];
  return { buildings, shops, palms, alleys, garages };
}

/** A parked civilian car the player can steal, placed beside a road. */
function makeParkedCar(rng, x, y, angle, color, special) {
  return {
    id: 0, x, y, angle, speed: 0, color, civilian: true, parked: true, player: false,
    hp: 100, special: special ?? null, honkT: 0,
  };
}

/** Create a fresh simulation state for one seed. */
export function createWorld(seed) {
  const rng = mulberry32(seed);
  const city = buildCity(rng);
  const state = {
    seed,
    rng,
    time: 0,
    screen: 'title',
    shot: null,
    player: {
      x: 1000, y: 930, angle: -Math.PI / 2, speed: 0, onFoot: true, carId: null,
      hp: PLAYER.hp, punchT: 0, punchHit: false, boost: CAR.boostMax, bustedT: 0, moving: false,
    },
    camera: { x: 1000, y: 930 },
    cars: [],
    peds: [],
    police: [],
    heli: { x: 1000, y: 700, active: false, angle: 0, rotor: 0 },
    roadblocks: [],
    effects: [],
    floaters: [],
    wanted: { stars: 0, heat: 0, viewers: WANTED.baseViewers, signalLost: 0, lostFlash: 0 },
    mission: { id: 0, stage: 0, done: false, completeT: 0, marker: null, markerText: '', lootT: 0 },
    progress: { cash: 0, followers: WANTED.baseViewers, episode: 0, sponsor: '', bestViewers: WANTED.baseViewers },
    ticker: { text: TICKER_LINES[0], offset: 0, flash: '' },
    stats: { steals: 0, punches: 0, chases: 0, episodesDone: 0 },
    buildings: city.buildings,
    shops: city.shops,
    palms: city.palms,
    alleys: city.alleys,
    garages: city.garages,
    events: 0,
    muted: false,
  };
  resetWorld(state);
  return state;
}

/** Put the player, traffic, pedestrians and parked cars back at their starts. */
export function resetWorld(state) {
  const rng = state.rng;
  state.time = 0;
  state.player.x = 1000;
  state.player.y = 930;
  state.player.angle = -Math.PI / 2;
  state.player.speed = 0;
  state.player.onFoot = true;
  state.player.carId = null;
  state.player.hp = PLAYER.hp;
  state.player.punchT = 0;
  state.player.boost = CAR.boostMax;
  state.player.bustedT = 0;
  state.camera.x = 1000;
  state.camera.y = 930;
  state.cars = [];
  state.peds = [];
  state.police = [];
  state.roadblocks = [];
  state.effects = [];
  state.floaters = [];
  state.heli.active = false;
  state.wanted.stars = 0;
  state.wanted.heat = 0;
  state.wanted.viewers = WANTED.baseViewers;
  state.wanted.signalLost = 0;
  state.wanted.lostFlash = 0;
  state.mission.id = 0;
  state.mission.stage = 0;
  state.mission.done = false;
  state.mission.completeT = 0;
  state.mission.marker = null;
  state.mission.markerText = '';
  state.events = 0;
  let id = 1;
  // Parked cars along the avenues, including the pink Comet GT (episode 2).
  const parked = [
    makeParkedCar(rng, 1075, 700, Math.PI / 2, '#ff5fa2', 'COMET GT'),
    makeParkedCar(rng, 925, 1300, -Math.PI / 2, '#19c2d8'),
    makeParkedCar(rng, 1675, 700, Math.PI / 2, '#ffb347'),
    makeParkedCar(rng, 2275, 1300, -Math.PI / 2, '#f2e394'),
    makeParkedCar(rng, 475, 1700, 0, '#7dd069'),
    makeParkedCar(rng, 2875, 700, Math.PI, '#8e7cf3'),
  ];
  for (const car of parked) {
    car.id = id;
    id += 1;
    state.cars.push(car);
  }
  // Moving traffic on the roads.
  for (let i = 0; i < 10; i += 1) {
    const vertical = rng() < 0.5;
    const road = vertical ? ROAD_X[Math.floor(rng() * ROAD_X.length)] : ROAD_Y[Math.floor(rng() * ROAD_Y.length)];
    const along = 100 + rng() * 2200;
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = (rng() < 0.5 ? -35 : 35);
    const car = {
      id,
      x: vertical ? road + lane : along,
      y: vertical ? along : road + lane,
      angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      speed: 130 + rng() * 90,
      color: PALETTE.car[Math.floor(rng() * PALETTE.car.length)],
      civilian: true, parked: false, player: false, hp: 100, special: null, honkT: 0,
      axis: vertical ? 'v' : 'h', dir, road,
    };
    id += 1;
    state.cars.push(car);
  }
  // Pedestrians on the sidewalks.
  for (let i = 0; i < 16; i += 1) {
    const road = ROAD_X[Math.floor(rng() * ROAD_X.length)];
    state.peds.push({
      x: road + (rng() < 0.5 ? -95 : 95),
      y: 150 + rng() * 2100,
      angle: rng() * Math.PI * 2,
      speed: 34 + rng() * 26,
      tx: 0, ty: 0,
      color: PALETTE.ped[Math.floor(rng() * PALETTE.ped.length)],
      recording: false, recT: 0, phoneUp: false,
    });
    const ped = state.peds[state.peds.length - 1];
    pickPedTarget(state, ped);
  }
  state.nextCarId = id;
}

/** A new random sidewalk destination for a pedestrian. */
export function pickPedTarget(state, ped) {
  const road = ROAD_X[Math.floor(state.rng() * ROAD_X.length)];
  ped.tx = road + (state.rng() < 0.5 ? -95 : 95);
  ped.ty = 150 + state.rng() * 2100;
  ped.angle = angleTo(ped.x, ped.y, ped.tx, ped.ty);
}

/** The building at this point, or null. */
export function buildingAt(state, x, y) {
  for (const b of state.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  for (const s of state.shops) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}

/** Push a circle out of every building and shop it overlaps; returns the fixed position. */
export function resolveCircle(state, x, y, r) {
  for (const b of [...state.buildings, ...state.shops]) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      } else {
        // Dead centre: push out through the nearest side.
        const left = x - b.x;
        const right = b.x + b.w - x;
        const top = y - b.y;
        const bottom = b.y + b.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = b.x - r;
        else if (m === right) x = b.x + b.w + r;
        else if (m === top) y = b.y - r;
        else y = b.y + b.h + r;
      }
    }
  }
  x = clamp(x, 20, WORLD.width - 20);
  y = clamp(y, 20, WORLD.height - 20);
  return { x, y };
}

/** True when the point is inside an alley or a garage: the broadcast is cut here. */
export function inSafeZone(state, x, y) {
  for (const a of state.alleys) {
    if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return a;
  }
  for (const g of state.garages) {
    if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) return g;
  }
  return null;
}

/** The nearest parked or traffic car within `radius` of a point. */
export function nearestCar(state, x, y, radius) {
  let best = null;
  let bestD = radius * radius;
  for (const car of state.cars) {
    if (car.player) continue;
    const d = dist2(x, y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/** The player's car, if the player is driving one. */
export function playerCar(state) {
  if (!state.player.onFoot && state.player.carId !== null) {
    return state.cars.find((c) => c.id === state.player.carId) ?? null;
  }
  return null;
}

export function addEffect(state, x, y, vx, vy, life, color, size) {
  state.effects.push({ x, y, vx, vy, life, maxLife: life, color, size });
  if (state.effects.length > 220) state.effects.splice(0, state.effects.length - 220);
}

export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color: color ?? '#fff7e6', life: 1.4 });
  if (state.floaters.length > 24) state.floaters.shift();
}

export function setTicker(state, text) {
  state.ticker.text = text;
  state.ticker.offset = 0;
  state.ticker.flash = text;
}

export function burst(state, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = state.rng() * Math.PI * 2;
    const s = speed * (0.4 + state.rng() * 0.8);
    addEffect(state, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4 + state.rng() * 0.4, color, 3 + state.rng() * 4);
  }
}

/** Advance the shared timers: effects, floaters, ticker scroll, camera. */
export function stepWorld(state, dt) {
  state.time += dt;
  const p = state.player;
  const car = playerCar(state);
  const px = car ? car.x : p.x;
  const py = car ? car.y : p.y;
  // Camera eases toward the player and stays inside the city.
  const tx = clamp(px - 640, 0, WORLD.width - 1280);
  const ty = clamp(py - 360, 0, WORLD.height - 720);
  state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);
  for (let i = state.effects.length - 1; i >= 0; i -= 1) {
    const e = state.effects[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vx *= 0.96;
    e.vy *= 0.96;
    e.life -= dt;
    if (e.life <= 0) state.effects.splice(i, 1);
  }
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y -= 34 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
  state.ticker.offset += dt * 90;
  const textWidth = state.ticker.text.length * 9 + 1400;
  if (state.ticker.offset > textWidth) state.ticker.offset = -40;
  if (state.wanted.lostFlash > 0) state.wanted.lostFlash -= dt;
  state.heli.rotor += dt * 22;
}

export { angleTo, angleDiff, STEP };

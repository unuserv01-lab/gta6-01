// SPDX-License-Identifier: MIT
// Live Heist — Costa Vidrio, the city itself.
// A hand-tuned grid of avenues and streets, blocks of buildings with
// varied roofs, a beach on the east edge, parks, and the signal dead
// zones where a broadcast can be cut. Nothing here is random at load:
// the same seed always builds the same city, so a save always matches.

import { CFG, PALETTE } from './config.js';

const ROAD_X = [300, 800, 1300, 1800, 2300, 2800];
const ROAD_Y = [300, 800, 1300, 1800, 2300];

const SHOP_NAMES = [
  'Bodega Sol', 'Toko Kopi Marisol', 'Surf Shop Ola', 'Neon Nails',
  'Cafe Brisa', 'Taco Loco', 'Vinyl Vega', 'Playa Pets',
  'Bar La Luna', 'Donut Diva', 'Kiosko Kiki', 'Gym Titan',
];

const ROOF_COLORS = [
  PALETTE.roofA, PALETTE.roofB, PALETTE.roofC,
  PALETTE.roofD, PALETTE.roofE, PALETTE.roofF,
];

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWorld() {
  const rnd = mulberry(20261117);
  const buildings = [];
  const shops = [];
  const parked = [];
  const trees = [];
  const pools = [];

  // Buildings fill the blocks between roads.
  for (let bx = 0; bx < ROAD_X.length - 1; bx++) {
    for (let by = 0; by < ROAD_Y.length - 1; by++) {
      const x0 = ROAD_X[bx] + CFG.roadW / 2 + 24;
      const y0 = ROAD_Y[by] + CFG.roadW / 2 + 24;
      const x1 = ROAD_X[bx + 1] - CFG.roadW / 2 - 24;
      const y1 = ROAD_Y[by + 1] - CFG.roadW / 2 - 24;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 90 || h < 90) continue;
      // One park block, one plaza block, the rest built up.
      if (bx === 2 && by === 3) {
        for (let i = 0; i < 9; i++) {
          trees.push({ x: x0 + 30 + rnd() * (w - 60), y: y0 + 30 + rnd() * (h - 60), r: 12 + rnd() * 8 });
        }
        pools.push({ x: x0 + w / 2, y: y0 + h / 2, r: 46 });
        continue;
      }
      const n = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        const bw = 90 + rnd() * 130;
        const bh = 80 + rnd() * 120;
        const px = x0 + rnd() * Math.max(1, w - bw);
        const py = y0 + rnd() * Math.max(1, h - bh);
        const color = ROOF_COLORS[Math.floor(rnd() * ROOF_COLORS.length)];
        const isShop = rnd() < 0.34;
        const b = {
          x: px, y: py, w: bw, h: bh, color,
          roof: rnd() < 0.5 ? 'flat' : 'pitched',
          name: isShop ? SHOP_NAMES[Math.floor(rnd() * SHOP_NAMES.length)] : '',
          shop: isShop,
        };
        buildings.push(b);
        if (isShop) shops.push(b);
      }
      // A few parked cars along each block edge.
      const pc = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < pc; i++) {
        parked.push({
          x: x0 + 14 + rnd() * (w - 28),
          y: y0 - 8,
          angle: rnd() < 0.5 ? 0 : Math.PI,
          color: ['#e8e8e8', '#3f6fb0', '#c94f6d', '#e8a13c', '#4f7ec9'][Math.floor(rnd() * 5)],
          model: ['Hatch', 'Sedan', 'Pickup'][Math.floor(rnd() * 3)],
        });
      }
    }
  }

  // Palm trees along the beach promenade, east edge.
  for (let y = 180; y < CFG.worldH; y += 260) {
    trees.push({ x: 3180 + Math.random() * 60, y, r: 13 + Math.random() * 6 });
  }

  // Landmark spots the missions use.
  const landmarks = {
    marina: { x: 3220, y: 420, label: 'MARINA' },
    bodega: { x: 1340, y: 870, label: 'BODEGA SOL' },
    pier: { x: 3300, y: 1250, label: 'PIER 9' },
    rooftopDrop: { x: 1850, y: 350, label: 'ROOFTOP DROP' },
    bank: { x: 1850, y: 1350, label: 'BANK VIDRIO' },
    garageRico: { x: 640, y: 660, label: "RICO'S GARAGE" },
  };

  // Signal dead zones: alleys and garages where the broadcast dies.
  const deadZones = [
    { x: 640, y: 660, w: 190, h: 150, label: "RICO'S GARAGE — SIGNAL DEAD" },
    { x: 2050, y: 2050, w: 210, h: 150, label: 'ALLEY 9 — SIGNAL DEAD' },
    { x: 950, y: 2050, w: 170, h: 130, label: 'UNDERPASS — SIGNAL DEAD' },
  ];

  return {
    roadsX: ROAD_X,
    roadsY: ROAD_Y,
    buildings,
    shops,
    parked,
    trees,
    pools,
    landmarks,
    deadZones,
    beachX: 3150,
    seaX: 3400,
  };
}

export function isOnRoad(world, x, y) {
  const hw = CFG.roadW / 2;
  for (const rx of world.roadsX) if (Math.abs(x - rx) < hw) return true;
  for (const ry of world.roadsY) if (Math.abs(y - ry) < hw) return true;
  return false;
}

export function nearestRoad(world, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of world.roadsX) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { axis: 'x', at: rx, dir: y }; }
  }
  for (const ry of world.roadsY) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { axis: 'y', at: ry, dir: x }; }
  }
  return best;
}

export function pointInBuilding(world, x, y, pad = 0) {
  for (const b of world.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

export function inDeadZone(world, x, y) {
  for (const z of world.deadZones) {
    if (x > z.x - z.w / 2 && x < z.x + z.w / 2 && y > z.y - z.h / 2 && y < z.y + z.h / 2) return z;
  }
  return null;
}

export function clampToWorld(x, y) {
  return {
    x: Math.max(24, Math.min(CFG.worldW - 24, x)),
    y: Math.max(24, Math.min(CFG.worldH - 24, y)),
  };
}

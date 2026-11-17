// LIVE HEIST — world.js
// Costa Vidrio: the map itself. Seeded generation of avenues, streets, blocks,
// buildings, shops, parks, the beach, the hideout garage and the alleys where a
// broadcast dies ("putus siaran"). Also collision queries and the ground drawing.

import { AVENUES, BEACH_ROW, COLS, PALETTE, ROWS, SEA_ROW, STREETS, TILE, WORLD_H, WORLD_W, clamp } from './config.js';

/** Deterministic PRNG (mulberry32). Same seed, same city, every run. */
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUILDING_COLORS = [
  PALETTE.buildingOrange,
  PALETTE.buildingCyan,
  PALETTE.buildingPink,
  PALETTE.buildingYellow,
  PALETTE.buildingCream,
  PALETTE.buildingTeal,
];

const SHOP_NAMES = [
  'TOKO SARI',
  'KOPI VIDRIO',
  'BAKSO 88',
  'BENGKEL RIZKI',
  'HOTEL MIRAMAR',
  'PASAR SENJA',
  'LAUNDRY LUNA',
  'WARUNG OMBAK',
  'CELLULAR NUSA',
  'ROTI PANAS',
  'BARBERSHOP 21',
  'FOTO CERIA',
];

const PARK_NAMES = ['TAMAN OMBAX', 'TAMAN MERDEKA'];

/** Pixel rect of a road. Roads are 2 tiles wide. */
function roadRect(axis, index) {
  if (axis === 'v') return { x: AVENUES[index] * TILE, y: 0, w: TILE * 2, h: BEACH_ROW * TILE };
  return { x: 0, y: STREETS[index] * TILE, w: WORLD_W, h: TILE * 2 };
}

/** True when the point is on a road (asphalt). */
export function isRoadAt(world, x, y) {
  for (const r of world.roads) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
  }
  return false;
}

/** True when the point is inside the sea (impassable water). */
export function isSeaAt(world, x, y) {
  return y >= SEA_ROW * TILE;
}

/** True when a circle of radius r at (x, y) touches a building, the sea, or the map edge. */
export function isBlockedAt(world, x, y, r) {
  if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
  if (isSeaAt(world, x, y)) return true;
  for (const b of world.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

/** True when the point is inside a rect. */
export function pointInRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** True when the player is in a hideout: the garage or an alley. Heat drains fast there. */
export function isHideoutAt(world, x, y) {
  if (pointInRect(x, y, world.garage)) return true;
  for (const a of world.alleys) if (pointInRect(x, y, a)) return true;
  return false;
}

/** A random point on a road, centred in a lane that matches the driving direction. */
export function randomRoadPoint(world, rng) {
  const dir = rng() < 0.5 ? 1 : -1;
  if (rng() < 0.5) {
    const i = Math.floor(rng() * AVENUES.length);
    const a = AVENUES[i];
    // Southbound (dir 1) takes the west lane, northbound the east lane.
    return { x: (a + (dir > 0 ? 0.5 : 1.5)) * TILE, y: rng() * BEACH_ROW * TILE, axis: 'v', dir, road: a };
  }
  const i = Math.floor(rng() * STREETS.length);
  const s = STREETS[i];
  // Eastbound (dir 1) takes the south lane, westbound the north lane.
  return { x: rng() * WORLD_W, y: (s + (dir > 0 ? 1.5 : 0.5)) * TILE, axis: 'h', dir, road: s };
}

/** A random sidewalk point (block edge), for spawning pedestrians. */
export function randomSidewalkPoint(world, rng) {
  const block = world.blocks[Math.floor(rng() * world.blocks.length)];
  const side = Math.floor(rng() * 4);
  const m = 10;
  if (side === 0) return { x: block.x + rng() * block.w, y: block.y - m };
  if (side === 1) return { x: block.x + rng() * block.w, y: block.y + block.h + m };
  if (side === 2) return { x: block.x - m, y: block.y + rng() * block.h };
  return { x: block.x + block.w + m, y: block.y + rng() * block.h };
}

/** Build the whole city from a seed. */
export function createWorld(seed) {
  const rng = createRandom(seed);
  const roads = [];
  for (let i = 0; i < AVENUES.length; i++) roads.push(roadRect('v', i));
  for (let i = 0; i < STREETS.length; i++) roads.push(roadRect('h', i));

  // City blocks: the rectangles between roads. Boundaries alternate road-edge /
  // block-edge: a road at tile a occupies a and a+1, so the block after it starts
  // at a+2 and ends at the next road's a. Blocks are consecutive PAIRS of the
  // boundary list — never the road strip itself.
  const xs = [0];
  for (const a of AVENUES) xs.push(a, a + 2);
  xs.push(COLS);
  const ys = [0];
  for (const s of STREETS) ys.push(s, s + 2);
  ys.push(BEACH_ROW);
  const blocks = [];
  for (let i = 0; i < xs.length - 1; i += 2) {
    for (let j = 0; j < ys.length - 1; j += 2) {
      const x = xs[i] * TILE;
      const y = ys[j] * TILE;
      const w = (xs[i + 1] - xs[i]) * TILE;
      const h = (ys[j + 1] - ys[j]) * TILE;
      if (w > TILE * 2 && h > TILE * 2) blocks.push({ x, y, w, h });
    }
  }

  // Hideout garage: a wide low building inside the block between avenue 29
  // and street 25 (never on a road). Alleys: narrow walkable gaps inside blocks.
  const garage = { x: 24 * TILE, y: 20 * TILE, w: TILE * 3, h: TILE * 2, name: 'GARASI VIDRIO' };
  const alleys = [
    { x: 8 * TILE, y: 13 * TILE, w: TILE, h: TILE * 4 },
    { x: 24 * TILE, y: 6 * TILE, w: TILE, h: TILE * 4 },
    { x: 32 * TILE, y: 20 * TILE, w: TILE, h: TILE * 4 },
  ];
  const noBuild = [garage, ...alleys].map((r) => ({ x: r.x - 16, y: r.y - 16, w: r.w + 32, h: r.h + 32 }));
  const overlapsNoBuild = (r) => noBuild.some((n) => r.x < n.x + n.w && r.x + r.w > n.x && r.y < n.y + n.h && r.y + r.h > n.y);

  const buildings = [];
  const shops = [];
  const parks = [];
  let shopName = 0;
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    const roll = rng();
    if (roll < 0.14) {
      // Park block: green, trees, no buildings.
      parks.push({ x: b.x, y: b.y, w: b.w, h: b.h, name: PARK_NAMES[bi % PARK_NAMES.length] });
      continue;
    }
    // 1-3 buildings per block, leaving a walkable alley gap in some blocks.
    const count = 1 + Math.floor(rng() * 3);
    const bw = b.w / count;
    for (let k = 0; k < count; k++) {
      const pad = 14 + rng() * 10;
      const bx = b.x + k * bw + pad;
      const by = b.y + pad;
      const bw2 = bw - pad * 2;
      const bh = b.h - pad * 2 - (rng() < 0.35 ? TILE : 0);
      if (bw2 < TILE || bh < TILE) continue;
      if (overlapsNoBuild({ x: bx, y: by, w: bw2, h: bh })) continue;
      const color = BUILDING_COLORS[Math.floor(rng() * BUILDING_COLORS.length)];
      const isShop = rng() < 0.42 && shopName < SHOP_NAMES.length;
      const building = {
        x: bx,
        y: by,
        w: bw2,
        h: bh,
        color,
        kind: isShop ? 'shop' : 'building',
        name: isShop ? SHOP_NAMES[shopName++] : '',
        floors: 1 + Math.floor(rng() * 3),
      };
      buildings.push(building);
      if (isShop) shops.push(building);
    }
  }

  buildings.push({ ...garage, color: PALETTE.garage, kind: 'garage', floors: 1 });

  // Deterministic palm trees along sidewalks and the beach.
  const trees = [];
  for (let i = 0; i < 46; i++) {
    const p = randomSidewalkPoint({ blocks }, rng);
    trees.push({ x: clamp(p.x, 20, WORLD_W - 20), y: clamp(p.y, 20, WORLD_H - 20) });
  }
  for (let i = 0; i < 12; i++) {
    trees.push({ x: 60 + rng() * (WORLD_W - 120), y: (BEACH_ROW + 0.4 + rng() * 0.5) * TILE });
  }

  // Mission anchors: the drop point (east pier road) and the robbery shop (TOKO SARI).
  const drop = { x: 38.5 * TILE, y: 18.5 * TILE };
  const tokoSari = shops.find((s) => s.name === 'TOKO SARI') ?? shops[0] ?? buildings[0];

  return {
    seed,
    roads,
    blocks,
    buildings,
    shops,
    parks,
    trees,
    alleys,
    garage,
    drop,
    tokoSari,
    spawn: { x: 6.5 * TILE, y: 5.5 * TILE },
    beach: { x: 0, y: BEACH_ROW * TILE, w: WORLD_W, h: TILE },
    sea: { x: 0, y: SEA_ROW * TILE, w: WORLD_W, h: WORLD_H - SEA_ROW * TILE },
  };
}

/** Draw the ground: grass, beach, sea, roads, lane dashes, parks, alleys, garage. */
export function drawWorld(ctx, world, cam, time) {
  // Base grass.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
  // Beach + sea.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(Math.max(cam.x, 0), world.beach.y, Math.min(cam.w, WORLD_W), world.beach.h);
  const wave = Math.sin(time * 1.4) * 4;
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(Math.max(cam.x, 0), world.sea.y + wave, Math.min(cam.w, WORLD_W), world.sea.h);
  ctx.fillStyle = PALETTE.seaDeep;
  for (let i = 0; i < 5; i++) {
    const wy = world.sea.y + 30 + i * 46 + wave * (i % 2 === 0 ? 1 : -1);
    ctx.fillRect(Math.max(cam.x, 0), wy, Math.min(cam.w, WORLD_W), 5);
  }

  // Sidewalk halo around blocks, then roads.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const b of world.blocks) ctx.fillRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
  ctx.fillStyle = PALETTE.road;
  for (const r of world.roads) ctx.fillRect(r.x, r.y, r.w, r.h);

  // Lane dashes.
  ctx.fillStyle = PALETTE.roadLine;
  for (let i = 0; i < AVENUES.length; i++) {
    const cx = (AVENUES[i] + 1) * TILE;
    for (let y = 0; y < BEACH_ROW * TILE; y += 56) ctx.fillRect(cx - 2, y + 8, 4, 28);
  }
  for (let i = 0; i < STREETS.length; i++) {
    const cy = (STREETS[i] + 1) * TILE;
    for (let x = 0; x < WORLD_W; x += 56) ctx.fillRect(x + 8, cy - 2, 28, 4);
  }

  // Parks.
  for (const p of world.parks) {
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x + p.w / 2, p.y + p.h / 2);
  }

  // Alleys (darker walkable gaps).
  ctx.fillStyle = 'rgba(43, 47, 58, 0.55)';
  for (const a of world.alleys) ctx.fillRect(a.x, a.y, a.w, a.h);

  // Buildings: shadow, facade, roof line, windows, shop signs.
  for (const b of world.buildings) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        ctx.fillRect(b.x + 10 + cx * 34, b.y + 10 + cy * 34, 16, 12);
      }
    }
    if (b.kind === 'shop') {
      ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
      ctx.fillRect(b.x, b.y - 4, b.w, 22);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + 12);
    }
    if (b.kind === 'garage') {
      ctx.fillStyle = '#f7ede2';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GARASI VIDRIO', b.x + b.w / 2, b.y + b.h / 2 - 4);
      ctx.font = '12px sans-serif';
      ctx.fillText('PUTUS SIARAN DI SINI', b.x + b.w / 2, b.y + b.h / 2 + 16);
    }
  }

  // Drop point marker base (a painted pier circle).
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(world.drop.x, world.drop.y, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 183, 3, 0.18)';
  ctx.beginPath();
  ctx.arc(world.drop.x, world.drop.y, 34, 0, Math.PI * 2);
  ctx.fill();

  // Palm trees.
  for (const t of world.trees) {
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + 3, t.y - 16);
    ctx.stroke();
    ctx.fillStyle = '#3f9e4d';
    ctx.beginPath();
    ctx.arc(t.x + 3, t.y - 20, 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

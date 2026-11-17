// Costa Vidrio: the city itself. A grid of roads with blocks of buildings,
// shops along the main avenue, the beach on the east edge, and three garage
// hideouts where the player can break the broadcast ("putus siaran").
// Buildings are solid rectangles; everything else is walkable/drivable.
import {
  BEACH_X,
  HORIZONTAL_ROADS,
  PALETTE,
  ROAD_WIDTH,
  VERTICAL_ROADS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clamp,
  pick,
} from './config.js';

/** Is the point on a road (within the asphalt, including the edge)? */
export function isOnRoad(x, y) {
  for (const rx of VERTICAL_ROADS) {
    if (Math.abs(x - rx) <= ROAD_WIDTH / 2) return true;
  }
  for (const ry of HORIZONTAL_ROADS) {
    if (Math.abs(y - ry) <= ROAD_WIDTH / 2) return true;
  }
  return false;
}

/** Is the point on a sidewalk (the ring just outside a road)? */
export function isOnSidewalk(x, y) {
  for (const rx of VERTICAL_ROADS) {
    const d = Math.abs(x - rx);
    if (d > ROAD_WIDTH / 2 && d <= ROAD_WIDTH / 2 + 26) return true;
  }
  for (const ry of HORIZONTAL_ROADS) {
    const d = Math.abs(y - ry);
    if (d > ROAD_WIDTH / 2 && d <= ROAD_WIDTH / 2 + 26) return true;
  }
  return false;
}

/** Nearest vertical road x to a point. */
export function nearestVerticalRoad(x) {
  let best = VERTICAL_ROADS[0];
  for (const rx of VERTICAL_ROADS) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

/** Nearest horizontal road y to a point. */
export function nearestHorizontalRoad(y) {
  let best = HORIZONTAL_ROADS[0];
  for (const ry of HORIZONTAL_ROADS) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}

/** Build the city once from the seed. Returns buildings, shops, hideouts, landmarks. */
export function createWorld(rng) {
  const buildings = [];
  const shops = [];
  const roadXs = [0, ...VERTICAL_ROADS, WORLD_WIDTH];
  const roadYs = [0, ...HORIZONTAL_ROADS, WORLD_HEIGHT];

  // One or two buildings per block between neighbouring roads.
  for (let bx = 0; bx < roadXs.length - 1; bx += 1) {
    for (let by = 0; by < roadYs.length - 1; by += 1) {
      const x0 = roadXs[bx] + ROAD_WIDTH / 2 + 30;
      const x1 = roadXs[bx + 1] - ROAD_WIDTH / 2 - 30;
      const y0 = roadYs[by] + ROAD_WIDTH / 2 + 30;
      const y1 = roadYs[by + 1] - ROAD_WIDTH / 2 - 30;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      if (x0 > BEACH_X - 40) continue; // beach blocks stay open sand
      const count = rng() < 0.55 ? 1 : 2;
      for (let i = 0; i < count; i += 1) {
        let w;
        let h;
        let x;
        let y;
        if (count === 1) {
          w = (x1 - x0) * (0.55 + rng() * 0.3);
          h = (y1 - y0) * (0.55 + rng() * 0.3);
          x = x0 + (x1 - x0 - w) / 2;
          y = y0 + (y1 - y0 - h) / 2;
        } else if (i === 0) {
          w = (x1 - x0) / 2 - 24;
          h = (y1 - y0) * (0.6 + rng() * 0.25);
          x = x0 + 8;
          y = y0 + 8;
        } else {
          w = (x1 - x0) / 2 - 24;
          h = (y1 - y0) * (0.6 + rng() * 0.25);
          x = x0 + (x1 - x0) / 2 + 16;
          y = y0 + (y1 - y0 - h) / 2;
        }
        buildings.push({
          x,
          y,
          w,
          h,
          color: pick(rng, PALETTE.buildingRoof),
          roof: rng() < 0.4 ? 'pool' : rng() < 0.5 ? 'garden' : 'flat',
        });
      }
    }
  }

  // Shops line the main avenue (x = 1500 road), facing the street.
  const shopNames = [
    'TACO VIVO',
    'SURF & SOLE',
    'VOLT COLA',
    'LA PLAYA BAR',
    'CORAL CASINO',
    'NEON NAILS',
    'PIZZA SOL',
    'MOTEL MIRADA',
    'JUICE JUNGLE',
    'EL FARO CAFE',
  ];
  for (let i = 0; i < shopNames.length; i += 1) {
    const y = 340 + i * 210;
    shops.push({
      x: 1500 + ROAD_WIDTH / 2 + 26,
      y,
      w: 120,
      h: 84,
      name: shopNames[i],
      awning: PALETTE.shopAwning[i % PALETTE.shopAwning.length],
    });
  }

  // The Coral Casino is the mission-1 landmark; the diamond convoy loops the ring road.
  const casino = shops.find((s) => s.name === 'CORAL CASINO');

  // Three hideouts: garage / alley pockets where the broadcast drops.
  const hideouts = [
    { x: 900 - ROAD_WIDTH / 2 - 190, y: 800 - ROAD_WIDTH / 2 - 170, w: 150, h: 120, name: 'GARASI BAJA' },
    { x: 2100 + ROAD_WIDTH / 2 + 40, y: 1800 + ROAD_WIDTH / 2 + 40, w: 150, h: 120, name: 'GANG SORE' },
    { x: 2700 - ROAD_WIDTH / 2 - 190, y: 300 - ROAD_WIDTH / 2 - 170, w: 150, h: 120, name: 'BENGKEL TUA' },
  ];

  const world = {
    buildings,
    shops,
    casino,
    hideouts,
    spawn: { x: 1500, y: 1300 },
    beachX: BEACH_X,
  };

  /** Push a circle out of every building it overlaps. Returns true if it hit one. */
  world.collideCircle = function collideCircle(body, radius) {
    let hit = false;
    for (const b of buildings) {
      const cx = clamp(body.x, b.x, b.x + b.w);
      const cy = clamp(body.y, b.y, b.y + b.h);
      const dx = body.x - cx;
      const dy = body.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= radius * radius) continue;
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        body.x = cx + (dx / d) * radius;
        body.y = cy + (dy / d) * radius;
      } else {
        body.y = b.y - radius;
      }
    }
    for (const s of shops) {
      const cx = clamp(body.x, s.x, s.x + s.w);
      const cy = clamp(body.y, s.y, s.y + s.h);
      const dx = body.x - cx;
      const dy = body.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= radius * radius) continue;
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        body.x = cx + (dx / d) * radius;
        body.y = cy + (dy / d) * radius;
      } else {
        body.y = s.y - radius;
      }
    }
    return hit;
  };

  /** The hideout the point stands in, or null. */
  world.hideoutAt = function hideoutAt(x, y) {
    for (const h of hideouts) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  };

  /** Keep a point inside the world (the sea stops cars and feet alike). */
  world.clampToWorld = function clampToWorld(body, margin) {
    body.x = clamp(body.x, margin, WORLD_WIDTH - 60 - margin);
    body.y = clamp(body.y, margin, WORLD_HEIGHT - margin);
  };

  return world;
}

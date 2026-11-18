// SPDX-License-Identifier: MIT
// Live Heist — traffic and pedestrians.
// Civilian cars cruise the avenue grid and turn at intersections;
// pedestrians stroll the sidewalks. When the player's broadcast gets
// hot, nearby citizens stop, raise their phones and film — every one
// of them is another viewer.

import { CFG } from './config.js';
import { isOnRoad, nearestRoad, pointInBuilding, clampToWorld } from './world.js';

const CAR_COLORS = [
  '#e8e8e8', '#c94f6d', '#3f6fb0', '#e8a13c', '#4f7ec9',
  '#7a5fb0', '#3f8f6b', '#d9d9d9', '#ff7a1a', '#19d3e6',
];
const CAR_MODELS = ['Hatch', 'Sedan', 'Pickup', 'Van', 'Coupe'];
const PED_SHIRTS = [
  '#ff7a1a', '#19d3e6', '#ff4d8d', '#ffd23f', '#7fb069',
  '#ffffff', '#3f6fb0', '#e2603f', '#7a5fb0', '#4f7ec9',
];
const PED_NAMES = [
  'Luz', 'Tomas', 'Priya', 'Marco', 'Ana', 'Diego', 'Sofia', 'Ken',
  'Mia', 'Rosa', 'Felix', 'Nadia', 'Omar', 'Lena', 'Hugo', 'Iris',
];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function spawnTraffic(world) {
  const cars = [];
  for (let i = 0; i < CFG.trafficCount; i++) {
    const vertical = Math.random() < 0.5;
    let x; let y; let angle;
    if (vertical) {
      const rx = world.roadsX[Math.floor(Math.random() * world.roadsX.length)];
      x = rx + (Math.random() < 0.5 ? -22 : 22);
      y = rand(120, CFG.worldH - 120);
      angle = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const ry = world.roadsY[Math.floor(Math.random() * world.roadsY.length)];
      y = ry + (Math.random() < 0.5 ? -22 : 22);
      x = rand(120, CFG.worldW - 120);
      angle = Math.random() < 0.5 ? 0 : Math.PI;
    }
    cars.push({
      id: 'civ' + i,
      x, y, angle,
      speed: rand(CFG.trafficSpeedMin, CFG.trafficSpeedMax),
      cruise: rand(CFG.trafficSpeedMin, CFG.trafficSpeedMax),
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      model: CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)],
      stopped: false,
      turnCooldown: rand(1, 4),
    });
  }
  return cars;
}

export function spawnPeds(world) {
  const peds = [];
  for (let i = 0; i < CFG.pedCount; i++) {
    const vertical = Math.random() < 0.5;
    let x; let y;
    if (vertical) {
      const rx = world.roadsX[Math.floor(Math.random() * world.roadsX.length)];
      x = rx + (Math.random() < 0.5 ? -62 : 62);
      y = rand(100, CFG.worldH - 100);
    } else {
      const ry = world.roadsY[Math.floor(Math.random() * world.roadsY.length)];
      y = ry + (Math.random() < 0.5 ? -62 : 62);
      x = rand(100, CFG.worldW - 100);
    }
    peds.push({
      id: 'ped' + i,
      x, y,
      angle: rand(0, Math.PI * 2),
      speed: rand(28, 62),
      shirt: PED_SHIRTS[Math.floor(Math.random() * PED_SHIRTS.length)],
      name: PED_NAMES[i % PED_NAMES.length],
      filming: false,
      panic: 0,
      walkPhase: rand(0, Math.PI * 2),
    });
  }
  return peds;
}

function carAhead(cars, self, dist) {
  const dx = Math.cos(self.angle);
  const dy = Math.sin(self.angle);
  for (const c of cars) {
    if (c === self) continue;
    const ox = c.x - self.x;
    const oy = c.y - self.y;
    const along = ox * dx + oy * dy;
    const side = Math.abs(-ox * dy + oy * dx);
    if (along > 0 && along < dist && side < 30) return true;
  }
  return false;
}

export function updateTraffic(G, dt) {
  const { world } = G;
  for (const car of G.traffic) {
    car.turnCooldown -= dt;
    const atX = world.roadsX.some((rx) => Math.abs(car.x - rx) < 14);
    const atY = world.roadsY.some((ry) => Math.abs(car.y - ry) < 14);
    if (atX && atY && car.turnCooldown <= 0 && Math.random() < 0.45) {
      // Turn onto the crossing road at an intersection.
      const vertical = Math.abs(Math.cos(car.angle)) < 0.5;
      car.angle = vertical
        ? (Math.random() < 0.5 ? 0 : Math.PI)
        : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      car.turnCooldown = rand(2, 5);
    }
    const blocked = carAhead(G.traffic, car, 78) || carAhead(G.police, car, 78);
    const target = blocked ? 0 : car.cruise;
    car.speed += Math.max(-260 * dt, Math.min(160 * dt, target - car.speed));
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const p = clampToWorld(nx, ny);
    // Bounce off the world edge instead of leaving the map.
    if (p.x !== nx) car.angle = Math.PI - car.angle;
    if (p.y !== ny) car.angle = -car.angle;
    car.x = p.x;
    car.y = p.y;
    // Keep civilian cars on roads; nudge them back to the nearest lane.
    if (!isOnRoad(world, car.x, car.y)) {
      const r = nearestRoad(world, car.x, car.y);
      if (r.axis === 'x') car.x += (r.at - car.x) * 0.4 * dt;
      else car.y += (r.at - car.y) * 0.4 * dt;
    }
  }
}

export function updatePeds(G, dt) {
  const { world, player, wanted } = G;
  for (const ped of G.peds) {
    const dPlayer = Math.hypot(ped.x - player.x, ped.y - player.y);
    const hot = wanted.stars >= 2 && dPlayer < 420;
    if (hot) {
      ped.filming = true;
      ped.angle = Math.atan2(player.y - ped.y, player.x - ped.x);
      ped.walkPhase += dt * 2;
      continue;
    }
    ped.filming = false;
    if (ped.panic > 0) {
      ped.panic -= dt;
      ped.x += Math.cos(ped.angle) * 190 * dt;
      ped.y += Math.sin(ped.angle) * 190 * dt;
    } else {
      ped.walkPhase += dt * 6;
      const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      if (pointInBuilding(world, nx, ny, 6)) {
        ped.angle = Math.atan2(-Math.sin(ped.angle), -Math.cos(ped.angle)) + rand(-0.6, 0.6);
      } else if (nx < 60 || nx > CFG.worldW - 60 || ny < 60 || ny > CFG.worldH - 60) {
        ped.angle += Math.PI / 2 + rand(-0.4, 0.4);
      } else {
        ped.x = nx;
        ped.y = ny;
      }
      if (Math.random() < dt * 0.08) ped.angle += rand(-1.2, 1.2);
      // Gunfire nearby makes pedestrians flee.
      if (G.combat.shotsFiredRecently > 0 && dPlayer < 300) {
        ped.panic = rand(1.5, 3);
        ped.angle = Math.atan2(ped.y - player.y, ped.x - player.x);
      }
    }
    const c = clampToWorld(ped.x, ped.y);
    ped.x = c.x;
    // Nobody strolls into the sea.
    ped.x = Math.min(ped.x, 3380);
    ped.y = c.y;
  }
}

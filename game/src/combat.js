// SPDX-License-Identifier: MIT
// Live Heist — combat, kept simple on purpose.
// Fists up close, a pistol at range. Every shot on camera is content:
// the viewers love it, the police do not. Bullets are plain objects
// with a position, a direction and a short life.

import { CFG } from './config.js';
import { wasPressed, isDown } from './input.js';
import { damagePlayer } from './police.js';

export function createCombat() {
  return {
    bullets: [],
    weapon: 'pistol',
    ammo: CFG.pistolAmmo,
    reloadTimer: 0,
    punchCooldown: 0,
    shootCooldown: 0,
    shotsFiredRecently: 0,
    muzzle: 0,
  };
}

function nearestCop(G, x, y, maxD) {
  let best = null;
  let bestD = maxD;
  for (const u of [...G.police, ...G.roadblocks]) {
    const d = Math.hypot(u.x - x, u.y - y);
    if (d < bestD) { bestD = d; best = u; }
  }
  return best;
}

export function updateCombat(G, dt) {
  const c = G.combat;
  const { player, input } = G;
  c.punchCooldown -= dt;
  c.shootCooldown -= dt;
  c.muzzle -= dt;
  c.shotsFiredRecently = Math.max(0, c.shotsFiredRecently - dt);

  // Switch weapon with 1 / 2.
  if (wasPressed(input, '1')) c.weapon = 'fists';
  if (wasPressed(input, '2')) c.weapon = 'pistol';

  // Reload with R.
  if (wasPressed(input, 'r') && c.weapon === 'pistol' && c.ammo < CFG.pistolAmmo) {
    c.reloadTimer = 1.1;
    G.audio.blip(300, 0.08);
  }
  if (c.reloadTimer > 0) {
    c.reloadTimer -= dt;
    if (c.reloadTimer <= 0) c.ammo = CFG.pistolAmmo;
  }

  // Punch: F, short range, knocks a cop or a pedestrian down.
  if (wasPressed(input, 'f') && c.punchCooldown <= 0 && !player.inCar) {
    c.punchCooldown = 0.45;
    const px = player.x + Math.cos(player.angle) * 30;
    const py = player.y + Math.sin(player.angle) * 30;
    const cop = nearestCop(G, px, py, CFG.punchRange + 20);
    if (cop) {
      cop.health -= CFG.punchDamage;
      G.wanted.heat += 6;
      G.particles.burst(cop.x, cop.y, '#ffffff', 6);
      G.audio.thud();
      if (cop.health <= 0) copDown(G, cop);
    } else {
      // Shove a nearby pedestrian instead.
      for (const ped of G.peds) {
        if (Math.hypot(ped.x - px, ped.y - py) < CFG.punchRange) {
          ped.panic = 2.5;
          ped.angle = Math.atan2(ped.y - player.y, ped.x - player.x);
          G.wanted.heat += CFG.heatPerHitPed;
          G.feed.push('A bystander got shoved — the chat clips it instantly');
          break;
        }
      }
    }
  }

  // Shoot: mouse click, aims at the cursor.
  if (input.mouse.clicked && c.weapon === 'pistol' && c.shootCooldown <= 0 && c.reloadTimer <= 0 && !player.inCar) {
    if (c.ammo > 0) {
      c.ammo -= 1;
      c.shootCooldown = 0.28;
      c.muzzle = 0.08;
      c.shotsFiredRecently = 1.2;
      const wx = G.camera.x + input.mouse.x;
      const wy = G.camera.y + input.mouse.y;
      const angle = Math.atan2(wy - player.y, wx - player.x);
      c.bullets.push({
        x: player.x + Math.cos(angle) * 20,
        y: player.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 900,
        vy: Math.sin(angle) * 900,
        life: 0.6,
        fromPlayer: true,
      });
      player.angle = angle;
      G.wanted.heat += CFG.heatPerShot;
      G.audio.shot();
      G.camera.shake = Math.max(G.camera.shake, 3);
    } else {
      G.audio.blip(180, 0.06);
    }
  }

  // Bullets fly and hit cops, roadblocks or buildings.
  for (let i = c.bullets.length - 1; i >= 0; i--) {
    const b = c.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && b.fromPlayer) {
      // Only the player's own bullets can take a cop down.
      const cop = nearestCop(G, b.x, b.y, 26);
      if (cop) {
        cop.health -= CFG.pistolDamage;
        G.particles.burst(b.x, b.y, '#ff4d4d', 8);
        if (cop.health <= 0) copDown(G, cop);
        dead = true;
      }
    }
    if (!dead && G.world && pointInBuildingCheck(G, b.x, b.y)) {
      G.particles.burst(b.x, b.y, '#ffd23f', 4);
      dead = true;
    }
    if (dead) c.bullets.splice(i, 1);
  }

  // Cops shoot back when the player is on foot and wanted.
  if (G.wanted.stars >= 2 && !player.inCar) {
    G.copFireTimer -= dt;
    if (G.copFireTimer <= 0) {
      const near = nearestCop(G, player.x, player.y, 380);
      if (near) {
        G.copFireTimer = 1.4;
        const a = Math.atan2(player.y - near.y, player.x - near.x);
        c.bullets.push({
          x: near.x, y: near.y,
          vx: Math.cos(a) * 620, vy: Math.sin(a) * 620,
          life: 0.8, fromPlayer: false,
        });
        G.audio.shot(true);
      } else {
        G.copFireTimer = 0.5;
      }
    }
  }

  // Enemy bullets hitting the player.
  for (let i = c.bullets.length - 1; i >= 0; i--) {
    const b = c.bullets[i];
    if (!b.fromPlayer && Math.hypot(b.x - player.x, b.y - player.y) < 16) {
      damagePlayer(G, 6);
      c.bullets.splice(i, 1);
    }
  }
}

function pointInBuildingCheck(G, x, y) {
  for (const b of G.world.buildings) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
}

function copDown(G, cop) {
  G.wanted.heat += CFG.heatPerCopDown;
  G.feed.push(`${cop.name} (${cop.callsign}) is down — the chat goes wild`);
  G.particles.burst(cop.x, cop.y, '#ff4d4d', 16);
  G.audio.blip(140, 0.2);
  const idx = G.police.indexOf(cop);
  if (idx >= 0) G.police.splice(idx, 1);
  const rIdx = G.roadblocks.indexOf(cop);
  if (rIdx >= 0) G.roadblocks.splice(rIdx, 1);
  G.stats.copsDown += 1;
}

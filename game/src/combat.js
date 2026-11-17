// LIVE HEIST — combat.js
// Simple combat: Space punches on foot, mouse click shoots toward the cursor.
// Bullets are short-lived tracers; hitting a cop raises the heat, hitting a
// pedestrian raises it more. Police rams are the real threat (see police.js).

import { HEAT_HIT_PED, HEAT_SHOOT, clamp, dist } from './config.js';
import { addHeat } from './police.js';

/** Fresh combat state. */
export function createCombat() {
  return { bullets: [], punchT: 0, shootCd: 0, muzzleT: 0 };
}

/** Punch: a short arc in front of the player, on foot only. */
export function doPunch(state) {
  const combat = state.combat;
  if (combat.punchT > 0 || !state.player.onFoot) return;
  combat.punchT = 0.28;
  state.audio.thud();
  const px = state.player.x;
  const py = state.player.y;
  const a = state.player.angle;
  const fx = px + Math.cos(a) * 34;
  const fy = py + Math.sin(a) * 34;
  let hit = false;
  for (const car of state.police.cars) {
    if (dist(fx, fy, car.x, car.y) < 56) {
      car.speed *= 0.4;
      hit = true;
    }
  }
  for (const ped of state.traffic.peds) {
    if (dist(fx, fy, ped.x, ped.y) < 40) {
      ped.tx = ped.x + (state.rng() - 0.5) * 300;
      ped.ty = ped.y + (state.rng() - 0.5) * 300;
      hit = true;
    }
  }
  if (hit) addHeat(state, 8, '');
  state.particles.push({ x: fx, y: fy, vx: 0, vy: 0, life: 0.18, maxLife: 0.18, size: 26, color: 'rgba(255,255,255,0.7)', kind: 'flash' });
}

/** Shoot toward the mouse cursor (world space). Works on foot and from a car. */
export function doShoot(state, mouseWorldX, mouseWorldY) {
  const combat = state.combat;
  if (combat.shootCd > 0) return;
  combat.shootCd = 0.32;
  combat.muzzleT = 0.08;
  const px = state.player.x;
  const py = state.player.y;
  const a = Math.atan2(mouseWorldY - py, mouseWorldX - px);
  combat.bullets.push({ x: px + Math.cos(a) * 22, y: py + Math.sin(a) * 22, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, life: 0.55 });
  state.audio.shot();
  addHeat(state, HEAT_SHOOT, '');
}

/** Advance bullets and the punch timer. */
export function stepCombat(state, dt) {
  const combat = state.combat;
  combat.punchT = Math.max(0, combat.punchT - dt);
  combat.shootCd = Math.max(0, combat.shootCd - dt);
  combat.muzzleT = Math.max(0, combat.muzzleT - dt);
  for (let i = combat.bullets.length - 1; i >= 0; i--) {
    const b = combat.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      for (const car of state.police.cars) {
        if (dist(b.x, b.y, car.x, car.y) < 34) {
          car.speed *= 0.55;
          dead = true;
          addHeat(state, 4, '');
          break;
        }
      }
    }
    if (!dead) {
      for (const ped of state.traffic.peds) {
        if (dist(b.x, b.y, ped.x, ped.y) < 14) {
          ped.tx = ped.x + (state.rng() - 0.5) * 400;
          ped.ty = ped.y + (state.rng() - 0.5) * 400;
          dead = true;
          addHeat(state, HEAT_HIT_PED, 'Warga tertembak — penonton melonjak!');
          break;
        }
      }
    }
    if (dead) {
      state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25, size: 12, color: '#ffd166', kind: 'flash' });
      combat.bullets.splice(i, 1);
    }
  }
}

/** Draw bullets, muzzle flash and the punch arc. */
export function drawCombat(ctx, state) {
  const combat = state.combat;
  ctx.save();
  ctx.strokeStyle = '#ffe66d';
  ctx.lineWidth = 3;
  for (const b of combat.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  if (combat.muzzleT > 0) {
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath();
    ctx.arc(state.player.x + Math.cos(state.player.angle) * 24, state.player.y + Math.sin(state.player.angle) * 24, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  if (combat.punchT > 0 && state.player.onFoot) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, 34, state.player.angle - 0.7, state.player.angle + 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

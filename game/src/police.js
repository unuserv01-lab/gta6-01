// SPDX-License-Identifier: MIT
// Live Heist — Vidrio PD: the wanted system.
// Heat is the crime the city saw; stars are how the broadcast shows
// it; viewers are the crowd that tuned in. One star brings a cruiser,
// three bring the news helicopter, four bring roadblocks and five
// bring the SWAT van. Slip into a signal dead zone and the feed dies
// — the stars fall with it.

import { CFG } from './config.js';
import { inDeadZone, clampToWorld } from './world.js';

const UNIT_NAMES = [
  'UNIT 12', 'UNIT 07', 'UNIT 23', 'UNIT 31', 'UNIT 04',
  'UNIT 19', 'UNIT 44', 'UNIT 52', 'UNIT 60', 'UNIT 77',
];
const UNIT_CALLSIGNS = [
  'Falcon', 'Vega', 'Rook', 'Delta', 'Comet',
  'Harbor', 'Sierra', 'Bronze', 'Nova', 'Tango',
];

export function createWanted() {
  return {
    stars: 0,
    heat: 0,
    viewers: CFG.viewersBase,
    displayedViewers: CFG.viewersBase,
    deadZoneTimer: 0,
    lastStarChange: 0,
  };
}

export function starsFromHeat(heat) {
  const t = CFG.starThresholds;
  let stars = 0;
  for (let i = 1; i < t.length; i++) {
    if (heat >= t[i]) stars = i;
  }
  return stars;
}

export function formatViewers(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(Math.floor(n));
}

export function spawnPoliceUnit(G, kind) {
  const { player } = G;
  // Appear on the road edge nearest the player, just off camera.
  const edge = Math.floor(Math.random() * 4);
  const d = 900 + Math.random() * 300;
  let x; let y;
  if (edge === 0) { x = player.x + d; y = player.y + (Math.random() - 0.5) * 700; }
  else if (edge === 1) { x = player.x - d; y = player.y + (Math.random() - 0.5) * 700; }
  else if (edge === 2) { x = player.x + (Math.random() - 0.5) * 700; y = player.y + d; }
  else { x = player.x + (Math.random() - 0.5) * 700; y = player.y - d; }
  const c = clampToWorld(x, y);
  const n = G.police.length;
  const unit = {
    id: 'pd' + Date.now() + n,
    x: c.x, y: c.y,
    angle: Math.atan2(player.y - c.y, player.x - c.x),
    speed: 0,
    kind: kind || 'cruiser',
    name: UNIT_NAMES[n % UNIT_NAMES.length],
    callsign: UNIT_CALLSIGNS[n % UNIT_CALLSIGNS.length],
    health: kind === 'swat' ? 220 : 120,
    status: 'PURSUIT',
    sirenPhase: Math.random() * Math.PI * 2,
    ramCooldown: 0,
  };
  G.police.push(unit);
  return unit;
}

export function desiredPoliceCount(stars) {
  if (stars <= 0) return 0;
  if (stars === 1) return 1;
  if (stars === 2) return 2;
  if (stars === 3) return 3;
  if (stars === 4) return 4;
  return 5;
}

export function updateWanted(G, dt) {
  const w = G.wanted;
  const dead = inDeadZone(G.world, G.player.x, G.player.y);
  if (dead && w.stars > 0) {
    w.deadZoneTimer += dt;
    w.heat -= CFG.heatDecayDeadZone * dt;
    if (w.deadZoneTimer > 1.2 && !G.ui.deadZoneNotice) {
      G.ui.deadZoneNotice = true;
      G.feed.push('SIGNAL LOST — broadcast cut inside ' + dead.label);
    }
  } else {
    w.deadZoneTimer = 0;
    G.ui.deadZoneNotice = false;
    w.heat -= CFG.heatDecay * dt;
  }
  w.heat = Math.max(0, w.heat);
  const stars = starsFromHeat(w.heat);
  if (stars !== w.stars) {
    if (stars > w.stars) {
      G.feed.push(`WANTED LEVEL ${stars} — ${stars >= 4 ? 'ROADBLOCKS UP' : stars >= 3 ? 'NEWS HELI OVERHEAD' : 'PD UNITS DISPATCHED'}`);
      G.audio.sirenBurst();
    } else {
      G.feed.push(`WANTED LEVEL DOWN TO ${stars} — the crowd is losing interest`);
    }
    w.stars = stars;
    w.lastStarChange = G.time;
  }
  // Viewers follow the heat, with a little live jitter.
  const target = CFG.viewersBase + w.heat * CFG.viewersPerHeat + w.stars * 900;
  w.viewers += (target - w.viewers) * Math.min(1, dt * 1.4);
  w.displayedViewers = w.viewers + Math.sin(G.time * 2.3) * CFG.viewersJitter * 0.2;
}

export function updatePolice(G, dt) {
  const { player, wanted } = G;
  const want = desiredPoliceCount(wanted.stars);
  G.policeTimer -= dt;
  if (G.police.length < want && G.policeTimer <= 0) {
    const kind = wanted.stars >= 5 && G.police.filter((p) => p.kind === 'swat').length < 1
      ? 'swat' : 'cruiser';
    spawnPoliceUnit(G, kind);
    G.policeTimer = CFG.policeSpawnGap;
  }
  if (G.police.length > want) {
    // Extra units give up and peel off when the heat drops.
    G.police.splice(want);
  }

  for (const unit of G.police) {
    const dx = player.x - unit.x;
    const dy = player.y - unit.y;
    const dist = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - unit.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    unit.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const targetSpeed = dist > 260 ? CFG.policeMaxSpeed : CFG.policeMaxSpeed * 0.72;
    unit.speed += Math.max(-500 * dt, Math.min(CFG.policeAccel * dt, targetSpeed - unit.speed));
    unit.x += Math.cos(unit.angle) * unit.speed * dt;
    unit.y += Math.sin(unit.angle) * unit.speed * dt;
    unit.sirenPhase += dt * 6;
    unit.ramCooldown -= dt;
    unit.status = dist < 130 ? 'RAMMING' : dist < 220 && wanted.stars >= 4 ? 'BOXING IN' : dist < 500 ? 'PURSUIT' : 'EN ROUTE';
    // Ram the player when close.
    if (dist < 46 && unit.ramCooldown <= 0) {
      unit.ramCooldown = 1.1;
      const dmg = CFG.policeRamDamage;
      if (G.playerCar) {
        G.playerCar.damage += dmg;
        G.playerCar.speed *= 0.55;
        G.particles.burst(unit.x, unit.y, '#ffd23f', 10);
      } else {
        damagePlayer(G, dmg);
      }
      G.audio.thud();
      G.camera.shake = Math.max(G.camera.shake, 7);
    }
    // Roadblock units hold a line ahead of the player instead of chasing.
    if (wanted.stars >= CFG.roadblockAtStars && unit.kind === 'roadblock') {
      unit.status = 'ROADBLOCK';
    }
  }

  // Roadblocks: two parked cruisers appear ahead of the player at 4+ stars.
  if (wanted.stars >= CFG.roadblockAtStars) {
    G.roadblockTimer -= dt;
    if (G.roadblockTimer <= 0 && G.roadblocks.length < 2) {
      const a = player.angle || 0;
      const bx = player.x + Math.cos(a) * 520;
      const by = player.y + Math.sin(a) * 520;
      G.roadblocks.push({
        x: bx, y: by, angle: a + Math.PI / 2,
        kind: 'roadblock', health: 160,
        name: 'ROADBLOCK', callsign: 'Block', status: 'ROADBLOCK',
      });
      G.roadblockTimer = 14;
      G.feed.push('ROADBLOCK AHEAD — Vidrio PD is boxing you in');
    }
  } else {
    G.roadblocks.length = 0;
  }
}

export function damagePlayer(G, amount) {
  const p = G.player;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, amount * 0.6);
    p.armor -= absorbed;
    p.health -= amount - absorbed;
  } else {
    p.health -= amount;
  }
  p.health = Math.max(0, p.health);
  G.camera.shake = Math.max(G.camera.shake, 5);
  if (p.health <= 0 && !G.ui.busted) {
    G.ui.busted = true;
    G.ui.bustedTimer = 0;
  }
}

export function resetAfterBusted(G) {
  const p = G.player;
  p.health = 60;
  p.armor = 0;
  p.cash = Math.max(0, p.cash - 400);
  G.wanted.heat = 0;
  G.wanted.stars = 0;
  G.police.length = 0;
  G.roadblocks.length = 0;
  G.heli.active = false;
  G.ui.busted = false;
  p.x = G.world.landmarks.garageRico.x;
  p.y = G.world.landmarks.garageRico.y;
  if (G.playerCar) {
    G.playerCar = null;
    p.inCar = false;
  }
  G.feed.push('BUSTED — bailed out at Rico\'s garage, $400 gone');
}

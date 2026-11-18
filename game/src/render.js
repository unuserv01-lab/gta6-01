// SPDX-License-Identifier: MIT
// Live Heist — the renderer: Costa Vidrio from above.
// Sun-baked asphalt, orange and cyan roofs, a turquoise sea on the
// east edge, zebra crossings, parked cars, palm shadows. Everything
// is drawn with plain canvas shapes — no images, no network, nothing
// to load — so the city looks the same on any machine.

import { CFG, PALETTE } from './config.js';
import { inDeadZone } from './world.js';

export function createParticles() {
  return {
    list: [],
    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 60 + Math.random() * 220;
        this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, color, size: 2 + Math.random() * 3 });
      }
    },
    puff(x, y) {
      this.list.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.7, color: 'rgba(200,200,200,0.5)', size: 5 + Math.random() * 5 });
    },
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.life -= dt;
        if (p.life <= 0) this.list.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of this.list) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function drawRoads(ctx, world, cam) {
  const hw = CFG.roadW / 2;
  ctx.fillStyle = PALETTE.asphalt;
  for (const rx of world.roadsX) ctx.fillRect(rx - hw, 0, CFG.roadW, CFG.worldH);
  for (const ry of world.roadsY) ctx.fillRect(0, ry - hw, CFG.worldW, CFG.roadW);
  // Centre dashes.
  ctx.fillStyle = PALETTE.lineYellow;
  for (const rx of world.roadsX) {
    for (let y = 0; y < CFG.worldH; y += 64) {
      if (y < cam.y - 80 || y > cam.y + CFG.viewH + 80) continue;
      ctx.fillRect(rx - 2, y, 4, 30);
    }
  }
  for (const ry of world.roadsY) {
    for (let x = 0; x < CFG.worldW; x += 64) {
      if (x < cam.x - 80 || x > cam.x + CFG.viewW + 80) continue;
      ctx.fillRect(x, ry - 2, 30, 4);
    }
  }
  // Zebra crossings at intersections.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const rx of world.roadsX) {
    for (const ry of world.roadsY) {
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(rx + i * 12 - 4, ry - hw + 8, 8, 16);
        ctx.fillRect(rx + i * 12 - 4, ry + hw - 24, 8, 16);
      }
    }
  }
}

function drawGround(ctx, world, cam) {
  ctx.fillStyle = '#8fae6b';
  ctx.fillRect(cam.x - 40, cam.y - 40, CFG.viewW + 80, CFG.viewH + 80);
  // Sidewalk slabs around blocks.
  ctx.fillStyle = PALETTE.sidewalk;
  for (let bx = 0; bx < world.roadsX.length - 1; bx++) {
    for (let by = 0; by < world.roadsY.length - 1; by++) {
      const x0 = world.roadsX[bx] + CFG.roadW / 2;
      const y0 = world.roadsY[by] + CFG.roadW / 2;
      const x1 = world.roadsX[bx + 1] - CFG.roadW / 2;
      const y1 = world.roadsY[by + 1] - CFG.roadW / 2;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  // Beach and sea.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(world.beachX, 0, world.seaX - world.beachX, CFG.worldH);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(world.seaX, 0, CFG.worldW - world.seaX, CFG.worldH);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = 40; y < CFG.worldH; y += 130) {
    ctx.beginPath();
    ctx.arc(world.seaX + 40 + Math.sin(y * 0.05) * 12, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  // Park pool.
  for (const p of world.pools) {
    ctx.fillStyle = '#19a8d8';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  // Palm trees.
  for (const t of world.trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(t.x + 8, t.y + 8, t.r, t.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f9e5f';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57c785';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuildings(ctx, world) {
  for (const b of world.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Roof detail: skylight or AC unit.
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, b.w * 0.24, b.h * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + b.w * 0.62, b.y + b.h * 0.6, b.w * 0.18, b.h * 0.16);
    if (b.shop) {
      ctx.fillStyle = '#14161f';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 + 4);
      ctx.textAlign = 'left';
      // Shop awning.
      ctx.fillStyle = '#ff7a1a';
      ctx.fillRect(b.x, b.y + b.h - 10, b.w, 10);
    }
  }
  // Dead zones: hatched garages and alleys.
  for (const z of world.deadZones) {
    ctx.fillStyle = 'rgba(20, 22, 31, 0.88)';
    ctx.fillRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
    ctx.strokeStyle = '#19d3e6';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#19d3e6';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SIGNAL DEAD', z.x, z.y - 4);
    ctx.fillStyle = '#fff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('cut the feed here', z.x, z.y + 14);
    ctx.textAlign = 'left';
  }
}

function drawCarShape(ctx, x, y, angle, color, model, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const L = CFG.carLength;
  const Wd = CFG.carWidth;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-L / 2 + 3, -Wd / 2 + 4, L, Wd);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -Wd / 2, L, Wd, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,28,40,0.85)';
  ctx.beginPath();
  ctx.roundRect(-L / 2 + 12, -Wd / 2 + 5, 16, Wd - 10, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(L / 2 - 4, -Wd / 2 + 3, 3, 5);
  ctx.fillRect(L / 2 - 4, Wd / 2 - 8, 3, 5);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(L / 2 - 2, -Wd / 2 + 2, 2, 4);
  ctx.fillRect(L / 2 - 2, Wd / 2 - 6, 2, 4);
  if (opts.police) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-6, -Wd / 2 + 2, 12, Wd - 4);
    ctx.fillStyle = '#14161f';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    ctx.textAlign = 'left';
    const flash = Math.floor(performance.now() / 260) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b3b' : '#2f7bff';
    ctx.beginPath();
    ctx.arc(-2, -Wd / 2 + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#2f7bff' : '#ff3b3b';
    ctx.beginPath();
    ctx.arc(6, -Wd / 2 + 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (opts.swat) {
    ctx.fillStyle = '#14161f';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SWAT', 0, 3);
    ctx.textAlign = 'left';
  }
  if (opts.smoke > 0.2) {
    ctx.fillStyle = `rgba(120,120,120,${Math.min(0.7, opts.smoke)})`;
    ctx.beginPath();
    ctx.arc(-L / 2 - 6, 0, 8 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(angle);
  // Legs mid-stride.
  const step = opts.walking ? Math.sin(opts.phase || 0) * 4 : 0;
  ctx.strokeStyle = '#2a2f3a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(-6 - step, 8);
  ctx.moveTo(2, 0);
  ctx.lineTo(6 + step, 8);
  ctx.stroke();
  // Body.
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -11, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14161f';
  ctx.beginPath();
  ctx.arc(0, -13, 6, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  if (opts.filming) {
    // Phone held up, REC dot blinking.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#14161f';
    ctx.fillRect(10, -16, 5, 9);
    ctx.restore();
    const blink = Math.floor(performance.now() / 400) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3b3b' : '#ffb3b3';
    ctx.beginPath();
    ctx.arc(x, y - 26, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REC', x, y - 32);
    ctx.textAlign = 'left';
  }
  if (opts.name) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.name, x, y + 22);
    ctx.textAlign = 'left';
  }
}

export function renderWorld(G) {
  const { ctx, world, camera } = G;
  const cam = { x: camera.x, y: camera.y };
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawGround(ctx, world, cam);
  drawRoads(ctx, world, cam);
  drawBuildings(ctx, world);

  // Stash bags.
  if (G.missions.stashSpots) {
    for (const s of G.missions.stashSpots) {
      if (s.found) continue;
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', s.x, s.y + 3);
      ctx.textAlign = 'left';
    }
  }

  // Mission target beacon.
  if (G.missions.target && G.missions.active) {
    const t = G.missions.target;
    const pulse = 1 + Math.sin(G.time * 4) * 0.12;
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.55 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - 44);
    ctx.lineTo(t.x - 10, t.y - 22);
    ctx.lineTo(t.x + 10, t.y - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#14161f';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.label, t.x, t.y - 50);
    ctx.textAlign = 'left';
  }

  // Parked cars.
  for (const car of G.parkedCars) {
    drawCarShape(ctx, car.x, car.y, car.angle, car.color, car.model);
  }
  // Mission car glows orange.
  if (G.missionCar && !G.playerCar?.isMission) {
    const glow = 0.5 + Math.sin(G.time * 5) * 0.3;
    ctx.strokeStyle = `rgba(255, 122, 26, ${glow})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(G.missionCar.x, G.missionCar.y, 44, 0, Math.PI * 2);
    ctx.stroke();
    drawCarShape(ctx, G.missionCar.x, G.missionCar.y, G.missionCar.angle, G.missionCar.color, G.missionCar.model);
  }
  // Traffic.
  for (const car of G.traffic) {
    drawCarShape(ctx, car.x, car.y, car.angle, car.color, car.model);
  }
  // Roadblocks.
  for (const rb of G.roadblocks) {
    drawCarShape(ctx, rb.x, rb.y, rb.angle, '#e8e8e8', 'Cruiser', { police: true });
    ctx.fillStyle = '#ff7a1a';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROADBLOCK', rb.x, rb.y - 34);
    ctx.textAlign = 'left';
  }
  // Police.
  for (const u of G.police) {
    drawCarShape(ctx, u.x, u.y, u.angle, u.kind === 'swat' ? '#1f2430' : '#e8e8e8', u.kind === 'swat' ? 'SWAT Van' : 'Cruiser', { police: u.kind !== 'swat', swat: u.kind === 'swat' });
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${u.name} ${u.status}`, u.x, u.y - 32);
    ctx.textAlign = 'left';
  }
  // Pedestrians.
  for (const ped of G.peds) {
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, {
      filming: ped.filming,
      walking: !ped.filming,
      phase: ped.walkPhase,
      name: ped.filming ? ped.name + ' 🎥' : '',
    });
  }
  // Player car or player on foot.
  if (G.playerCar) {
    drawCarShape(ctx, G.playerCar.x, G.playerCar.y, G.playerCar.angle, G.playerCar.color, G.playerCar.model, { smoke: G.playerCar.smoke });
  } else {
    drawPerson(ctx, G.player.x, G.player.y, G.player.angle, '#ff7a1a', { walking: true, phase: G.player.walkPhase || 0 });
    // Player marker ring.
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(G.player.x, G.player.y, 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Bullets.
  for (const b of G.combat.bullets) {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Muzzle flash.
  if (G.combat.muzzle > 0) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(G.player.x + Math.cos(G.player.angle) * 26, G.player.y + Math.sin(G.player.angle) * 26, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  G.particles.draw(ctx);

  // News heli spotlight cone + its shadow on the street below.
  if (G.heli.active) {
    const h = G.heli;
    const bob = Math.sin(h.bobPhase) * 6;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + 26, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 240, 160, ${0.14 * h.spotlight})`;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + bob);
    ctx.lineTo(G.player.x - 90, G.player.y - 40);
    ctx.lineTo(G.player.x + 90, G.player.y - 40);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.translate(h.x, h.y + bob);
    ctx.rotate(h.rotor);
    ctx.fillStyle = 'rgba(20,22,31,0.85)';
    ctx.fillRect(-34, -3, 68, 6);
    ctx.rotate(-h.rotor);
    ctx.fillStyle = '#f2f2f2';
    ctx.beginPath();
    ctx.roundRect(-26, -14, 52, 28, 10);
    ctx.fill();
    ctx.fillStyle = '#14161f';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SKY 5', 0, 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(20,22,31,0.9)';
    ctx.fillRect(-4, 14, 8, 16);
    ctx.restore();
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SKY 5 NEWS', h.x, h.y + bob - 26);
    ctx.textAlign = 'left';
  }

  // "Steal" prompt when near a car on foot.
  if (G.stealTarget && !G.player.inCar) {
    const c = G.stealTarget;
    ctx.fillStyle = 'rgba(12,14,24,0.9)';
    ctx.beginPath();
    ctx.roundRect(c.x - 70, c.y - 58, 140, 26, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Press E — steal ${c.model}`, c.x, c.y - 40);
    ctx.textAlign = 'left';
  }

  ctx.restore();

  // Vignette + broadcast frame edges.
  const vg = ctx.createRadialGradient(CFG.viewW / 2, CFG.viewH / 2, CFG.viewH * 0.45, CFG.viewW / 2, CFG.viewH / 2, CFG.viewH * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,10,25,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  // Dead-zone tint when the feed is cut.
  if (inDeadZone(G.world, G.player.x, G.player.y) && G.wanted.stars > 0) {
    ctx.fillStyle = 'rgba(25, 211, 230, 0.10)';
    ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
    ctx.fillStyle = '#19d3e6';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('— SIGNAL DEAD — the broadcast is cutting out —', CFG.viewW / 2, 120);
    ctx.textAlign = 'left';
  }
}

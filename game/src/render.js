// The renderer: paints Costa Vidrio top-down on the canvas — sun, sea,
// roads, blocks, buildings and shopfronts, alleys and garages, palms,
// traffic, pedestrians (phones up when they film), police, the news
// helicopter, the player, and the particle effects. The camera follows the
// player; the HUD is drawn on top by hud.js.

import { PALETTE, VIEW, WORLD } from './config.js';
import { playerCar } from './world.js';
import { drawHUD } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_COMPLETE = 'complete';

/** Create the renderer for one canvas. The canvas is fixed at 1280x720 logical. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  function draw(state, screen) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    if (screen === SCREEN_TITLE) {
      drawHUD(ctx, state, screen);
      return;
    }
    ctx.save();
    const camX = Math.round(state.camera.x);
    const camY = Math.round(state.camera.y);
    ctx.translate(-camX, -camY);
    drawGround(ctx, state);
    drawRoads(ctx, state);
    drawCity(ctx, state);
    drawCars(ctx, state);
    drawPedestrians(ctx, state);
    drawPolice(ctx, state);
    drawHeli(ctx, state);
    drawPlayer(ctx, state);
    drawEffects(ctx, state);
    ctx.restore();
    drawHUD(ctx, state, screen);
  }

  return { draw };
}

/** Sand, sea and grass: the ground the city sits on. */
function drawGround(ctx, state) {
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  // The sea, east of the beach.
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(3100, 0, WORLD.width - 3100, WORLD.height);
  ctx.fillStyle = PALETTE.seaDeep;
  ctx.fillRect(3150, 0, WORLD.width - 3150, WORLD.height);
  // A park block in the middle of the city.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(1670, 470, 460, 460);
  ctx.fillStyle = '#ffffff22';
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(1750 + i * 90, 500 + (i % 2) * 380, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Roads with centre dashes and sidewalk strips. */
function drawRoads(ctx, state) {
  const half = 70;
  ctx.fillStyle = PALETTE.road;
  for (const rx of [400, 1000, 1600, 2200, 2800]) ctx.fillRect(rx - half, 0, half * 2, WORLD.height);
  for (const ry of [400, 1000, 1600, 2000]) ctx.fillRect(0, ry - half, WORLD.width, half * 2);
  // Sidewalk strips along every road.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const rx of [400, 1000, 1600, 2200, 2800]) {
    ctx.fillRect(rx - half - 22, 0, 22, WORLD.height);
    ctx.fillRect(rx + half, 0, 22, WORLD.height);
  }
  for (const ry of [400, 1000, 1600, 2000]) {
    ctx.fillRect(0, ry - half - 22, WORLD.width, 22);
    ctx.fillRect(0, ry + half, WORLD.width, 22);
  }
  // Centre dashes.
  ctx.fillStyle = PALETTE.roadLine;
  for (const rx of [400, 1000, 1600, 2200, 2800]) {
    for (let y = 20; y < WORLD.height; y += 64) ctx.fillRect(rx - 3, y, 6, 32);
  }
  for (const ry of [400, 1000, 1600, 2000]) {
    for (let x = 20; x < WORLD.width; x += 64) ctx.fillRect(x, ry - 3, 32, 6);
  }
}

/** Buildings, shops, alleys, garages and palms. */
function drawCity(ctx, state) {
  // Alleys: darker cuts through the blocks, labelled.
  for (const a of state.alleys) {
    ctx.fillStyle = PALETTE.alley;
    ctx.fillRect(a.x, a.y, a.w, a.h);
    ctx.fillStyle = '#241f2e';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(a.x + a.w / 2, a.y + a.h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(a.name, 0, 4);
    ctx.restore();
  }
  // Garages: open doors, cyan, labelled — the "cut the broadcast" rooms.
  for (const g of state.garages) {
    ctx.fillStyle = PALETTE.garage;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = '#14101c';
    ctx.fillRect(g.x + 10, g.y + 10, g.w - 20, g.h - 20);
    ctx.fillStyle = '#19c2d8';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x + g.w / 2, g.y + g.h / 2 - 4);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('SIGNAL LOST HERE', g.x + g.w / 2, g.y + g.h / 2 + 14);
  }
  // Buildings with a roof line and a door.
  for (const b of state.buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#00000026';
    ctx.fillRect(b.x, b.y, b.w, 10);
    if (b.roof) {
      ctx.strokeStyle = '#ffffff55';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    }
    ctx.fillStyle = '#241f2e';
    ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h - 14, 16, 14);
  }
  // Shopfronts with their names on the awning.
  for (const s of state.shops) {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(s.x, s.y, s.w, 18);
    ctx.fillStyle = '#241f2e';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, s.x + s.w / 2, s.y + 13);
    ctx.fillStyle = '#00000033';
    ctx.fillRect(s.x + 10, s.y + 24, s.w - 20, 22);
  }
  // Palms: a trunk and a star of leaves.
  for (const palm of state.palms) {
    ctx.strokeStyle = PALETTE.palmTrunk;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(palm.x, palm.y);
    ctx.lineTo(palm.x + 4, palm.y - 16 * palm.s);
    ctx.stroke();
    ctx.fillStyle = PALETTE.palm;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(palm.x + 4 + Math.cos(a) * 12 * palm.s, palm.y - 16 * palm.s + Math.sin(a) * 12 * palm.s, 12 * palm.s, 4 * palm.s, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The Marina Vault: a gold-marked building at the south-east.
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(2620, 1820, 120, 120);
  ctx.fillStyle = '#241f2e';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MARINA', 2680, 1872);
  ctx.fillText('VAULT', 2680, 1890);
  // The VIDRIO TV studio: a pink-marked building at the south-west.
  ctx.fillStyle = '#ff5fa2';
  ctx.fillRect(500, 1057, 120, 120);
  ctx.fillStyle = '#fff7e6';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('VIDRIO TV', 560, 1105);
  ctx.fillText('STUDIO', 560, 1123);
}

/** Every car: traffic, parked, the player's, and the special pink Comet GT. */
function drawCars(ctx, state) {
  for (const car of state.cars) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const w = 46;
    const h = 24;
    ctx.fillStyle = '#00000033';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    ctx.fillStyle = car.color;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 7);
    ctx.fill();
    ctx.fillStyle = '#bfe9ff';
    ctx.fillRect(2, -h / 2 + 4, 12, h - 8);
    ctx.fillRect(-14, -h / 2 + 4, 8, h - 8);
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(w / 2 - 3, -h / 2 + 3, 3, 5);
    ctx.fillRect(w / 2 - 3, h / 2 - 8, 3, 5);
    if (car.special) {
      ctx.fillStyle = '#241f2e';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(car.special, 0, 4);
    }
    if (car.player) {
      ctx.strokeStyle = '#ff7a1a';
      ctx.lineWidth = 3;
      roundRectPath(ctx, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 9);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Pedestrians: a coloured dot with a direction tick — or a raised phone and a REC bug. */
function drawPedestrians(ctx, state) {
  for (const ped of state.peds) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.fillStyle = '#0000002e';
    ctx.beginPath();
    ctx.ellipse(2, 3, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241f2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ped.angle) * 12, Math.sin(ped.angle) * 12);
    ctx.stroke();
    if (ped.phoneUp) {
      // Raised phone.
      ctx.fillStyle = '#14101c';
      ctx.fillRect(6, -20, 8, 13);
      ctx.fillStyle = '#9be8ff';
      ctx.fillRect(7, -19, 6, 9);
      // REC bug above the head.
      ctx.fillStyle = '#ff2e3e';
      ctx.beginPath();
      ctx.arc(-2, -26, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('REC', -2, -23);
    }
    ctx.restore();
  }
}

/** Police cruisers, roadblocks and the SWAT van. */
function drawPolice(ctx, state) {
  for (const block of state.roadblocks) {
    ctx.save();
    ctx.translate(block.x, block.y);
    ctx.rotate(block.angle);
    ctx.fillStyle = '#ff5f2e';
    ctx.fillRect(-26, -12, 52, 24);
    ctx.fillStyle = '#fff7e6';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROADBLOCK', 0, 4);
    ctx.restore();
  }
  for (const cop of state.police) {
    ctx.save();
    ctx.translate(cop.x, cop.y);
    ctx.rotate(cop.angle);
    const w = cop.kind === 'swat' ? 52 : 46;
    const h = cop.kind === 'swat' ? 28 : 24;
    ctx.fillStyle = '#00000033';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    ctx.fillStyle = cop.kind === 'swat' ? '#232a3a' : '#1d2433';
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 7);
    ctx.fill();
    ctx.fillStyle = '#f4f6f8';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, 7);
    ctx.fillStyle = '#bfe9ff';
    ctx.fillRect(0, -h / 2 + 4, 12, h - 8);
    // Flashing light bar.
    const flash = Math.sin(cop.sirenT * 10) > 0;
    ctx.fillStyle = flash ? '#ff2e3e' : '#2e7bff';
    ctx.beginPath();
    ctx.arc(-6, -h / 2 + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#2e7bff' : '#ff2e3e';
    ctx.beginPath();
    ctx.arc(6, -h / 2 + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    if (cop.kind === 'swat') {
      ctx.fillStyle = '#fff7e6';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SWAT', 0, 4);
    }
    ctx.restore();
  }
}

/** The news helicopter: body, tail, spinning rotor and a spotlight pool. */
function drawHeli(ctx, state) {
  const heli = state.heli;
  if (!heli.active) return;
  // Spotlight pool on the ground below.
  ctx.fillStyle = '#fff7e633';
  ctx.beginPath();
  ctx.ellipse(heli.x + 40, heli.y + 60, 90, 55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(heli.x, heli.y);
  ctx.fillStyle = '#00000030';
  ctx.beginPath();
  ctx.ellipse(6, 8, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.heli;
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.heliStripe;
  ctx.fillRect(-32, -4, 64, 8);
  ctx.fillStyle = '#bfe9ff';
  ctx.beginPath();
  ctx.ellipse(16, 0, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#14101c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-52, -6);
  ctx.stroke();
  // Rotor: two blades spinning.
  ctx.strokeStyle = '#14101c';
  ctx.lineWidth = 4;
  const r = heli.rotor;
  ctx.beginPath();
  ctx.moveTo(Math.cos(r) * -44, Math.sin(r) * -44);
  ctx.lineTo(Math.cos(r) * 44, Math.sin(r) * 44);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(Math.cos(r + Math.PI / 2) * -44, Math.sin(r + Math.PI / 2) * -44);
  ctx.lineTo(Math.cos(r + Math.PI / 2) * 44, Math.sin(r + Math.PI / 2) * 44);
  ctx.stroke();
  ctx.fillStyle = '#ff2e3e';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VIDRIO TV', 0, -24);
  ctx.restore();
}

/** The player on foot: orange jacket, yellow shirt, facing the way they move. */
function drawPlayer(ctx, state) {
  const p = state.player;
  if (!p.onFoot) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#0000002e';
  ctx.beginPath();
  ctx.ellipse(2, 3, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerShirt;
  ctx.beginPath();
  ctx.arc(5, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241f2e';
  ctx.beginPath();
  ctx.arc(9, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  // Punch swing.
  if (p.punchT > 0.15) {
    ctx.strokeStyle = '#fff7e6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, -8);
    ctx.lineTo(30, -14);
    ctx.stroke();
  }
  ctx.restore();
  // "Press E" prompt when a stealable car is near.
  const car = state.cars.find((c) => !c.player && Math.hypot(c.x - p.x, c.y - p.y) < 78);
  if (car) {
    ctx.fillStyle = '#14101c';
    ctx.fillRect(p.x - 52, p.y - 52, 104, 24);
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 52, p.y - 52, 104, 24);
    ctx.fillStyle = '#fff7e6';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(car.special ? 'E — STEAL THE COMET GT' : 'E — STEAL THIS CAR', p.x, p.y - 36);
  }
}

/** Particles and floating score text. */
function drawEffects(ctx, state) {
  for (const e of state.effects) {
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife);
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  // Mission marker: a pulsing ring and a beam on the ground.
  if (state.mission.marker && !state.mission.done) {
    const m = state.mission.marker;
    const pulse = 26 + Math.sin(state.time * 5) * 8;
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(m.x, m.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd94d33';
    ctx.beginPath();
    ctx.arc(m.x, m.y, pulse - 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#241f2e';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼ ' + state.mission.markerText.toUpperCase(), m.x, m.y - pulse - 12);
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

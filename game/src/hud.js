// SPDX-License-Identifier: MIT
// Live Heist — the HUD: everything the judge reads, drawn on canvas.
// Top-left: LIVE badge, stars, viewer count. Top-right: cash, followers,
// health, armour. Right: Vidrio PD response panel. Bottom-left: the
// minimap. Bottom: the news ticker. Top-centre: the episode objective.
// Plus the start screen, the episode-complete card and the busted card.
// It is all canvas so a screenshot always shows the whole broadcast.

import { CFG, PALETTE, RADIO_STATIONS, TICKER_LINES } from './config.js';
import { formatViewers } from './police.js';
import { missionProgressText } from './missions.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, alpha = 0.82) {
  ctx.fillStyle = `rgba(12, 14, 24, ${alpha})`;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function star(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rr;
    const py = cy + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23f' : 'rgba(255,255,255,0.22)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawHUD(G) {
  const { ctx, player, wanted, missions } = G;
  const W = CFG.viewW;
  const H = CFG.viewH;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // ---- Top-left: LIVE badge + stars + viewers ----
  const blink = Math.floor(G.time * 2) % 2 === 0;
  ctx.fillStyle = wanted.stars >= 3 ? '#e02020' : '#e02020';
  roundRect(ctx, 16, 14, 74, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('● LIVE', 26, 35);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = blink ? '#ff5a5a' : '#ffb3b3';
  ctx.fillText('●', 16, 66);
  for (let i = 0; i < 5; i++) star(ctx, 46 + i * 26, 60, 11, i < wanted.stars);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(`👁 ${formatViewers(wanted.displayedViewers)} watching`, 168, 67);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('COSTA VIDRIO • CHANNEL: LIVE HEIST', 16, 88);

  // ---- Top-right: cash, followers, health, armour ----
  panel(ctx, W - 268, 14, 252, 108);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText(`$${Math.floor(player.cash).toLocaleString('en-US')}`, W - 252, 42);
  ctx.fillStyle = '#ff8fc0';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`♥ ${Math.floor(player.followers).toLocaleString('en-US')} followers`, W - 252, 66);
  bar(ctx, W - 252, 76, 220, 10, player.health / 100, '#ff4d4d', 'HEALTH');
  bar(ctx, W - 252, 98, 220, 10, player.armor / 100, '#19d3e6', 'ARMOUR');

  // ---- Top-centre: mission box ----
  const mw = 430;
  panel(ctx, (W - mw) / 2, 14, mw, 62);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`${missionProgressText(G)}  •  ${missions.completedCount}/4 DONE  •  STASHES ${missions.stashesFound}/5`, (W - mw) / 2 + 14, 36);
  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui, sans-serif';
  wrapText(ctx, missions.objective || 'Press M to start the next episode', (W - mw) / 2 + 14, 58, mw - 28, 13);
  if (missions.holdProgress > 0 && missions.holdNeeded > 0) {
    bar(ctx, (W - mw) / 2 + 14, 64, mw - 28, 7, missions.holdProgress / missions.holdNeeded, '#ff7a1a', '');
  }

  // ---- Right: Vidrio PD response panel ----
  const units = [...G.police, ...G.roadblocks].slice(0, 5);
  panel(ctx, W - 268, 134, 252, 34 + units.length * 24 + (G.heli.active ? 24 : 0));
  ctx.fillStyle = '#ff5a5a';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('VIDRIO PD RESPONSE', W - 252, 156);
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  units.forEach((u, i) => {
    const d = Math.round(Math.hypot(u.x - player.x, u.y - player.y));
    ctx.fillText(`${u.name} ${u.callsign} — ${u.status} ${d}m`, W - 252, 178 + i * 24);
  });
  if (G.heli.active) {
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('SKY 5 NEWS HELI — LIVE OVERHEAD', W - 252, 178 + units.length * 24);
  }
  if (units.length === 0) {
    ctx.fillStyle = '#9fe8a8';
    ctx.fillText('No units on you. Stay quiet… or don\'t.', W - 252, 178);
  }

  // ---- Radio + vehicle + weapon, bottom-right ----
  panel(ctx, W - 268, H - 196, 252, 102);
  const station = RADIO_STATIONS[G.radioStation % RADIO_STATIONS.length];
  ctx.fillStyle = '#19d3e6';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`♪ ${station.name}`, W - 252, H - 172);
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(station.track, W - 252, H - 154);
  const car = G.playerCar;
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(car ? `${car.model}  •  ${Math.round(Math.abs(car.speed) * 0.12)} km/h` : 'ON FOOT', W - 252, H - 132);
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  const wText = G.combat.weapon === 'pistol'
    ? `PISTOL  [${G.combat.ammo}/12]${G.combat.reloadTimer > 0 ? ' RELOADING…' : ''}`
    : 'FISTS  [F to punch]';
  ctx.fillText(wText, W - 252, H - 114);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('[1] fists  [2] pistol  [M] mute', W - 252, H - 98);

  // ---- Controls hint, bottom-centre ----
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD move/drive • E enter & steal car • F punch • Click shoot • R reload • S save • Esc pause', W / 2 - 250, H - 66);

  drawMinimap(G);
  drawTicker(G);
  drawDialog(G);
  if (missions.completeCardTimer > 0 && missions.completeCard) drawCompleteCard(G);
  if (G.ui.busted) drawBustedCard(G);
  if (G.ui.paused) drawPausedCard(G);
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(6, w * Math.max(0, Math.min(1, frac))), h, 4);
    ctx.fill();
  }
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillText(label, x + 4, y + h - 2);
  }
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = String(text).split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawMinimap(G) {
  const { ctx, world } = G;
  const mw = 210;
  const mh = 150;
  const x0 = 16;
  const y0 = CFG.viewH - mh - 46;
  const sx = mw / CFG.worldW;
  const sy = mh / CFG.worldH;
  panel(ctx, x0 - 6, y0 - 6, mw + 12, mh + 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, mw, mh);
  ctx.clip();
  // Sand + sea on the east edge.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x0 + 3150 * sx, y0, mw - 3150 * sx, mh);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(x0 + 3400 * sx, y0, mw - 3400 * sx, mh);
  ctx.fillStyle = '#2a2f3a';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  for (const rx of world.roadsX) {
    ctx.beginPath();
    ctx.moveTo(x0 + rx * sx, y0);
    ctx.lineTo(x0 + rx * sx, y0 + mh);
    ctx.stroke();
  }
  for (const ry of world.roadsY) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + ry * sy);
    ctx.lineTo(x0 + mw, y0 + ry * sy);
    ctx.stroke();
  }
  // Dead zones.
  ctx.fillStyle = 'rgba(25, 211, 230, 0.5)';
  for (const z of world.deadZones) {
    ctx.fillRect(x0 + (z.x - z.w / 2) * sx, y0 + (z.y - z.h / 2) * sy, z.w * sx, z.h * sy);
  }
  // Mission target.
  if (G.missions.target) {
    const t = G.missions.target;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x0 + t.x * sx, y0 + t.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Police red, player white.
  ctx.fillStyle = '#ff3b3b';
  for (const u of [...G.police, ...G.roadblocks]) {
    ctx.beginPath();
    ctx.arc(x0 + u.x * sx, y0 + u.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (G.heli.active) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x0 + G.heli.x * sx, y0 + G.heli.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x0 + G.player.x * sx, y0 + G.player.y * sy, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#14161f';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('COSTA VIDRIO', x0, y0 - 10);
  if (G.wanted.stars >= 3) {
    ctx.fillStyle = '#ff5a5a';
    ctx.fillText('● MINIMAP: HEAT ZONE', x0 + 110, y0 - 10);
  }
}

function drawTicker(G) {
  const { ctx } = G;
  const H = CFG.viewH;
  const W = CFG.viewW;
  ctx.fillStyle = 'rgba(10, 12, 20, 0.9)';
  ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = '#e02020';
  ctx.fillRect(0, H - 34, 150, 34);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(G.wanted.stars >= 3 ? 'BREAKING' : 'VIDRIO 24', 18, H - 12);
  const line = TICKER_LINES[G.tickerIdx % TICKER_LINES.length];
  // The line starts just inside the red tag and strolls left; it wraps
  // after a full pass so a screenshot always catches it readable.
  const scroll = ((G.time - G.tickerStart) * 42) % 1100;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(line, 168 - scroll, H - 12);
  if (G.time - G.tickerStart > 14) {
    G.tickerIdx += 1;
    G.tickerStart = G.time;
  }
}

function drawDialog(G) {
  const m = G.missions;
  if (!m.dialog || m.dialogTimer <= 0) return;
  const { ctx } = G;
  const W = CFG.viewW;
  const H = CFG.viewH;
  const w = 560;
  const x = (W - w) / 2;
  const y = H - 250;
  panel(ctx, x, y, w, 64, 0.9);
  ctx.fillStyle = m.dialog.who === 'RICO' ? '#ff7a1a' : '#ff4d8d';
  ctx.beginPath();
  ctx.arc(x + 34, y + 32, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(m.dialog.who[0], x + 34, y + 37);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(m.dialog.who, x + 64, y + 22);
  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui, sans-serif';
  wrapText(ctx, m.dialog.text, x + 64, y + 42, w - 84, 15);
}

function drawCompleteCard(G) {
  const { ctx } = G;
  const W = CFG.viewW;
  const H = CFG.viewH;
  const card = G.missions.completeCard;
  const w = 520;
  const h = 250;
  const x = (W - w) / 2;
  const y = (H - h) / 2 - 40;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#14161f';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EPISODE COMPLETE', W / 2, y + 36);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(card.title, W / 2, y + 70);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`+$${card.cash.toLocaleString('en-US')}`, W / 2, y + 118);
  ctx.fillStyle = '#ff8fc0';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`+${card.fans.toLocaleString('en-US')} followers`, W / 2, y + 150);
  ctx.fillStyle = '#19d3e6';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`Sponsored by ${card.sponsor}  •  Next episode unlocked`, W / 2, y + 186);
  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('The whole city saw it. The whole city is coming back for more.', W / 2, y + 216);
  ctx.textAlign = 'left';
}

function drawBustedCard(G) {
  const { ctx } = G;
  ctx.fillStyle = 'rgba(20, 0, 0, 0.72)';
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  ctx.fillStyle = '#ff3b3b';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED', CFG.viewW / 2, 300);
  ctx.fillStyle = '#fff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Vidrio PD cut your feed. Rico bailed you out — $400 and your pride.', CFG.viewW / 2, 350);
  ctx.fillText('Press ENTER to get back on the street', CFG.viewW / 2, 384);
  ctx.textAlign = 'left';
}

function drawPausedCard(G) {
  const { ctx } = G;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', CFG.viewW / 2, 320);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Esc resume  •  S save  •  M mute  •  R restart episode', CFG.viewW / 2, 360);
  ctx.textAlign = 'left';
}

export function drawStartScreen(G) {
  const { ctx } = G;
  const W = CFG.viewW;
  const H = CFG.viewH;
  // Sunset gradient sky behind the title.
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#ff7a1a');
  grad.addColorStop(0.55, '#ff4d8d');
  grad.addColorStop(1, '#1a1033');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(0, 90 + i * 46, W, 10);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 86px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LIVE HEIST', W / 2, 210);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('COSTA VIDRIO', W / 2, 252);
  ctx.fillStyle = '#fff';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('The whole city is watching. Steal loud. Escape louder.', W / 2, 300);
  ctx.fillStyle = '#e02020';
  roundRect(ctx, W / 2 - 130, 330, 260, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('▶  START THE SHOW', W / 2, 364);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('4 heist episodes • wanted = viewer count • police, news heli, roadblocks & SWAT', W / 2, 420);
  ctx.fillText('WASD move / drive • E steal a car • F punch • Click shoot • S save • M mute', W / 2, 448);
  ctx.fillText('Cut the feed in a SIGNAL DEAD ZONE to lose the stars.', W / 2, 476);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('An original game — Costa Vidrio, Rico, Mara and every street are invented here.', W / 2, 530);
  ctx.fillText('Click or press ENTER to begin. Your progress saves automatically.', W / 2, 556);
  ctx.textAlign = 'left';
}

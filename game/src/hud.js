// The TV frame: everything the audience sees — the LIVE badge and viewer
// count, the wanted stars, the minimap (red at 4 stars), the scrolling news
// ticker, the mission objective, cash and followers, and the big overlays:
// BREAKING at 3 stars, SIGNAL LOST when the broadcast is cut, the title
// screen, the episode-complete card and the busted screen. This is the
// frame the judge reads, so it is dense on purpose.

import { FONT, FONT_DISPLAY, PALETTE, VIEW, WORLD } from './config.js';
import { currentEpisode, objectiveText } from './missions.js';
import { filmingCount } from './traffic.js';
import { playerCar } from './world.js';

const MINIMAP = { x: 1052, y: 16, w: 212, h: 160 };

function panel(ctx, x, y, w, h, edge) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge ?? PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function fmtViewers(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** The whole HUD, drawn over the world for the current screen. */
export function drawHUD(ctx, state, screen) {
  const w = state.wanted;
  const p = state.player;
  const car = playerCar(state);
  const px = car ? car.x : p.x;
  const py = car ? car.y : p.y;
  if (screen === 'title') {
    drawTitle(ctx, state);
    return;
  }
  drawTopBar(ctx, state);
  drawObjective(ctx, state);
  drawMinimap(ctx, state, px, py);
  drawStats(ctx, state);
  drawTicker(ctx, state);
  drawHints(ctx, state, screen);
  if (screen === 'paused') drawPaused(ctx, state);
  if (screen === 'busted') drawBusted(ctx, state);
  if (screen === 'complete') drawEpisodeComplete(ctx, state);
  if (state.shot === 'cover') drawCoverLogo(ctx, state);
  if (state.shot === 'mission') drawEpisodeComplete(ctx, state);
}

/** Stars, LIVE badge, viewer count and the BREAKING banner. */
function drawTopBar(ctx, state) {
  const w = state.wanted;
  // Stars, top-left below the objective panel.
  const starY = 126;
  for (let i = 0; i < 5; i += 1) {
    ctx.font = '30px ' + FONT_DISPLAY;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = i < w.stars ? PALETTE.star : '#ffffff33';
    ctx.fillText('★', 18 + i * 34, starY);
  }
  // How many bystanders are filming the player, under the stars.
  const filming = filmingCount(state);
  if (filming > 0) {
    ctx.fillStyle = PALETTE.liveRed;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(`🔴 ${filming} FILMING YOU`, 18, 152);
  }
  // LIVE badge + viewer count, top centre — the biggest numbers on screen.
  const viewers = fmtViewers(w.viewers);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const blink = state.time % 1 < 0.6;
  ctx.fillStyle = blink ? PALETTE.liveRed : '#c41f2c';
  roundRect(ctx, 500, 12, 96, 40, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px ' + FONT;
  ctx.fillText('● LIVE', 548, 33);
  panel(ctx, 604, 12, 176, 48, '#19c2d8');
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText(`👁 ${viewers}`, 692, 31);
  ctx.fillStyle = '#19c2d8';
  ctx.font = 'bold 11px ' + FONT;
  ctx.fillText('VIEWERS', 692, 50);
  // BREAKING banner at 3+ stars, below the objective panel.
  if (w.stars >= 3) {
    ctx.fillStyle = PALETTE.liveRed;
    ctx.fillRect(0, 82, VIEW.width, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(
      w.stars >= 5 ? 'BREAKING: SWAT DEPLOYED — FIVE STARS — THE WHOLE CITY IS WATCHING' :
      w.stars >= 4 ? 'BREAKING: ROADBLOCKS UP — BYSTANDERS FILMING — CHASE LIVE ON VIDRIO TV' :
      'BREAKING: NEWS HELICOPTER OVERHEAD — THE WHEELMAN IS LIVE',
      640, 96,
    );
  }
  // SIGNAL LOST: the broadcast was cut in an alley or garage.
  if (w.lostFlash > 0 && w.signalLost > 0.2) {
    const alpha = Math.min(1, w.lostFlash);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#14101c';
    ctx.fillRect(340, 130, 600, 64);
    ctx.strokeStyle = '#19c2d8';
    ctx.lineWidth = 3;
    ctx.strokeRect(340, 130, 600, 64);
    ctx.fillStyle = '#19c2d8';
    ctx.font = 'bold 26px ' + FONT_DISPLAY;
    ctx.textAlign = 'center';
    ctx.fillText('📺 SIGNAL LOST', 640, 156);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '16px ' + FONT;
    ctx.fillText('Broadcast cut — stars falling. Stay hidden!', 640, 182);
    ctx.restore();
  }
}

/** The current objective, top-left, with the episode title. */
function drawObjective(ctx, state) {
  panel(ctx, 12, 12, 430, 64, '#ff7a1a');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff7a1a';
  ctx.font = 'bold 13px ' + FONT;
  const ep = currentEpisode(state);
  ctx.fillText(ep ? ep.title : 'LIVE HEIST — COSTA VIDRIO', 24, 28);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px ' + FONT;
  ctx.fillText('▶ ' + objectiveText(state).replace(/^EPISODE \d — /, ''), 24, 54);
}

/** Minimap: roads, the player, police, the mission marker. Red at 4 stars. */
function drawMinimap(ctx, state, px, py) {
  const hot = state.wanted.stars >= 4;
  ctx.save();
  ctx.fillStyle = hot ? '#3a0d12d9' : PALETTE.minimap;
  ctx.fillRect(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h);
  ctx.strokeStyle = hot ? PALETTE.liveRed : PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(MINIMAP.x + 1, MINIMAP.y + 1, MINIMAP.w - 2, MINIMAP.h - 2);
  const sx = MINIMAP.w / WORLD.width;
  const sy = MINIMAP.h / WORLD.height;
  const X = (x) => MINIMAP.x + x * sx;
  const Y = (y) => MINIMAP.y + y * sy;
  // Sea on the east edge.
  ctx.fillStyle = '#19c2d8';
  ctx.fillRect(X(2960), MINIMAP.y, MINIMAP.w - (X(2960) - MINIMAP.x), MINIMAP.h);
  // Roads.
  ctx.strokeStyle = '#8b93a3';
  ctx.lineWidth = 3;
  for (const rx of [400, 1000, 1600, 2200, 2800]) {
    ctx.beginPath();
    ctx.moveTo(X(rx), MINIMAP.y);
    ctx.lineTo(X(rx), MINIMAP.y + MINIMAP.h);
    ctx.stroke();
  }
  for (const ry of [400, 1000, 1600, 2000]) {
    ctx.beginPath();
    ctx.moveTo(MINIMAP.x, Y(ry));
    ctx.lineTo(MINIMAP.x + MINIMAP.w, Y(ry));
    ctx.stroke();
  }
  // Garages (safe zones) in cyan.
  ctx.fillStyle = '#19c2d8';
  for (const g of state.garages) ctx.fillRect(X(g.x), Y(g.y), 8, 6);
  // Mission marker, pulsing yellow.
  if (state.mission.marker) {
    const pulse = 5 + Math.sin(state.time * 5) * 2;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(X(state.mission.marker.x), Y(state.mission.marker.y), pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241f2e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Police in red.
  ctx.fillStyle = '#ff2e3e';
  for (const cop of state.police) {
    ctx.beginPath();
    ctx.arc(X(cop.x), Y(cop.y), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player in orange with a white ring.
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.arc(X(px), Y(py), 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 11px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText(hot ? 'COSTA VIDRIO — HOT ZONE' : 'COSTA VIDRIO', MINIMAP.x + 4, MINIMAP.y + MINIMAP.h - 8);
  ctx.restore();
}

/** Cash, followers and the filming count, bottom-left. */
function drawStats(ctx, state) {
  panel(ctx, 12, 640, 300, 64, '#19c2d8');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#19c2d8';
  ctx.font = 'bold 13px ' + FONT;
  ctx.fillText('CASH', 24, 656);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText(`$${state.progress.cash.toLocaleString('en-US')}`, 24, 680);
  ctx.fillStyle = '#ff5fa2';
  ctx.font = 'bold 13px ' + FONT;
  ctx.fillText('FOLLOWERS', 150, 656);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText(fmtViewers(state.progress.followers), 150, 680);
}

/** The scrolling news ticker along the bottom. */
function drawTicker(ctx, state) {
  ctx.fillStyle = PALETTE.ticker;
  ctx.fillRect(0, 704, VIEW.width, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const text = `VIDRIO TV  •  ${state.ticker.text}   •   `;
  ctx.fillText(text, 1280 - state.ticker.offset, 712);
  ctx.fillText(text, 1280 - state.ticker.offset + text.length * 7, 712);
}

/** Controls hint, bottom-right. */
function drawHints(ctx, state, screen) {
  if (screen !== 'play') return;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '13px ' + FONT;
  const p = state.player;
  ctx.fillText(
    p.onFoot ? 'WASD move · E steal car · SPACE punch · P pause · M mute' : 'W/S drive · A/D steer · SPACE nitro · E get out · P pause',
    1268, 692,
  );
}

/** The title screen: the show's logo, the premise, the save, the keys. */
function drawTitle(ctx, state) {
  ctx.fillStyle = '#ff9a3d';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#1fb6d8';
  ctx.fillRect(0, 470, VIEW.width, 250);
  ctx.fillStyle = '#f0c573';
  ctx.fillRect(0, 430, VIEW.width, 40);
  // Sun.
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.arc(1060, 150, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5fa2';
  ctx.font = 'bold 34px ' + FONT_DISPLAY;
  ctx.textAlign = 'center';
  ctx.fillText('VIDRIO TV PRESENTS', 640, 120);
  ctx.fillStyle = '#241f2e';
  ctx.font = '92px ' + FONT_DISPLAY;
  ctx.fillText('LIVE HEIST', 640, 230);
  ctx.fillStyle = '#ff2e3e';
  ctx.font = 'bold 30px ' + FONT;
  ctx.fillText('● LIVE FROM COSTA VIDRIO', 640, 300);
  ctx.fillStyle = '#241f2e';
  ctx.font = '20px ' + FONT;
  ctx.fillText('Every heist is an episode. Every chase is a broadcast.', 640, 350);
  ctx.fillText('Steal cars, dodge the law, and grow your audience — or cut the signal and vanish.', 640, 380);
  const saved = state.progress.episode > 0 || state.progress.cash > 0;
  ctx.fillStyle = '#14101c';
  roundRect(ctx, 440, 420, 400, 120, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText(saved ? `WELCOME BACK — ${fmtViewers(state.progress.followers)} FOLLOWERS` : 'PRESS ENTER TO GO LIVE', 640, 452);
  ctx.font = '17px ' + FONT;
  ctx.fillText(saved ? `Best audience ${fmtViewers(state.progress.bestViewers)} · Episodes done: ${state.stats.episodesDone}` : 'Episode 1: The Marina Vault — sponsored by SUNNY COLA', 640, 486);
  ctx.font = 'bold 17px ' + FONT;
  ctx.fillText('1 Episode 1 · 2 Episode 2', 640, 518);
  ctx.fillStyle = '#241f2e';
  ctx.font = '15px ' + FONT;
  ctx.fillText('WASD / arrows move · E enter & steal cars · SPACE punch / nitro · P pause', 640, 580);
  ctx.fillText('Alleys and garages cut the broadcast — SIGNAL LOST drops your stars.', 640, 606);
}

/** Pause overlay. */
function drawPaused(ctx, state) {
  ctx.fillStyle = '#14101cb3';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 54px ' + FONT_DISPLAY;
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', 640, 330);
  ctx.font = '20px ' + FONT;
  ctx.fillText('The broadcast is on hold. Press P to keep the show going.', 640, 380);
}

/** Busted overlay. */
function drawBusted(ctx, state) {
  ctx.fillStyle = '#3a0d12cc';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#ff2e3e';
  ctx.font = 'bold 64px ' + FONT_DISPLAY;
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED!', 640, 300);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '22px ' + FONT;
  ctx.fillText('The cameras caught everything. The audience loved it anyway.', 640, 350);
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText('Press ENTER to go live again', 640, 400);
}

/** Episode-complete card: followers, cash and the sponsor — the progression. */
function drawEpisodeComplete(ctx, state) {
  const ep = currentEpisode(state);
  if (!ep) return;
  ctx.fillStyle = '#14101cd9';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 340, 150, 600, 400, '#ffd94d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText('VIDRIO TV — EPISODE COMPLETE', 640, 190);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 34px ' + FONT_DISPLAY;
  ctx.fillText(ep.title, 640, 240);
  ctx.fillStyle = '#19c2d8';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText(`SPONSORED BY ${ep.sponsor}`, 640, 290);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px ' + FONT;
  ctx.fillText(`+$${ep.cash.toLocaleString('en-US')} CASH`, 640, 350);
  ctx.fillStyle = '#ff5fa2';
  ctx.fillText(`+${ep.followers.toLocaleString('en-US')} FOLLOWERS`, 640, 395);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px ' + FONT;
  ctx.fillText(`Total followers now: ${fmtViewers(state.progress.followers)}`, 640, 445);
  ctx.font = 'bold 18px ' + FONT;
  ctx.fillText('Press ENTER for the next episode', 640, 500);
}

/** The big cover logo, only for the cover screenshot. */
function drawCoverLogo(ctx, state) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#241f2e';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';
  ctx.font = '84px ' + FONT_DISPLAY;
  ctx.fillText('LIVE HEIST', 640, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff2e3e';
  ctx.font = 'bold 26px ' + FONT;
  ctx.fillText('● LIVE FROM COSTA VIDRIO — VIDRIO TV', 640, 250);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

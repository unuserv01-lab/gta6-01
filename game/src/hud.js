// LIVE HEIST — hud.js
// The TV frame: LIVE badge + viewer count, the LIVE HEIST wordmark, wanted stars,
// cash + followers, a minimap, the mission objective, the news ticker, toasts
// and episode banners. Everything the judge needs to read is on this layer.

import { PALETTE, WORLD_H, WORLD_W, clamp, formatCount, formatMoney } from './config.js';
import { objectiveText } from './missions.js';

const MAP_W = 216;
const MAP_H = 162;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawStars(ctx, x, y, stars) {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? '#ffb703' : 'rgba(255,255,255,0.28)';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('★', x + i * 26, y);
  }
}

/** The minimap: roads, beach, garage, player, police, heli, mission marker. */
export function drawMinimap(ctx, state, x, y) {
  const sx = MAP_W / WORLD_W;
  const sy = MAP_H / WORLD_H;
  panel(ctx, x, y, MAP_W, MAP_H);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, MAP_W - 4, MAP_H - 4, 8);
  ctx.clip();
  ctx.fillStyle = '#79c25f';
  ctx.fillRect(x, y, MAP_W, MAP_H);
  ctx.fillStyle = '#f2d492';
  ctx.fillRect(x, y + MAP_H - 12, MAP_W, 12);
  ctx.fillStyle = '#2fa8c9';
  ctx.fillRect(x, y + MAP_H - 6, MAP_W, 6);
  ctx.fillStyle = '#3d414d';
  for (const r of state.world.roads) ctx.fillRect(x + r.x * sx, y + r.y * sy, Math.max(2, r.w * sx), Math.max(2, r.h * sy));
  // Garage.
  ctx.fillStyle = '#5b6b7a';
  ctx.fillRect(x + state.world.garage.x * sx, y + state.world.garage.y * sy, 12, 8);
  // Mission marker.
  if (state.missions.active !== null) {
    const pulse = 3 + Math.sin(state.time * 6) * 1.5;
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(x + state.missions.marker.x * sx, y + state.missions.marker.y * sy, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police.
  ctx.fillStyle = '#2d7bff';
  for (const car of state.police.cars) {
    ctx.beginPath();
    ctx.arc(x + car.x * sx, y + car.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const van of state.police.swat) {
    ctx.fillStyle = '#7b2dff';
    ctx.beginPath();
    ctx.arc(x + van.x * sx, y + van.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.heli.active) {
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(x + state.heli.x * sx, y + state.heli.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const px = x + state.player.x * sx;
  const py = y + state.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // Red frame at 4+ stars — the city is on alert.
  if (state.police.stars >= 4) {
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, MAP_W - 3, MAP_H - 3);
  }
}

/** The whole HUD, drawn over the world. */
export function drawHud(ctx, state, w, h) {
  const police = state.police;
  const stats = state.stats;

  // --- Top-left: LIVE HEIST wordmark + LIVE badge + viewers + stars + money.
  panel(ctx, 14, 14, 268, 118);
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LIVE HEIST', 26, 40);
  ctx.fillStyle = '#38b6d3';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('COSTA VIDRIO • SEASON 1', 26, 56);
  const blink = Math.floor(state.time * 2.4) % 2 === 0;
  ctx.fillStyle = PALETTE.liveRed;
  ctx.beginPath();
  ctx.roundRect(26, 66, 62, 22, 5);
  ctx.fill();
  if (blink) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(36, 77, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('LIVE', 46, 81);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`${formatCount(police.viewers)} MENONTON`, 96, 81);
  drawStars(ctx, 26, 112, police.stars);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(formatMoney(stats.cash), 168, 110);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`FOLLOWERS ${formatCount(stats.followers)}`, 26, 126);

  // --- Top-right: minimap + health.
  drawMinimap(ctx, state, w - MAP_W - 14, 14);
  panel(ctx, w - MAP_W - 14, 14 + MAP_H + 8, MAP_W, 26);
  ctx.fillStyle = '#e63946';
  ctx.fillRect(w - MAP_W - 4, 14 + MAP_H + 18, (MAP_W - 20) * clamp(state.player.health / 100, 0, 1), 6);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SEHAT ${Math.max(0, Math.ceil(state.player.health))}%`, w - MAP_W + 2, 14 + MAP_H + 17);
  ctx.textAlign = 'right';
  ctx.fillText(state.player.car ? 'DI MOBIL' : 'JALAN KAKI', w - 20, 14 + MAP_H + 17);
  ctx.textAlign = 'left';

  // --- Top-center: objective banner.
  const objective = objectiveText(state);
  ctx.font = 'bold 14px sans-serif';
  const ow = ctx.measureText(objective).width + 28;
  panel(ctx, (w - ow) / 2, 14, ow, 34);
  ctx.fillStyle = '#ffb703';
  ctx.textAlign = 'center';
  ctx.fillText(`◎ ${objective}`, w / 2, 36);
  ctx.textAlign = 'left';

  // --- Episode banner (big, centre).
  if (state.missions.bannerT > 0 && state.missions.banner) {
    const alpha = clamp(state.missions.bannerT, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 30px sans-serif';
    const bw = ctx.measureText(state.missions.banner).width + 48;
    panel(ctx, (w - bw) / 2, 120, bw, 52);
    ctx.fillStyle = '#ffb703';
    ctx.textAlign = 'center';
    ctx.fillText(state.missions.banner, w / 2, 155);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  // --- Toasts under the objective.
  ctx.font = '13px sans-serif';
  let ty = 62;
  for (const toast of state.toasts) {
    ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
    const tw = ctx.measureText(toast.text).width + 20;
    ctx.beginPath();
    ctx.roundRect((w - tw) / 2, ty, tw, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(toast.text, w / 2, ty + 17);
    ctx.textAlign = 'left';
    ty += 30;
  }

  // --- Bottom: news ticker.
  const tickerH = 30;
  panel(ctx, 14, h - tickerH - 12, w - 28, tickerH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, h - tickerH - 12, w - 32, tickerH);
  ctx.clip();
  const items = state.ticker.length > 0 ? state.ticker : ['TV-7 COSTA VIDRIO — kota menyiarkanmu secara live'];
  const line = items.join('   •   ') + '   •   ';
  ctx.font = 'bold 13px sans-serif';
  const lw = ctx.measureText(line).width;
  const offset = (state.time * 60) % (lw || 1);
  ctx.fillStyle = police.stars >= 4 ? '#ff8a8a' : '#bdefff';
  ctx.fillText(line, 22 - offset, h - 20);
  ctx.fillText(line, 22 - offset + lw, h - 20);
  ctx.restore();

  // --- Bottom-left: controls hint.
  ctx.fillStyle = 'rgba(12, 16, 28, 0.6)';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD gerak • E curi/keluar mobil • Klik tembak • Spasi pukul • Shift lari • P jeda • M misi', 18, h - 52);
}

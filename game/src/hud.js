// HUD: everything the player reads while playing — the wanted stars, the
// LIVE badge with the viewer count, money and followers, the mission
// objective, the scrolling news ticker, and the minimap. The HUD is drawn
// on the canvas so the screenshots carry it exactly as the player sees it.
import {
  GAME_TITLE,
  HORIZONTAL_ROADS,
  PALETTE,
  VERTICAL_ROADS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  formatMoney,
  formatViewers,
} from './config.js';

const TICKER_LINES = [
  'BREAKING: Aksi kejar-kejaran live di Costa Vidrio — penonton tembus rekor!',
  'SPONSOR VOLT COLA: "Dia gila, tapi ratingnya gila juga!"',
  'WARGA MEREKAM: puluhan HP terangkat di Avenida Sol saat pengejaran',
  'POLISI COSTA VIDRIO: "Kami akan menangkap bintang live itu!"',
  'CUACA CERAH di Costa Vidrio — sempurna untuk episode heist berikutnya',
  'SURF & SOLE umumkan sponsor episode 2: konvoi berlian!',
];

const MINIMAP_W = 200;
const MINIMAP_H = 146;

/** Draw the full HUD over a playing frame. */
export function drawHud(ctx, state) {
  const { player } = state;
  drawTopBar(ctx, state);
  drawStars(ctx, player);
  drawObjective(ctx, state);
  drawTicker(ctx, state);
  drawMinimap(ctx, state);
  drawBottomLeft(ctx, player);
  if (state.messageT > 0 && state.message) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.messageT);
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(state.message).width + 36;
    ctx.fillStyle = PALETTE.hudPanel;
    roundRect(ctx, VIEW_WIDTH / 2 - w / 2, 96, w, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(state.message, VIEW_WIDTH / 2, 120);
    ctx.restore();
  }
}

/** Top-left: LIVE badge, viewer count, money, followers. */
function drawTopBar(ctx, state) {
  const { player } = state;
  ctx.save();
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, 12, 12, 300, 64, 10);
  ctx.fill();
  // LIVE badge.
  const blink = Math.floor(state.time * 2) % 2 === 0;
  ctx.fillStyle = blink ? PALETTE.liveRed : '#c81e3a';
  roundRect(ctx, 24, 24, 62, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('● LIVE', 32, 42);
  // Viewer count.
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(formatViewers(player.viewers) + ' menonton', 96, 44);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(formatMoney(player.money) + '   ♥ ' + formatViewers(player.followers) + ' followers', 24, 66);
  ctx.restore();
}

/** Wanted stars, top centre, with the TV frame when the heli is up. */
function drawStars(ctx, player) {
  ctx.save();
  const cx = VIEW_WIDTH / 2;
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, cx - 110, 12, 220, 44, 10);
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    ctx.font = '26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = i < player.stars ? PALETTE.starGold : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', cx - 80 + i * 40, 44);
  }
  if (player.stars >= 3) {
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#ff2d55';
    ctx.fillText('HELI BERITA LIVE', cx, 72);
  }
  ctx.restore();
}

/** The current mission objective, bottom centre. */
function drawObjective(ctx, state) {
  const objective = state.objectiveText;
  if (!objective) return;
  ctx.save();
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const w = Math.min(VIEW_WIDTH - 40, ctx.measureText(objective).width + 32);
  ctx.fillStyle = 'rgba(20, 20, 40, 0.82)';
  roundRect(ctx, VIEW_WIDTH / 2 - w / 2, VIEW_HEIGHT - 96, w, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ctx.fillText(objective, VIEW_WIDTH / 2, VIEW_HEIGHT - 74);
  ctx.restore();
}

/** The scrolling news ticker along the bottom edge. */
function drawTicker(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 24, 0.88)';
  ctx.fillRect(0, VIEW_HEIGHT - 34, VIEW_WIDTH, 34);
  ctx.fillStyle = PALETTE.liveRed;
  ctx.fillRect(0, VIEW_HEIGHT - 34, 150, 34);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BREAKING', 18, VIEW_HEIGHT - 12);
  const line = state.stars >= 4
    ? 'BREAKING: Bintang ' + state.stars + ' — roadblock di Avenida Sol, warga merekam dari trotoar!'
    : TICKER_LINES[Math.floor(state.time / 6) % TICKER_LINES.length];
  state.tickerX -= 1.4;
  const w = ctx.measureText(line).width;
  if (state.tickerX < 150 - w) state.tickerX = VIEW_WIDTH;
  ctx.fillStyle = '#fff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(line, state.tickerX, VIEW_HEIGHT - 12);
  ctx.restore();
}

/** Bottom-left: controls reminder + health of the car. */
function drawBottomLeft(ctx, player) {
  ctx.save();
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const line1 = player.onFoot
    ? 'WASD jalan • E curi mobil • SPACE pukul • F tembak • P jeda'
    : 'WASD mengemudi • E keluar mobil • F tembak • P jeda';
  ctx.fillText(line1, 14, VIEW_HEIGHT - 116);
  if (player.car) {
    ctx.fillStyle = 'rgba(12,16,28,0.78)';
    roundRect(ctx, 12, VIEW_HEIGHT - 152, 160, 18, 6);
    ctx.fill();
    ctx.fillStyle = player.car.hp > 40 ? '#7ee787' : '#ff5d5d';
    ctx.fillRect(16, VIEW_HEIGHT - 149, 152 * Math.max(0, player.car.hp / 100), 12);
    ctx.fillStyle = '#fff';
    ctx.fillText('MOBIL ' + Math.max(0, Math.round(player.car.hp)) + '%', 180, VIEW_HEIGHT - 137);
  }
  ctx.restore();
}

/** The minimap, top-right: roads, beach, mission marker, police, player. */
export function drawMinimap(ctx, state) {
  const { player, world } = state;
  const x0 = VIEW_WIDTH - MINIMAP_W - 12;
  const y0 = 12;
  const sx = MINIMAP_W / WORLD_WIDTH;
  const sy = MINIMAP_H / WORLD_HEIGHT;
  ctx.save();
  ctx.fillStyle = PALETTE.minimapBg;
  roundRect(ctx, x0 - 4, y0 - 4, MINIMAP_W + 8, MINIMAP_H + 8, 10);
  ctx.fill();
  // Ground + beach.
  ctx.fillStyle = '#3a5a3a';
  ctx.fillRect(x0, y0, MINIMAP_W, MINIMAP_H);
  ctx.fillStyle = '#2fb7c9';
  ctx.fillRect(x0 + world.beachX * sx, y0, MINIMAP_W - world.beachX * sx, MINIMAP_H);
  ctx.fillStyle = '#f2dd9e';
  ctx.fillRect(x0 + (world.beachX - 80) * sx, y0, 80 * sx, MINIMAP_H);
  // Roads.
  ctx.strokeStyle = '#8a8f9c';
  ctx.lineWidth = 2;
  for (const rx of VERTICAL_ROADS) {
    ctx.beginPath();
    ctx.moveTo(x0 + rx * sx, y0);
    ctx.lineTo(x0 + rx * sx, y0 + MINIMAP_H);
    ctx.stroke();
  }
  for (const ry of HORIZONTAL_ROADS) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + ry * sy);
    ctx.lineTo(x0 + MINIMAP_W, y0 + ry * sy);
    ctx.stroke();
  }
  // Hideouts (green) and mission marker (pulsing yellow).
  ctx.fillStyle = '#7ee787';
  for (const h of world.hideouts) {
    ctx.fillRect(x0 + h.x * sx - 2, y0 + h.y * sy - 2, 5, 5);
  }
  if (state.mission.stage !== 'none') {
    const pulse = 3 + Math.sin(state.time * 5) * 1.5;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x0 + state.mission.target.x * sx, y0 + state.mission.target.y * sy, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c2433';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x0 + state.mission.target.x * sx, y0 + state.mission.target.y * sy + 3);
  }
  // Police (red) and the player (white arrow).
  ctx.fillStyle = '#ff2d55';
  for (const cop of state.police) {
    ctx.beginPath();
    ctx.arc(x0 + cop.x * sx, y0 + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x0 + player.x * sx, y0 + player.y * sy);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText('COSTA VIDRIO', x0 + 2, y0 + MINIMAP_H + 16);
  ctx.restore();
}

/** Rounded rectangle path helper (also used by render.js). */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The title screen: big logo, city name, controls, save info. */
export function drawTitle(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 30, 0.55)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d8f';
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.fillText(GAME_TITLE, VIEW_WIDTH / 2, 210);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('— COSTA VIDRIO —', VIEW_WIDTH / 2, 258);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Seluruh kota menyiarkanmu LIVE. Makin ribut aksimu, makin banyak penonton.', VIEW_WIDTH / 2, 300);
  ctx.fillText('Curi mobil, kabur dari polisi, dan selesaikan 2 episode heist.', VIEW_WIDTH / 2, 330);
  const blink = Math.floor(state.time * 1.5) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('TEKAN ENTER UNTUK MAIN', VIEW_WIDTH / 2, 400);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('WASD bergerak / mengemudi • E curi & keluar mobil • SPACE pukul • F tembak • P jeda • M suara', VIEW_WIDTH / 2, 452);
  if (state.save && state.save.episodes > 0) {
    ctx.fillStyle = '#7ee787';
    ctx.fillText(
      'Save ditemukan: ' + state.save.episodes + ' episode selesai • ' + formatMoney(state.save.money) +
      ' • ' + formatViewers(state.save.followers) + ' followers',
      VIEW_WIDTH / 2, 490,
    );
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Game orisinal — kota, karakter, dan cerita buatan sendiri. 100% offline.', VIEW_WIDTH / 2, 560);
  ctx.restore();
}

/** Pause overlay. */
export function drawPaused(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 30, 0.6)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('JEDA', VIEW_WIDTH / 2, 320);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Tekan P / Esc untuk lanjut • M untuk suara • progress tersimpan otomatis', VIEW_WIDTH / 2, 370);
  ctx.restore();
}

/** Busted overlay. */
export function drawBusted(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(40, 8, 16, 0.72)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d5d';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('TERTANGKAP!', VIEW_WIDTH / 2, 300);
  ctx.fillStyle = '#fff';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Polisi menangkapmu di depan kamera. Denda $500 — siaran berlanjut.', VIEW_WIDTH / 2, 350);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('TEKAN ENTER UNTUK LANJUT', VIEW_WIDTH / 2, 410);
  ctx.restore();
}

/** Episode result screen: followers, money, sponsor. */
export function drawResult(ctx, state) {
  const r = state.result;
  if (!r) return;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 30, 0.78)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('EPISODE SELESAI!', VIEW_WIDTH / 2, 190);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText(r.episode.title, VIEW_WIDTH / 2, 240);
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText('Sponsor: ' + r.episode.sponsor, VIEW_WIDTH / 2, 285);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('+' + formatMoney(r.money) + '    +' + formatViewers(r.followers) + ' followers', VIEW_WIDTH / 2, 340);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Total: ' + formatMoney(r.totalMoney) + ' • ' + formatViewers(r.totalFollowers) + ' followers', VIEW_WIDTH / 2, 385);
  ctx.fillText('Penonton puncak episode ini: ' + formatViewers(r.viewersPeak), VIEW_WIDTH / 2, 418);
  const blink = Math.floor(state.time * 1.5) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('TEKAN ENTER UNTUK LANJUT', VIEW_WIDTH / 2, 480);
  }
  ctx.restore();
}

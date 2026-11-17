// LIVE HEIST — render.js
// The painter. One camera follows the player; the world, traffic, cars, police,
// heli, combat and particles draw in world space, then the HUD and the screens
// (title, pause, busted, episode-complete) draw in screen space.

import { PALETTE, PLAYER_RADIUS, WORLD_H, WORLD_W, clamp, formatCount, formatMoney } from './config.js';
import { drawWorld } from './world.js';
import { drawTraffic } from './traffic.js';
import { drawPlayerCar } from './vehicles.js';
import { drawPolice } from './police.js';
import { drawHeli } from './heli.js';
import { drawMissionMarker } from './missions.js';
import { drawCombat } from './combat.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_COMPLETE = 'complete';

/** Spawn a burst of particles (smoke, sparks, flashes). */
export function spawnParticles(state, x, y, color, count, kind = 'spark') {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x,
      y,
      vx: (state.rng() - 0.5) * 220,
      vy: (state.rng() - 0.5) * 220,
      life: 0.4 + state.rng() * 0.3,
      maxLife: 0.7,
      size: 4 + state.rng() * 6,
      color,
      kind,
    });
  }
}

/** Advance particles; dead ones are removed. */
export function stepParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.4 * dt;
    p.vy *= 1 - 2.4 * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

/** Create the renderer for a canvas. resize() fits the canvas to its window. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 1280;
  let h = 720;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(320, Math.floor(rect.width));
    h = Math.max(240, Math.floor(rect.height));
    canvas.width = w;
    canvas.height = h;
  }

  function drawPlayerOnFoot(ctx, state) {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body (orange jacket — the "hero" colour) + head + aim arm.
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2f3a';
    ctx.fillRect(4, -4, 16, 8);
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(4, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Gold ring so the player pops against the street.
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_RADIUS + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawWorldScene(ctx, state) {
    const cam = state.camera;
    drawWorld(ctx, state.world, cam, state.time);
    drawMissionMarker(ctx, state);
    drawTraffic(ctx, state);
    drawPlayerCar(ctx, state);
    drawPolice(ctx, state);
    if (state.player.onFoot) drawPlayerOnFoot(ctx, state);
    drawHeli(ctx, state);
    drawCombat(ctx, state);
    // Particles.
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 'flash') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 2), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function overlay(ctx, w, h, title, lines, accent, hint) {
    ctx.fillStyle = 'rgba(10, 12, 24, 0.62)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(title, w / 2, h / 2 - 90);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    let y = h / 2 - 40;
    for (const line of lines) {
      ctx.fillText(line, w / 2, y);
      y += 30;
    }
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(hint, w / 2, y + 26);
    ctx.textAlign = 'left';
  }

  function drawTitleOverlay(ctx, state, w, h) {
    ctx.fillStyle = 'rgba(10, 12, 24, 0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b35';
    ctx.font = 'bold 84px sans-serif';
    ctx.fillText('LIVE HEIST', w / 2, h / 2 - 110);
    ctx.fillStyle = '#38b6d3';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('COSTA VIDRIO — SEASON 1', w / 2, h / 2 - 68);
    ctx.fillStyle = '#fff';
    ctx.font = '19px sans-serif';
    ctx.fillText('Seluruh kota menyiarkanmu secara live. Makin ribut aksimu, makin banyak penontonnya.', w / 2, h / 2 - 28);
    ctx.fillText('Curi mobil, jalankan heist, dan kabur sebelum bintangmu penuh.', w / 2, h / 2 + 2);
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 130, h / 2 + 34, 260, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    const blink = Math.floor(state.time * 2) % 2 === 0;
    if (blink) ctx.fillText('▶  TEKAN ENTER UNTUK MAIN', w / 2, h / 2 + 63);
    ctx.fillStyle = '#ffd166';
    ctx.font = '15px sans-serif';
    ctx.fillText('WASD gerak • E curi / keluar mobil • Klik tembak • Spasi pukul • Shift lari • P jeda • M misi', w / 2, h / 2 + 108);
    if (state.save) {
      ctx.fillStyle = '#bdefff';
      ctx.fillText(`Lanjutan tersimpan: ${state.save.cash} uang • ${state.save.followers} followers • ${state.save.episodesDone} episode selesai`, w / 2, h / 2 + 136);
    }
    ctx.textAlign = 'left';
  }

  return {
    resize,

    /** Paint the current screen. */
    draw(state) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // Camera: slow pan across the city on the title screen, follows the player in play.
      const cam = state.camera;
      if (state.ui === SCREEN_TITLE) {
        cam.x = 500 + Math.sin(state.time * 0.05) * 320;
        cam.y = 300;
      } else {
        cam.x = clamp(state.player.x - w / 2, 0, Math.max(0, WORLD_W - w));
        cam.y = clamp(state.player.y - h / 2, 0, Math.max(0, WORLD_H - h));
      }
      cam.w = w;
      cam.h = h;
      ctx.save();
      ctx.translate(-cam.x, -cam.y);
      drawWorldScene(ctx, state);
      ctx.restore();
      if (state.ui === SCREEN_TITLE) {
        drawTitleOverlay(ctx, state, w, h);
      } else {
        drawHud(ctx, state, w, h);
        if (state.ui === SCREEN_PAUSED) {
          overlay(ctx, w, h, 'JEDA', ['Game dijeda. Kota tetap menyiarkanmu…', 'Tekan P atau Enter untuk lanjut.'], '#bdefff', 'P / ENTER — LANJUT');
        } else if (state.ui === SCREEN_OVER) {
          overlay(
            ctx,
            w,
            h,
            'BUSTED!',
            [
              `Ditangkap live di depan ${state.stats.bestViewers.toLocaleString('en-US')} penonton.`,
              `Uang ${formatMoney(state.stats.cash)} • Followers ${formatCount(state.stats.followers)} • Episode selesai ${state.stats.episodesDone}`,
            ],
            '#e63946',
            'ENTER — MAIN LAGI',
          );
        } else if (state.ui === SCREEN_COMPLETE) {
          overlay(
            ctx,
            w,
            h,
            'SEASON 1 SELESAI!',
            [
              'Dua episode viral. Costa Vidrio sekarang tahu namamu.',
              `Uang ${formatMoney(state.stats.cash)} • Followers ${formatCount(state.stats.followers)} • Penonton terbanyak ${state.stats.bestViewers.toLocaleString('en-US')}`,
              'Tekan M untuk mengulang episode dan menaikkan followers.',
            ],
            '#ffb703',
            'ENTER — BEBAS BERKELIARAN',
          );
        }
      }
    },
  };
}

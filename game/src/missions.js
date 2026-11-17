// LIVE HEIST — missions.js
// The episodes. Every heist is one TV episode with an objective chain and a
// sponsor + follower reward. Episode 1: steal a car, deliver the package.
// Episode 2: rob TOKO SARI, then lose the cops in the garage ("putus siaran").
// Finishing both ends Season 1; episodes can be replayed for more followers.

import { HEAT_ROBBERY, clamp, dist, formatCount, formatMoney } from './config.js';
import { addHeat, pushTicker } from './police.js';
import { pointInRect } from './world.js';

const EPISODES = [
  {
    id: 1,
    title: 'EPISODE 1 — PAKET PANAS',
    desc: 'Sponsor: Kopi Vidrio. Antar paketnya sebelum dingin.',
    rewardCash: 850,
    rewardFollowers: 2400,
    stages: [
      'Curi mobil apa saja — dekati mobil lalu tekan E',
      'Antar paket ke titik DROP emas di ujung timur kota',
    ],
  },
  {
    id: 2,
    title: 'EPISODE 2 — RAMPOK TOKO SARI',
    desc: 'Sponsor: Bengkel Rizki. Satu toko, satu kamera, satu jalan kabur.',
    rewardCash: 2400,
    rewardFollowers: 8100,
    stages: [
      'Pergi ke TOKO SARI di pusat kota',
      'Tahan E di depan toko untuk merampok (3 detik)',
      'KABUR! Masuk GARASI VIDRIO — putus siaran, bintang turun',
    ],
  },
];

/** Fresh mission state: episode 1 offered, none active yet. */
export function createMissions(world) {
  return {
    episodes: EPISODES,
    active: null,
    stage: 0,
    progress: 0,
    done: [false, false],
    offered: 0,
    marker: { x: world.drop.x, y: world.drop.y },
    banner: null,
    bannerT: 0,
  };
}

/** Start an episode: set the marker and the first objective. */
export function startEpisode(state, index) {
  const m = state.missions;
  m.active = index;
  m.stage = 0;
  m.progress = 0;
  const ep = EPISODES[index];
  m.marker = index === 0 ? { x: state.world.drop.x, y: state.world.drop.y } : { x: state.world.tokoSari.x + state.world.tokoSari.w / 2, y: state.world.tokoSari.y + state.world.tokoSari.h / 2 };
  m.banner = ep.title;
  m.bannerT = 3.2;
  pushTicker(state, `${ep.title} MULAI — ${ep.desc}`);
  state.audio.chime();
}

/** Current objective text for the HUD. */
export function objectiveText(state) {
  const m = state.missions;
  if (m.active === null) {
    if (m.done.every(Boolean)) return 'SEASON 1 SELESAI — bebas berkeliaran, tekan M untuk ulangi episode';
    return `Episode berikutnya: ${EPISODES[m.offered].title} — tekan M untuk mulai`;
  }
  const ep = EPISODES[m.active];
  return `${ep.title}: ${ep.stages[m.stage]}`;
}

/** Finish the active episode: pay out, toast, save, offer the next one. */
export function completeEpisode(state) {
  const m = state.missions;
  const ep = EPISODES[m.active];
  state.stats.cash += ep.rewardCash;
  state.stats.followers += ep.rewardFollowers;
  state.stats.episodesDone += 1;
  m.done[m.active] = true;
  m.banner = `EPISODE ${ep.id} SELESAI! +${formatMoney(ep.rewardCash)} • +${formatCount(ep.rewardFollowers)} followers`;
  m.bannerT = 4.5;
  pushTicker(state, `BREAKING: Episode ${ep.id} viral — +${formatCount(ep.rewardFollowers)} followers baru!`);
  state.audio.chime();
  state.toasts.push({ text: `Sponsor membayar ${formatMoney(ep.rewardCash)}`, t: 4 });
  m.active = null;
  m.offered = m.done[0] && !m.done[1] ? 1 : 0;
  state.saveGame();
}

/** Advance the active episode's stage machine. */
export function stepMissions(state, dt, input) {
  const m = state.missions;
  if (m.bannerT > 0) m.bannerT -= dt;
  if (m.active === null) return;
  const player = state.player;
  if (m.active === 0) {
    if (m.stage === 0) {
      if (!player.onFoot) {
        m.stage = 1;
        m.marker = { x: state.world.drop.x, y: state.world.drop.y };
        state.toasts.push({ text: 'Paket di tangan — antar ke titik DROP!', t: 3 });
      }
    } else if (m.stage === 1) {
      if (dist(player.x, player.y, state.world.drop.x, state.world.drop.y) < 70) {
        completeEpisode(state);
      }
    }
    return;
  }
  // Episode 2.
  const shop = state.world.tokoSari;
  const shopCx = shop.x + shop.w / 2;
  const shopCy = shop.y + shop.h / 2;
  // Distance to the shop's rect (not its centre): standing at the front door counts.
  const dx = Math.max(shop.x - player.x, 0, player.x - (shop.x + shop.w));
  const dy = Math.max(shop.y - player.y, 0, player.y - (shop.y + shop.h));
  const shopDist = Math.hypot(dx, dy);
  if (m.stage === 0) {
    m.marker = { x: shopCx, y: shopCy };
    if (shopDist < 60) {
      m.stage = 1;
      m.progress = 0;
    }
  } else if (m.stage === 1) {
    m.marker = { x: shopCx, y: shopCy };
    if (player.onFoot && shopDist < 70 && input.holdingE()) {
      m.progress += dt;
      if (state.rng() < 0.3) {
        state.particles.push({
          x: player.x + (state.rng() - 0.5) * 30,
          y: player.y + (state.rng() - 0.5) * 30,
          vx: 0,
          vy: -30,
          life: 0.4,
          maxLife: 0.4,
          size: 6,
          color: '#ffd166',
          kind: 'spark',
        });
      }
      if (m.progress >= 3) {
        m.stage = 2;
        m.marker = { x: state.world.garage.x + state.world.garage.w / 2, y: state.world.garage.y + state.world.garage.h / 2 };
        addHeat(state, HEAT_ROBBERY, 'BREAKING: TOKO SARI dirampok live — polisi menuju lokasi!');
        state.audio.siren(true);
      }
    } else {
      m.progress = Math.max(0, m.progress - dt * 2);
    }
  } else if (m.stage === 2) {
    m.marker = { x: state.world.garage.x + state.world.garage.w / 2, y: state.world.garage.y + state.world.garage.h / 2 };
    if (pointInRect(player.x, player.y, state.world.garage)) {
      // Inside the garage the broadcast dies; finishing needs the heat to fall.
      if (state.police.heat < 12) completeEpisode(state);
      else state.toasts.push({ text: 'Siaran putus… tunggu bintang turun!', t: 1.2 });
    }
  }
}

/** Draw the pulsing gold mission marker in the world. */
export function drawMissionMarker(ctx, state) {
  const m = state.missions;
  if (m.active === null) return;
  const pulse = 1 + Math.sin(state.time * 5) * 0.18;
  const { x, y } = m.marker;
  ctx.save();
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffb703';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', x, y + 8);
  if (m.active === 1 && m.stage === 1 && m.progress > 0) {
    // Robbery progress ring.
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + (m.progress / 3) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

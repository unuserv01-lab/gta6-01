// LIVE HEIST — shots.js
// The four screenshot scenes behind ?shot=1..4 (with &seed=N). Each one rebuilds
// the city from a fixed seed and places the player, traffic, police and mission
// state by hand, so the frame is a real render of the game's own code and the
// same seed always gives the same frame. No gameplay is simulated here.

import { TILE } from './config.js';
import { createRandom, createWorld } from './world.js';
import { createTraffic } from './traffic.js';
import { createPolice, pushTicker } from './police.js';
import { createHeli } from './heli.js';
import { createMissions, startEpisode } from './missions.js';
import { createCombat } from './combat.js';
import { SCREEN_COMPLETE, SCREEN_PLAY } from './render.js';

const SHOT_SEED = 7;

/** Rebuild a fresh deterministic state, then place the named scene in it. */
export function stageShot(name, state) {
  const rng = createRandom(SHOT_SEED);
  state.rng = rng;
  state.world = createWorld(SHOT_SEED);
  state.traffic = createTraffic(state.world, rng);
  state.police = createPolice();
  state.heli = createHeli();
  state.missions = createMissions(state.world);
  state.combat = createCombat();
  state.particles = [];
  state.toasts = [];
  state.time = 12;
  state.ui = SCREEN_PLAY;
  state.player.health = 100;
  state.player.onFoot = true;
  state.player.car = null;
  state.stats = { cash: 1250, followers: 48200, bestViewers: 12400, episodesDone: 0 };
  state.ticker = [
    'TV-7 COSTA VIDRIO — kota menyiarkanmu secara live',
    'Cuaca cerah di Costa Vidrio, 32°C — lalu lintas padat di Avenida Vidrio',
  ];

  const world = state.world;
  const player = state.player;
  const avenueX = 22 * TILE; // centre of Avenida 21 (two lanes: 21.5 and 22.5 tiles)

  if (name === '2') {
    // Shot 2 — the chase: 4 stars, news heli overhead, 3 patrol cars, roadblock ahead.
    player.car = { x: avenueX, y: 17 * TILE, angle: -Math.PI / 2, speed: 380, color: '#ff6b35', kind: 'sedan', parked: false, flashT: 0 };
    player.onFoot = false;
    player.x = player.car.x;
    player.y = player.car.y;
    player.angle = -Math.PI / 2;
    state.police.heat = 78;
    state.police.stars = 4;
    state.police.viewers = 48200;
    state.stats.bestViewers = 48200;
    state.police.cars = [
      { x: avenueX + 40, y: 19.5 * TILE, angle: -Math.PI / 2, speed: 420, maxSpeed: 465, color: '#f7ede2', kind: 'sedan', parked: false, ramT: 0 },
      { x: avenueX - 40, y: 15 * TILE, angle: -Math.PI / 2, speed: 400, maxSpeed: 465, color: '#f7ede2', kind: 'sedan', parked: false, ramT: 0 },
      { x: avenueX + 120, y: 17.5 * TILE, angle: Math.PI, speed: 380, maxSpeed: 465, color: '#f7ede2', kind: 'sedan', parked: false, ramT: 0 },
    ];
    state.police.blocks = [{ x: avenueX, y: 14.5 * TILE, angle: 0, t: 0 }];
    state.heli.active = true;
    state.heli.x = player.x + 150;
    state.heli.y = player.y - 130;
    state.heli.angle = Math.atan2(player.y - state.heli.y, player.x - state.heli.x);
    state.heli.rotor = 1.2;
    startEpisode(state, 1);
    state.missions.stage = 2;
    state.missions.marker = { x: world.garage.x + world.garage.w / 2, y: world.garage.y + world.garage.h / 2 };
    state.ticker = [
      'BREAKING: kejar-kejaran di Avenida Vidrio — 3 mobil polisi mengejar satu mobil oranye',
      'BREAKING: SWAT bersiaga, warga diminta menjauhi pusat kota',
      'TV-7: penonton tembus 48.2K — siaran paling ramai minggu ini',
    ];
    state.toasts.push({ text: 'KABUR! Masuk GARASI VIDRIO — putus siaran!', t: 99 });
    return { screen: SCREEN_PLAY };
  }

  if (name === '3') {
    // Shot 3 — on foot: bystanders recording, mission objective, busy shop street.
    // Use the shop nearest the city centre so the camera can centre on the robbery.
    let shop = world.tokoSari;
    let bestD = Infinity;
    for (const s of world.shops) {
      const d = Math.hypot(s.x + s.w / 2 - 20 * TILE, s.y + s.h / 2 - 12 * TILE);
      if (d < bestD) {
        bestD = d;
        shop = s;
      }
    }
    world.tokoSari = shop;
    // The robbery target is always TOKO SARI in the fiction: rename the
    // chosen shop so the sign, the banner and the objective agree.
    shop.name = 'TOKO SARI';
    const sx = shop.x + shop.w / 2;
    const sy = shop.y + shop.h + 44;
    player.x = sx;
    player.y = sy;
    player.angle = -Math.PI / 2;
    player.onFoot = true;
    state.police.heat = 55;
    state.police.stars = 3;
    state.police.viewers = 21400;
    state.stats.bestViewers = 21400;
    // Three recording bystanders around the player.
    const recs = [
      { x: sx - 90, y: sy + 60 },
      { x: sx + 110, y: sy + 40 },
      { x: sx + 40, y: sy - 110 },
    ];
    recs.forEach((pos, i) => {
      const ped = state.traffic.peds[i];
      ped.x = pos.x;
      ped.y = pos.y;
      ped.recording = true;
      ped.angle = Math.atan2(player.y - pos.y, player.x - pos.x);
    });
    // Extra pedestrians crowding the shop street.
    for (let i = 3; i < 10; i++) {
      const ped = state.traffic.peds[i];
      ped.x = sx - 220 + i * 52;
      ped.y = sy + 90 + (i % 2) * 40;
    }
    startEpisode(state, 1);
    state.missions.stage = 1;
    state.missions.progress = 1.8;
    state.missions.marker = { x: sx, y: shop.y + shop.h / 2 };
    state.ticker = [
      'TV-7: warga merekam perampokan TOKO SARI — videonya sudah viral',
      'Saksi mata: "Dia masuk toko sambil tersenyum ke kamera!"',
    ];
    return { screen: SCREEN_PLAY };
  }

  if (name === '4') {
    // Shot 4 — mission result: the Season 1 complete screen over the drop point.
    player.car = { x: world.drop.x - 40, y: world.drop.y, angle: 0, speed: 0, color: '#38b6d3', kind: 'sedan', parked: false, flashT: 0 };
    player.onFoot = false;
    player.x = player.car.x;
    player.y = player.car.y;
    player.angle = 0;
    state.stats = { cash: 3650, followers: 58700, bestViewers: 48200, episodesDone: 2 };
    state.police.viewers = 48200;
    state.missions.done = [true, true];
    state.missions.active = null;
    state.ui = SCREEN_COMPLETE;
    state.ticker = [
      'BREAKING: Episode 2 viral — +8.1K followers baru untuk LIVE HEIST!',
      'Sponsor Bengkel Rizki resmi perpanjang kontrak Season 2',
    ];
    return { screen: SCREEN_COMPLETE };
  }

  // Shot 1 (default) — the cover: hero car on the sunny avenue, full HUD.
  player.car = { x: avenueX + 32, y: 16 * TILE, angle: -Math.PI / 2, speed: 260, color: '#ff6b35', kind: 'sedan', parked: false, flashT: 0 };
  player.onFoot = false;
  player.x = player.car.x;
  player.y = player.car.y;
  player.angle = -Math.PI / 2;
  state.police.heat = 35;
  state.police.stars = 2;
  state.police.viewers = 12400;
  state.stats.bestViewers = 12400;
  state.police.cars = [
    { x: avenueX - 32, y: 18.5 * TILE, angle: -Math.PI / 2, speed: 300, maxSpeed: 465, color: '#f7ede2', kind: 'sedan', parked: false, ramT: 0 },
  ];
  // Civilian traffic on the same avenue + the crossing street.
  state.traffic.cars[0].x = avenueX - 32;
  state.traffic.cars[0].y = 13.5 * TILE;
  state.traffic.cars[0].angle = Math.PI / 2;
  state.traffic.cars[0].axis = 'v';
  state.traffic.cars[1].x = avenueX + 32;
  state.traffic.cars[1].y = 19 * TILE;
  state.traffic.cars[1].angle = -Math.PI / 2;
  state.traffic.cars[1].axis = 'v';
  state.traffic.cars[2].x = 24 * TILE;
  state.traffic.cars[2].y = 19 * TILE;
  state.traffic.cars[2].angle = 0;
  state.traffic.cars[2].axis = 'h';
  startEpisode(state, 0);
  state.missions.stage = 1;
  state.missions.marker = { x: world.drop.x, y: world.drop.y };
  state.toasts.push({ text: 'Paket di tangan — antar ke titik DROP!', t: 99 });
  return { screen: SCREEN_PLAY };
}

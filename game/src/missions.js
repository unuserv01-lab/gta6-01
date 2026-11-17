// Missions: each heist is one "episode" of the live show. Episode 1 robs the
// Coral Casino; Episode 2 hijacks the diamond convoy. Every episode has an
// objective on the HUD, a marker on the minimap, and pays sponsor money plus
// followers — that is the progression. Finishing one opens the next.
import {
  MISSION_1_REWARD_FOLLOWERS,
  MISSION_1_REWARD_MONEY,
  MISSION_2_REWARD_FOLLOWERS,
  MISSION_2_REWARD_MONEY,
  clamp,
} from './config.js';

export const MISSION_NONE = 'none';
export const MISSION_AVAILABLE = 'available';
export const MISSION_GRAB = 'grab';
export const MISSION_ESCAPE = 'escape';
export const MISSION_HIJACK = 'hijack';

/** The two episodes, with their names, briefings and rewards. */
export const EPISODES = [
  {
    id: 1,
    title: 'EPISODE 1 — KASINO CORAL',
    brief: 'Masuk ke Coral Casino, ambil chip berlian, kabur ke garasi sebelum polisi datang.',
    rewardMoney: MISSION_1_REWARD_MONEY,
    rewardFollowers: MISSION_1_REWARD_FOLLOWERS,
    sponsor: 'VOLT COLA',
  },
  {
    id: 2,
    title: 'EPISODE 2 — KONVOI BERLIAN',
    brief: 'Hentikan mobil konvoi berlian di jalan ring, rebut muatannya, kabur ke garasi.',
    rewardMoney: MISSION_2_REWARD_MONEY,
    rewardFollowers: MISSION_2_REWARD_FOLLOWERS,
    sponsor: 'SURF & SOLE',
  },
];

/** Fresh mission state: episode 1 is available from the start. */
export function createMissions(state) {
  return {
    stage: MISSION_AVAILABLE,
    episode: 1,
    progress: 0,
    target: missionTarget(state, 1),
    convoy: null,
    timer: 0,
  };
}

/** Where the current episode's marker sits. */
export function missionTarget(state, episodeId) {
  if (episodeId === 1) {
    const c = state.world.casino;
    return { x: c.x + c.w / 2, y: c.y + c.h + 60, label: 'CORAL CASINO' };
  }
  // Episode 2: the convoy loops the outer ring road; its marker follows the car.
  return { x: 2700, y: 300, label: 'KONVOI BERLIAN' };
}

/** The hideout the player must escape to (nearest one). */
export function nearestHideout(state) {
  const { player, world } = state;
  let best = world.hideouts[0];
  let bestD = Infinity;
  for (const h of world.hideouts) {
    const d = Math.hypot(h.x + h.w / 2 - player.x, h.y + h.h / 2 - player.y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

/** The one-line objective the HUD shows right now. */
export function currentObjective(state) {
  const m = state.mission;
  if (m.stage === MISSION_AVAILABLE) {
    return '▶ Pergi ke ' + m.target.label + ' untuk mulai ' + EPISODES[m.episode - 1].title;
  }
  if (m.stage === MISSION_GRAB) {
    return '▶ Ambil chip berlian — tahan di zona kuning (' + Math.ceil(m.progress * 100) + '%)';
  }
  if (m.stage === MISSION_HIJACK) {
    return '▶ Hentikan mobil konvoi: tabrak / tembak sampai berhenti, lalu dekati';
  }
  if (m.stage === MISSION_ESCAPE) {
    const h = nearestHideout(state);
    return '▶ KABUR ke ' + h.name + ' — putus siaran sebelum bintang 5!';
  }
  return '▶ Kota menunggumu. Cari misi berikutnya di peta.';
}

/** Start the episode the player walked into. */
export function startEpisode(state) {
  const m = state.mission;
  const ep = EPISODES[m.episode - 1];
  if (m.episode === 1) {
    m.stage = MISSION_GRAB;
    m.progress = 0;
  } else {
    m.stage = MISSION_HIJACK;
    spawnConvoy(state);
  }
  state.message = ep.title + ' DIMULAI — LIVE!';
  state.messageT = 3;
  state.audio.missionStart();
  state.player.addHeat(15);
}

/** The diamond convoy car, driving the outer ring road. */
export function spawnConvoy(state) {
  const car = {
    kind: 'convoy',
    x: 2700,
    y: 300,
    angle: Math.PI,
    speed: 200,
    color: '#1d1d22',
    hp: 60,
    driver: 'convoy',
    stopped: false,
    loop: 0,
  };
  state.cars.push(car);
  state.mission.convoy = car;
  return car;
}

/** Advance the active mission one step. */
export function updateMissions(state, dt) {
  const m = state.mission;
  const { player } = state;
  if (m.stage === MISSION_NONE) return;

  if (m.stage === MISSION_AVAILABLE) {
    const d = Math.hypot(player.x - m.target.x, player.y - m.target.y);
    if (d < 70) startEpisode(state);
    return;
  }

  if (m.stage === MISSION_GRAB) {
    const d = Math.hypot(player.x - m.target.x, player.y - m.target.y);
    if (d < 90) {
      m.progress = clamp(m.progress + dt / 4, 0, 1);
      if (state.rng() < dt * 8) {
        state.particles.push({
          x: player.x + (state.rng() - 0.5) * 40,
          y: player.y + (state.rng() - 0.5) * 40,
          vx: 0, vy: -30, life: 0.5, maxLife: 0.5,
          size: 3, color: '#ffd23f',
        });
      }
      if (m.progress >= 1) {
        m.stage = MISSION_ESCAPE;
        m.target = {
          x: nearestHideout(state).x + 75,
          y: nearestHideout(state).y + 60,
          label: nearestHideout(state).name,
        };
        player.addHeat(55);
        state.message = 'CHIP DIDAPAT! KABUR KE GARASI — POLISI MENGEJAR!';
        state.messageT = 3;
        state.audio.missionStart();
      }
    } else {
      m.progress = Math.max(0, m.progress - dt / 8);
    }
    return;
  }

  if (m.stage === MISSION_HIJACK) {
    const convoy = m.convoy;
    if (!convoy) return;
    m.target = { x: convoy.x, y: convoy.y, label: 'KONVOI BERLIAN' };
    if (convoy.stopped) {
      const d = Math.hypot(player.x - convoy.x, player.y - convoy.y);
      if (d < 80) {
        m.stage = MISSION_ESCAPE;
        const h = nearestHideout(state);
        m.target = { x: h.x + 75, y: h.y + 60, label: h.name };
        state.cars = state.cars.filter((c) => c !== convoy);
        player.addHeat(70);
        state.message = 'BERLIAN DIREBUT! KABUR KE ' + h.name + '!';
        state.messageT = 3;
        state.audio.missionStart();
      }
      return;
    }
    // The convoy loops the ring road; hitting it hard stops it.
    convoy.x += Math.cos(convoy.angle) * convoy.speed * dt;
    convoy.y += Math.sin(convoy.angle) * convoy.speed * dt;
    if (convoy.x > 3300) { convoy.angle = Math.PI / 2; convoy.x = 3300; }
    if (convoy.y > 2300) { convoy.angle = Math.PI; convoy.y = 2300; }
    if (convoy.x < 300) { convoy.angle = -Math.PI / 2; convoy.x = 300; }
    if (convoy.y < 300) { convoy.angle = 0; convoy.y = 300; }
    if (convoy.hp <= 0) {
      convoy.stopped = true;
      convoy.speed = 0;
      state.message = 'KONVOI BERHENTI! Dekati mobilnya!';
      state.messageT = 2.5;
    }
    return;
  }

  if (m.stage === MISSION_ESCAPE) {
    const h = state.world.hideoutAt(player.x, player.y);
    if (h) completeEpisode(state);
  }
}

/** Pay the episode out and open the next one. */
export function completeEpisode(state) {
  const m = state.mission;
  const ep = EPISODES[m.episode - 1];
  const { player } = state;
  player.money += ep.rewardMoney;
  player.followers += ep.rewardFollowers;
  player.heat = Math.max(0, player.heat - 120);
  state.stats.episodes += 1;
  state.result = {
    episode: ep,
    money: ep.rewardMoney,
    followers: ep.rewardFollowers,
    viewersPeak: state.stats.bestViewers,
    totalMoney: player.money,
    totalFollowers: player.followers,
  };
  state.screen = 'result';
  state.audio.missionComplete();
  state.saveGame();
  if (m.episode === 1) {
    m.episode = 2;
    m.stage = MISSION_AVAILABLE;
    m.progress = 0;
    m.target = missionTarget(state, 2);
  } else {
    m.stage = MISSION_NONE;
    m.progress = 0;
  }
}

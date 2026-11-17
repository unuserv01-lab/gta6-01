// Police and the wanted system. Heat is the crime the player committed;
// stars are what the city sees; viewers are the audience watching the stars.
// Police cars chase, roadblocks appear at 4 stars, SWAT vans at 5, and a
// "busted" happens when the law catches the player on foot.
import {
  CAR_LENGTH,
  HEAT_DECAY,
  HEAT_DECAY_HIDEOUT,
  HEAT_RAM_COP,
  MAX_POLICE,
  STAR_HEAT,
  VIEWERS_BASE,
  VIEWERS_MISSION_BONUS,
  VIEWERS_PER_STAR,
  angleDiff,
  clamp,
} from './config.js';
import { nearestHorizontalRoad, nearestVerticalRoad } from './world.js';

/** Recompute stars and viewers from heat. Called every frame. */
export function updateWanted(state, dt) {
  const { player, world } = state;
  const hideout = world.hideoutAt(player.x, player.y);
  player.inHideout = !!hideout;
  if (hideout && player.stars > 0) {
    player.heat = Math.max(0, player.heat - HEAT_DECAY_HIDEOUT * dt);
    if (state.rng() < dt * 0.5) {
      state.message = 'PUTUS SIARAN — ' + hideout.name + ': siaran terputus, bintang turun';
      state.messageT = 1.5;
    }
  } else {
    player.heat = Math.max(0, player.heat - HEAT_DECAY * dt);
  }
  let stars = 0;
  for (let s = 5; s >= 1; s -= 1) {
    if (player.heat >= STAR_HEAT[s]) {
      stars = s;
      break;
    }
  }
  if (stars !== player.stars) {
    if (stars > player.stars) {
      state.audio.sirenBlip();
      if (stars >= 3) state.message = 'BINTANG ' + stars + '! HELIKOPTER BERITA MENYOROTMU';
      if (stars >= 4) state.message = 'BINTANG ' + stars + '! ROADBLOCK + WARGA MEREKAMMU';
      if (stars >= 5) state.message = 'BINTANG 5! SWAT DIKERAHKAN — KABUR KE GARASI!';
      state.messageT = 2.5;
    }
    player.stars = stars;
  }
  const missionBonus = state.mission.stage !== 'none' ? VIEWERS_MISSION_BONUS : 0;
  const spike = player.heatSpike > 0 ? player.heatSpike : 0;
  player.viewers = Math.round(
    VIEWERS_BASE + player.stars * VIEWERS_PER_STAR + missionBonus + spike,
  );
  player.heatSpike = Math.max(0, (player.heatSpike || 0) - dt * 400);
  if (player.viewers > state.stats.bestViewers) state.stats.bestViewers = player.viewers;
}

/** Spawn a police car on a road near the player, already in pursuit. */
export function spawnPoliceCar(state, kind) {
  const { player, rng } = state;
  const vertical = rng() < 0.5;
  const road = vertical ? nearestVerticalRoad(player.x) : nearestHorizontalRoad(player.y);
  const along = 420 + rng() * 260;
  const side = rng() < 0.5 ? -1 : 1;
  const car = {
    kind: kind || 'police',
    x: vertical ? road + (rng() < 0.5 ? -30 : 30) : player.x + side * along,
    y: vertical ? player.y + side * along : road + (rng() < 0.5 ? -30 : 30),
    angle: Math.atan2(player.y - (vertical ? player.y + side * along : road), player.x - (vertical ? road : player.x + side * along)),
    speed: 0,
    color: kind === 'swat' ? '#23262e' : '#f2f2f2',
    hp: kind === 'swat' ? 220 : 100,
    driver: 'police',
    roadblock: false,
    ramCd: 0,
  };
  state.cars.push(car);
  state.police.push(car);
  return car;
}

/** Keep the right number of pursuers for the current wanted level. */
export function maintainPolice(state) {
  const { player } = state;
  const wantedCount = MAX_POLICE[player.stars] || 0;
  let active = state.police.filter((p) => !p.roadblock).length;
  // Remove police that are absurdly far away once the heat is gone.
  if (player.stars === 0) {
    for (const p of [...state.police]) {
      if (Math.hypot(p.x - player.x, p.y - player.y) > 1400) removePolice(state, p);
    }
  }
  active = state.police.filter((p) => !p.roadblock).length;
  while (active < wantedCount) {
    const kind = player.stars >= 5 && state.police.filter((p) => p.kind === 'swat').length < 2
      ? 'swat'
      : 'police';
    spawnPoliceCar(state, kind);
    active += 1;
  }
  // Roadblocks at 4+ stars: two parked police cars ahead of the player.
  const wantRoadblock = player.stars >= 4;
  const existing = state.police.filter((p) => p.roadblock);
  if (wantRoadblock && existing.length < 2) {
    for (let i = 0; i < 2 - existing.length; i += 1) {
      const car = spawnPoliceCar(state, 'police');
      car.roadblock = true;
      const a = player.angle + (i === 0 ? 0.5 : -0.5);
      car.x = player.x + Math.cos(a) * 420;
      car.y = player.y + Math.sin(a) * 420;
      car.angle = Math.atan2(player.y - car.y, player.x - car.x) + Math.PI / 2;
      car.speed = 0;
    }
  }
  if (!wantRoadblock) {
    for (const p of [...existing]) removePolice(state, p);
  }
}

/** Remove a police car from the world entirely. */
export function removePolice(state, car) {
  state.cars = state.cars.filter((c) => c !== car);
  state.police = state.police.filter((c) => c !== car);
}

/** Chase the player: steer toward them, ram, and bust them on foot. */
export function updatePolice(state, dt) {
  const { player, world } = state;
  for (const cop of [...state.police]) {
    cop.ramCd = Math.max(0, cop.ramCd - dt);
    const d = Math.hypot(player.x - cop.x, player.y - cop.y);
    if (cop.roadblock) {
      // Roadblock cars sit still, angled across the road, until the player is close.
      if (d < 260) {
        cop.roadblock = false;
      }
      continue;
    }
    const targetAngle = Math.atan2(player.y - cop.y, player.x - cop.x);
    const turn = clamp(angleDiff(targetAngle, cop.angle), -1, 1);
    const maxSpeed = cop.kind === 'swat' ? 430 : 400;
    cop.speed = Math.min(maxSpeed, cop.speed + 300 * dt);
    cop.angle += turn * 2.4 * dt * clamp(cop.speed / 120, 0.3, 1);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    world.collideCircle(cop, CAR_LENGTH / 2);
    world.clampToWorld(cop, 30);

    // Ram the player's car.
    if (player.car && d < CAR_LENGTH && cop.ramCd <= 0) {
      cop.ramCd = 0.8;
      player.car.hp -= 10;
      player.addHeat(HEAT_RAM_COP);
      state.camera.shake = 8;
      state.audio.thud();
      cop.speed *= 0.5;
    }
    // Catch the player on foot: a short grab timer, then BUSTED.
    if (player.onFoot && d < 46) {
      player.bustedTimer += dt;
      state.message = 'DITANGKAP POLISI! Lari! (' + Math.ceil(1.5 - player.bustedTimer) + ')';
      state.messageT = 0.4;
      if (player.bustedTimer >= 1.5) bustPlayer(state);
    } else if (player.onFoot) {
      player.bustedTimer = Math.max(0, player.bustedTimer - dt * 2);
    }
  }
}

/** Busted: fine, stars cleared, respawn at the spawn point. */
export function bustPlayer(state) {
  const { player } = state;
  player.money = Math.max(0, player.money - 500);
  player.heat = 0;
  player.stars = 0;
  player.bustedTimer = 0;
  player.x = state.world.spawn.x;
  player.y = state.world.spawn.y;
  player.angle = 0;
  if (player.car) {
    player.car.driver = 'none';
    player.car = null;
    player.onFoot = true;
  }
  for (const p of [...state.police]) removePolice(state, p);
  state.screen = 'busted';
  state.audio.busted();
  state.saveGame();
}

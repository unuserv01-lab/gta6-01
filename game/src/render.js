// Renderer: paints the whole top-down world on one canvas — ground, roads,
// buildings with their roofs, shops with awnings and signs, the beach, every
// car, pedestrian and the news helicopter, particles, skid marks and camera
// flashes — then the HUD and the screen overlays on top.
import {
  CAR_LENGTH,
  CAR_WIDTH,
  GAME_TITLE,
  HORIZONTAL_ROADS,
  PALETTE,
  ROAD_WIDTH,
  VERTICAL_ROADS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  formatViewers,
} from './config.js';
import { drawBusted, drawHud, drawPaused, drawResult, drawTitle, roundRect } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_RESULT = 'result';

/** Create the renderer for a canvas. Handles resize to the window. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = VIEW_WIDTH;
    canvas.height = VIEW_HEIGHT;
  }
  resize();
  return {
    canvas,
    /** Paint one frame of the game state. */
    draw(state) {
      ctx.save();
      ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      const cam = state.camera;
      const shakeX = cam.shake > 0 ? (state.rng() - 0.5) * cam.shake : 0;
      const shakeY = cam.shake > 0 ? (state.rng() - 0.5) * cam.shake : 0;
      const ox = Math.round(VIEW_WIDTH / 2 - cam.x + shakeX);
      const oy = Math.round(VIEW_HEIGHT / 2 - cam.y + shakeY);
      ctx.translate(ox, oy);
      drawGround(ctx, state);
      drawHideouts(ctx, state);
      drawMissionZone(ctx, state);
      drawSkids(ctx, state);
      drawCars(ctx, state);
      drawPeds(ctx, state);
      drawPlayer(ctx, state);
      drawHeli(ctx, state);
      drawParticles(ctx, state);
      drawFlashes(ctx, state);
      ctx.restore();
      if (state.screen === SCREEN_TITLE) {
        drawTitle(ctx, state);
      } else if (state.screen === SCREEN_PAUSED) {
        drawHud(ctx, state);
        drawPaused(ctx, state);
      } else if (state.screen === SCREEN_BUSTED) {
        drawHud(ctx, state);
        drawBusted(ctx, state);
      } else if (state.screen === SCREEN_RESULT) {
        drawHud(ctx, state);
        drawResult(ctx, state);
      } else {
        drawHud(ctx, state);
      }
      if (state.coverLogo) drawCoverLogo(ctx, state);
    },
  };
}

/** The ground: warm sand-grass base, beach and sea on the east edge. */
function drawGround(ctx, state) {
  const { world } = state;
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  // City blocks get a soft grass tint between roads.
  ctx.fillStyle = PALETTE.grass;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 0, world.beachX, WORLD_HEIGHT);
  ctx.globalAlpha = 1;
  // Beach sand, then the sea.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(world.beachX, 0, WORLD_WIDTH - world.beachX - 60, WORLD_HEIGHT);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(WORLD_WIDTH - 60, 0, 60, WORLD_HEIGHT);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let y = 0; y < WORLD_HEIGHT; y += 90) {
    ctx.fillRect(WORLD_WIDTH - 52, y + 20, 44, 6);
  }
  drawRoads(ctx);
  drawBuildings(ctx, state);
  drawShops(ctx, state);
}

/** Asphalt roads with centre dashes and edge lines. */
function drawRoads(ctx) {
  ctx.fillStyle = PALETTE.road;
  for (const rx of VERTICAL_ROADS) {
    ctx.fillRect(rx - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD_HEIGHT);
  }
  for (const ry of HORIZONTAL_ROADS) {
    ctx.fillRect(0, ry - ROAD_WIDTH / 2, WORLD_WIDTH - 60, ROAD_WIDTH);
  }
  ctx.fillStyle = PALETTE.laneDash;
  for (const rx of VERTICAL_ROADS) {
    for (let y = 20; y < WORLD_HEIGHT; y += 80) {
      ctx.fillRect(rx - 3, y, 6, 40);
    }
  }
  for (const ry of HORIZONTAL_ROADS) {
    for (let x = 20; x < WORLD_WIDTH - 60; x += 80) {
      ctx.fillRect(x, ry - 3, 40, 6);
    }
  }
  // Sidewalk rings around the roads.
  ctx.fillStyle = PALETTE.sidewalk;
  ctx.globalAlpha = 0.55;
  for (const rx of VERTICAL_ROADS) {
    ctx.fillRect(rx - ROAD_WIDTH / 2 - 26, 0, 26, WORLD_HEIGHT);
    ctx.fillRect(rx + ROAD_WIDTH / 2, 0, 26, WORLD_HEIGHT);
  }
  for (const ry of HORIZONTAL_ROADS) {
    ctx.fillRect(0, ry - ROAD_WIDTH / 2 - 26, WORLD_WIDTH - 60, 26);
    ctx.fillRect(0, ry + ROAD_WIDTH / 2, WORLD_WIDTH - 60, 26);
  }
  ctx.globalAlpha = 1;
}

/** Buildings: coloured roofs with a lighter inner panel, pools and gardens. */
function drawBuildings(ctx, state) {
  for (const b of state.world.buildings) {
    ctx.fillStyle = PALETTE.buildingEdge;
    ctx.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    if (b.roof === 'pool') {
      ctx.fillStyle = '#38b6c9';
      ctx.fillRect(b.x + b.w / 2 - 18, b.y + b.h / 2 - 12, 36, 24);
    } else if (b.roof === 'garden') {
      ctx.fillStyle = '#5da244';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Shops: a front wall, a striped awning and a readable name sign. */
function drawShops(ctx, state) {
  for (const s of state.world.shops) {
    ctx.fillStyle = '#f5efe0';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = s.awning;
    ctx.fillRect(s.x - 4, s.y + 10, s.w + 8, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 6; i += 1) ctx.fillRect(s.x + i * 21, s.y + 10, 8, 18);
    ctx.fillStyle = '#1c2433';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, s.x + s.w / 2, s.y + 52);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(s.x + 12, s.y + 60, s.w - 24, 14);
  }
}

/** Hideout garages: green dashed zones with a "PUTUS SIARAN" label. */
function drawHideouts(ctx, state) {
  for (const h of state.world.hideouts) {
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(h.x, h.y, h.w, h.h);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(34,197,94,0.14)';
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = '#166534';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GARASI • PUTUS SIARAN', h.x + h.w / 2, h.y + h.h / 2 - 6);
    ctx.fillText(h.name, h.x + h.w / 2, h.y + h.h / 2 + 12);
    ctx.restore();
  }
}

/** The active mission's zone: a pulsing yellow ring at the target. */
function drawMissionZone(ctx, state) {
  const m = state.mission;
  if (m.stage === 'none') return;
  const t = m.target;
  const pulse = 46 + Math.sin(state.time * 4) * 8;
  ctx.save();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,63,0.15)';
  ctx.beginPath();
  ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2433';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', t.x, t.y + 5);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(t.label, t.x, t.y - pulse - 8);
  if (m.stage === 'grab') {
    ctx.fillStyle = 'rgba(12,16,28,0.8)';
    roundRect(ctx, t.x - 60, t.y + pulse + 6, 120, 14, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(t.x - 56, t.y + pulse + 9, 112 * m.progress, 8);
  }
  ctx.restore();
}

/** Skid marks left by hard turns. */
function drawSkids(ctx, state) {
  ctx.save();
  ctx.strokeStyle = 'rgba(20,20,28,0.45)';
  ctx.lineWidth = 5;
  for (const s of state.skids) {
    ctx.globalAlpha = Math.min(1, s.life / 5);
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.angle) * 12, s.y - Math.sin(s.angle) * 12);
    ctx.lineTo(s.x + Math.cos(s.angle) * 12, s.y + Math.sin(s.angle) * 12);
    ctx.stroke();
  }
  ctx.restore();
}

/** Every car: body, windshield, roof, headlights, and its kind's marking. */
function drawCars(ctx, state) {
  for (const car of state.cars) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-CAR_LENGTH / 2 + 4, -CAR_WIDTH / 2 + 5, CAR_LENGTH, CAR_WIDTH);
    ctx.fillStyle = car.color;
    roundRect(ctx, -CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH, 7);
    ctx.fill();
    ctx.fillStyle = '#1c2433';
    ctx.fillRect(-8, -CAR_WIDTH / 2 + 3, 16, CAR_WIDTH - 6);
    ctx.fillStyle = '#bfe9ff';
    ctx.fillRect(10, -CAR_WIDTH / 2 + 4, 8, CAR_WIDTH - 8);
    // Headlights.
    ctx.fillStyle = '#fff7ae';
    ctx.fillRect(CAR_LENGTH / 2 - 4, -CAR_WIDTH / 2 + 2, 4, 6);
    ctx.fillRect(CAR_LENGTH / 2 - 4, CAR_WIDTH / 2 - 8, 4, 6);
    if (car.kind === 'police') {
      ctx.fillStyle = PALETTE.policeStripe;
      ctx.fillRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, 6);
      ctx.fillStyle = '#ff2d55';
      ctx.fillRect(-4, -CAR_WIDTH / 2 - 3, 8, 5);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-4, CAR_WIDTH / 2 - 2, 8, 5);
      ctx.fillStyle = '#1c2433';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLISI', 0, 4);
    }
    if (car.kind === 'swat') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SWAT', 0, 4);
    }
    if (car.kind === 'convoy') {
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◆ BERLIAN ◆', 0, 4);
    }
    if (car.kind === 'player') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ KAMU', 0, 4);
    }
    if (car.hp !== undefined && car.hp < 60 && car.kind !== 'civil') {
      // Smoke from a damaged car.
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.beginPath();
      ctx.arc(-CAR_LENGTH / 2 - 6, 0, 6 + Math.sin(state.time * 9) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Pedestrians: a walking body, a head, and a raised phone when recording. */
function drawPeds(ctx, state) {
  for (const ped of state.peds) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(4, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    if (ped.recording) {
      // Phone raised toward the player.
      ctx.fillStyle = '#111827';
      ctx.fillRect(8, -8, 4, 9);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(9, -7, 2, 7);
      ctx.rotate(-ped.angle);
      ctx.fillStyle = '#ff2d55';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('● REC', 0, -18);
      if (ped.flashT > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(10, -4, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/** The player on foot: a pink-shirted figure with a direction nose. */
function drawPlayer(ctx, state) {
  const { player } = state;
  if (!player.onFoot) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 6, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(player.angle);
  // White ring + label so the player on foot always reads as the hero.
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.playerShirt;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(6, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2433';
  ctx.fillRect(10, -3, 8, 6);
  // Punch reach indicator while punching.
  if (player.punchCd > 0.25) {
    ctx.strokeStyle = 'rgba(255,210,63,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30, -0.6, 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

/** The news helicopter: body, glass, spinning rotor, spotlight on the player. */
function drawHeli(ctx, state) {
  const heli = state.heli;
  if (!heli.active || heli.fade <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = heli.fade;
  // Spotlight cone on the street.
  ctx.fillStyle = 'rgba(255,244,180,0.20)';
  ctx.beginPath();
  ctx.moveTo(heli.x, heli.y);
  ctx.lineTo(heli.spotX - 70, heli.spotY - 40);
  ctx.lineTo(heli.spotX + 70, heli.spotY + 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,244,180,0.35)';
  ctx.beginPath();
  ctx.ellipse(heli.spotX, heli.spotY, 70, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shadow + body.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(heli.x + 14, heli.y + 18, 34, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.heliBody;
  ctx.beginPath();
  ctx.ellipse(heli.x, heli.y, 34, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.heliGlass;
  ctx.beginPath();
  ctx.ellipse(heli.x + 16, heli.y - 2, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(heli.x - 40, heli.y - 6);
  ctx.lineTo(heli.x - 52, heli.y - 10);
  ctx.stroke();
  // Rotor.
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 3;
  const r = heli.rotor;
  ctx.beginPath();
  ctx.moveTo(heli.x - Math.cos(r) * 52, heli.y - Math.sin(r) * 10);
  ctx.lineTo(heli.x + Math.cos(r) * 52, heli.y + Math.sin(r) * 10);
  ctx.moveTo(heli.x - Math.cos(r + Math.PI / 2) * 52, heli.y - Math.sin(r + Math.PI / 2) * 10);
  ctx.lineTo(heli.x + Math.cos(r + Math.PI / 2) * 52, heli.y + Math.sin(r + Math.PI / 2) * 10);
  ctx.stroke();
  // "TV-7 BERITA" label under the chopper.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TV-7 BERITA', heli.x, heli.y + 26);
  ctx.restore();
}

/** Particles: sparks, smoke, gold pickup glints. */
function drawParticles(ctx, state) {
  ctx.save();
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** White camera flashes from recording pedestrians and the helicopter. */
function drawFlashes(ctx, state) {
  ctx.save();
  for (const f of state.flashes) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife) * 0.8;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The big cover logo, drawn only for the cover screenshot staging. */
function drawCoverLogo(ctx, state) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,14,30,0.35)';
  ctx.fillRect(0, 120, VIEW_WIDTH, 150);
  ctx.fillStyle = '#ff5d8f';
  ctx.font = 'bold 92px system-ui, sans-serif';
  ctx.fillText(GAME_TITLE, VIEW_WIDTH / 2, 210);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('COSTA VIDRIO • ' + formatViewers(state.player.viewers) + ' MENONTON LIVE', VIEW_WIDTH / 2, 250);
  ctx.restore();
}

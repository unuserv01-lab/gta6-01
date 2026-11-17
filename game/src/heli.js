// LIVE HEIST — heli.js
// The TV-7 news helicopter. From 3 stars it sticks to the player, circling
// overhead with a spotlight and a live feed — the "LIVE" overlay made flesh.
// It never attacks; it just makes sure the whole city is watching.

import { clamp } from './config.js';

/** Fresh heli state (parked until 3 stars). */
export function createHeli() {
  return { active: false, x: 0, y: 0, angle: 0, orbit: 0, rotor: 0 };
}

/** Advance the heli: activate at 3 stars, orbit the player, spin the rotor. */
export function stepHeli(state, dt) {
  const heli = state.heli;
  const want = state.police.stars >= 3;
  if (want && !heli.active) {
    heli.active = true;
    heli.x = state.player.x;
    heli.y = state.player.y - 160;
    heli.orbit = 0;
  }
  if (!want) {
    heli.active = false;
    return;
  }
  heli.orbit += dt * 0.55;
  const R = 150;
  heli.x = state.player.x + Math.cos(heli.orbit) * R;
  heli.y = state.player.y + Math.sin(heli.orbit) * R - 30;
  heli.angle = Math.atan2(state.player.y - heli.y, state.player.x - heli.x);
  heli.rotor += dt * 22;
}

/** Draw the heli, its rotor blur and its spotlight cone on the player. */
export function drawHeli(ctx, state) {
  const heli = state.heli;
  if (!heli.active) return;
  // Spotlight cone from heli to player.
  const px = state.player.x;
  const py = state.player.y;
  const grad = ctx.createRadialGradient(px, py, 10, px, py, 190);
  grad.addColorStop(0, 'rgba(255, 248, 192, 0.35)');
  grad.addColorStop(1, 'rgba(255, 248, 192, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, 190, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(heli.x, heli.y);
  // Shadow on the ground.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(8, 26, 34, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rotor blur.
  ctx.strokeStyle = 'rgba(20,20,30,0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(Math.cos(heli.rotor) * 46, Math.sin(heli.rotor) * 10);
  ctx.lineTo(-Math.cos(heli.rotor) * 46, -Math.sin(heli.rotor) * 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(Math.cos(heli.rotor + Math.PI / 2) * 46, Math.sin(heli.rotor + Math.PI / 2) * 10);
  ctx.lineTo(-Math.cos(heli.rotor + Math.PI / 2) * 46, -Math.sin(heli.rotor + Math.PI / 2) * 10);
  ctx.stroke();
  // Body + tail + camera.
  ctx.rotate(heli.angle);
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2f3a';
  ctx.fillRect(-52, -4, 26, 8);
  ctx.fillStyle = '#bdefff';
  ctx.beginPath();
  ctx.ellipse(12, 0, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(20, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // TV-7 label under the heli.
  ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
  const label = 'TV-7 NEWS • LIVE';
  ctx.font = 'bold 12px sans-serif';
  const w = ctx.measureText(label).width + 16;
  ctx.fillRect(heli.x - w / 2, heli.y + 24, w, 20);
  ctx.fillStyle = '#ff2d2d';
  ctx.beginPath();
  ctx.arc(heli.x - w / 2 + 10, heli.y + 34, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(label, heli.x - w / 2 + 18, heli.y + 38);
}

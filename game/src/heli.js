// SPDX-License-Identifier: MIT
// Live Heist — the news helicopter.
// At three stars the channel sends its eye in the sky: a news heli
// that shadows the player, keeps the spotlight on them and makes the
// broadcast impossible to shake until the stars fall. It never shoots
// — it just watches, which is worse.

import { CFG } from './config.js';

export function createHeli() {
  return {
    active: false,
    x: 0, y: 0,
    angle: 0,
    rotor: 0,
    spotlight: 0,
    bobPhase: 0,
  };
}

export function updateHeli(G, dt) {
  const heli = G.heli;
  const want = G.wanted.stars >= CFG.heliAtStars;
  if (want && !heli.active) {
    heli.active = true;
    heli.x = G.player.x - 260;
    heli.y = G.player.y - 260;
    G.feed.push('SKY 5 NEWS HELI ON STATION — "We are live above the chase"');
    G.audio.blip(520, 0.15);
  }
  if (!want && heli.active) {
    heli.active = false;
    G.feed.push('News heli pulling off — the broadcast is cooling down');
    return;
  }
  if (!heli.active) return;
  heli.rotor += dt * 26;
  heli.bobPhase += dt * 1.8;
  // Lags behind the player like a camera operator framing a shot.
  const tx = G.player.x - 150;
  const ty = G.player.y - 190;
  heli.x += (tx - heli.x) * Math.min(1, dt * 1.1);
  heli.y += (ty - heli.y) * Math.min(1, dt * 1.1);
  heli.angle = Math.atan2(G.player.y - heli.y, G.player.x - heli.x);
  heli.spotlight = Math.min(1, heli.spotlight + dt * 0.8);
  // The spotlight feeds the broadcast only once it is fully on the player:
  // being watched is heat, but only when the camera has found you.
  if (heli.spotlight >= 1) G.wanted.heat += dt * 0.9;
}

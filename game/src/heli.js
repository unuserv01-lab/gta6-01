// The VIDRIO TV news helicopter: it only flies when the audience is big
// enough (3 stars and up), then it hangs over the player with a spotlight
// and a LIVE bug, turning every chase into a broadcast. Cheap to build —
// one sprite that follows the player — and the clearest "you are on TV"
// signal in the game.

import { clamp, playerCar } from './world.js';

/** One step for the news helicopter: ease above the player, or park off-screen. */
export function stepHeli(state, dt) {
  const heli = state.heli;
  const want = state.wanted.stars >= 3;
  heli.active = want;
  if (!want) return;
  const p = state.player;
  const car = playerCar(state);
  const px = car ? car.x : p.x;
  const py = car ? car.y : p.y;
  // Hover up and to the left of the player, lagging a little behind.
  const tx = clamp(px - 90, 60, 3140);
  const ty = clamp(py - 110, 60, 2340);
  heli.x += (tx - heli.x) * Math.min(1, dt * 1.6);
  heli.y += (ty - heli.y) * Math.min(1, dt * 1.6);
  heli.angle += dt * 0.8;
}

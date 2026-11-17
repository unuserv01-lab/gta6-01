// The news helicopter: at 3+ stars a TV chopper sticks to the player, its
// spotlight cone sweeping the street below and the LIVE overlay going out
// to the whole city. It is one sprite that follows the player — cheap, and
// the clearest sign on screen that the whole city is watching.
import { clamp } from './config.js';

/** Update the helicopter: appear at 3 stars, hover over the player, leave at 0. */
export function updateHeli(state, dt) {
  const { player, heli } = state;
  const want = player.stars >= 3;
  heli.active = want || heli.fade > 0;
  if (want) {
    heli.fade = Math.min(1, heli.fade + dt * 2);
  } else {
    heli.fade = Math.max(0, heli.fade - dt * 1.5);
  }
  if (heli.fade <= 0) return;
  // Ease toward a hover point just above and behind the player.
  const tx = player.x - 40;
  const ty = player.y - 90;
  heli.x += (tx - heli.x) * Math.min(1, dt * 1.6);
  heli.y += (ty - heli.y) * Math.min(1, dt * 1.6);
  heli.rotor += dt * 22;
  heli.sweep += dt * 0.7;
  heli.spotX = player.x + Math.cos(heli.sweep) * 60;
  heli.spotY = player.y + Math.sin(heli.sweep) * 60;
  // The chopper's camera flash is the city filming the chase.
  if (state.rng() < dt * 0.4) {
    state.flashes.push({ x: player.x, y: player.y, life: 0.3, maxLife: 0.3 });
  }
}

/** Create the helicopter's initial state. */
export function createHeli(state) {
  return {
    x: state.player.x,
    y: state.player.y - 90,
    rotor: 0,
    sweep: 0,
    fade: 0,
    active: false,
    spotX: state.player.x,
    spotY: state.player.y,
  };
}

/** How much of the TV overlay the chopper adds (0..1), for the HUD. */
export function heliIntensity(state) {
  return clamp(state.heli.fade, 0, 1);
}

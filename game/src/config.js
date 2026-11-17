// LIVE HEIST — config.js
// All tuning for Costa Vidrio: city size, movement, wanted/viewer math, palette.
// One job: constants. Nothing here touches the DOM or the game state.

// World geometry: a sunny coastal city, 40 x 30 tiles of 64 px.
export const TILE = 64;
export const COLS = 40;
export const ROWS = 30;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;
export const STEP = 1 / 60;
export const SAVE_KEY = 'liveheist-save-v1';

// Avenues (vertical roads) and streets (horizontal roads), in tile coordinates.
// Each road is 2 tiles wide; the beach is the last rows, the sea after it.
export const AVENUES = [5, 13, 21, 29, 37];
export const STREETS = [4, 11, 18, 25];
export const BEACH_ROW = 27;
export const SEA_ROW = 28;

// Player movement.
export const PLAYER_WALK = 195;
export const PLAYER_RUN = 265;
export const PLAYER_RADIUS = 14;
export const PLAYER_HEALTH = 100;

// Car physics.
export const CAR_ACCEL = 520;
export const CAR_MAX = 430;
export const CAR_REVERSE = 170;
export const CAR_TURN = 2.6;
export const CAR_BRAKE = 700;
export const CAR_DRAG = 0.55;
export const POLICE_MAX = 465;
export const SWAT_MAX = 500;

// Wanted / viewer-count tuning. Heat 0..100 maps to stars 0..5.
export const HEAT_STEAL_CAR = 18;
export const HEAT_PUNCH = 8;
export const HEAT_SHOOT = 12;
export const HEAT_HIT_PED = 15;
export const HEAT_ROBBERY = 42;
export const HEAT_DECAY = 1.6;
export const HEAT_HIDEOUT_DECAY = 22;
export const STAR_THRESHOLDS = [0, 12, 30, 52, 72, 90];
export const VIEWERS_BASE = 120;

// Sun-soaked Costa Vidrio palette: orange, cyan, pink, warm sand.
export const PALETTE = {
  sky: '#ffe3b3',
  grass: '#8fce6e',
  sand: '#f2d492',
  sea: '#2fa8c9',
  seaDeep: '#1e7fa8',
  sidewalk: '#e3d3ae',
  road: '#3d414d',
  roadLine: '#ffd94d',
  buildingOrange: '#ff9f43',
  buildingCyan: '#38b6d3',
  buildingPink: '#ff6b9d',
  buildingYellow: '#ffd166',
  buildingCream: '#f7ede2',
  buildingTeal: '#2ec4b6',
  roof: '#2b2f3a',
  garage: '#5b6b7a',
  park: '#79c25f',
  liveRed: '#e63946',
  gold: '#ffb703',
  hudBg: 'rgba(12, 16, 28, 0.78)',
  hudLine: 'rgba(255, 255, 255, 0.16)',
};

/** Clamp a number into [lo, hi]. */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Smallest signed angle difference from a to b, in radians. */
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance between two points. */
export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Format a viewer/follower count: 12400 -> "12.4K", 950 -> "950". */
export function formatCount(n) {
  const v = Math.max(0, Math.floor(n));
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

/** Format cash: 1250 -> "$1,250". */
export function formatMoney(n) {
  return `$${Math.floor(n).toLocaleString('en-US')}`;
}

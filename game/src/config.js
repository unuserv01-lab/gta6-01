// LIVE HEIST — Costa Vidrio. Every tuning number and colour in one place.
// The world is a fixed 3200x2400 sunny coastal city; the camera shows a
// 1280x720 window of it, so no rule below depends on the screen size.
// Differentiation note (top-10 audit, 18 Nov): sunny coastal cities
// dominate the field, so this entry wins on the DENSEST TV frame — a big
// LIVE badge and viewer count, a scrolling news ticker, REC icons over
// filming bystanders, a BREAKING overlay, a red minimap at 4 stars, and a
// visible SIGNAL LOST moment when the broadcast is cut in an alley.

export const WORLD = { width: 3200, height: 2400 };
export const VIEW = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Where the save (cash, followers, best episode) is kept between visits. */
export const SAVE_KEY = 'live-heist.save.v1';

/** The road grid of Costa Vidrio: five avenues north-south, four east-west. */
export const ROAD_W = 140;
export const ROAD_X = [400, 1000, 1600, 2200, 2800];
export const ROAD_Y = [400, 1000, 1600, 2000];

export const PLAYER = {
  walkSpeed: 275,
  radius: 14,
  hp: 100,
  punchRange: 58,
  punchArc: 1.1,
};

export const CAR = {
  accel: 540,
  brake: 760,
  maxSpeed: 580,
  reverseMax: 190,
  turn: 2.7,
  radius: 21,
  boostMax: 100,
  boostDrain: 34,
  boostRegen: 12,
};

export const POLICE = {
  maxSpeed: 480,
  accel: 450,
  turn: 3.0,
  radius: 21,
  catchRadius: 48,
  bustedSeconds: 1.6,
  ramDamage: 14,
};

export const SWAT = { maxSpeed: 520, accel: 520, radius: 24, ramDamage: 22 };

/** Wanted heat: 100 heat is one star. Stars are the viewer count made visible. */
export const WANTED = {
  heatPerStar: 100,
  decaySafe: 30,
  decayOpen: 2.0,
  stealHeat: 60,
  punchHeat: 16,
  speedHeat: 6,
  missionHeat: 45,
  baseViewers: 1240,
  viewersPerStar: 4200,
  viewersPerHeat: 30,
};

/** Sun-soaked Costa Vidrio: hot sun, orange-cyan-pink, TV-broadcast chrome. */
export const PALETTE = {
  sand: '#f0c573',
  sea: '#1fb6d8',
  seaDeep: '#0d7ea6',
  grass: '#7ec850',
  pavement: '#e3d3a8',
  road: '#464052',
  roadEdge: '#35303f',
  roadLine: '#ffd94d',
  sidewalk: '#efe0b8',
  building: ['#ff7a59', '#19c2d8', '#ff5fa2', '#ffb347', '#7dd069', '#8e7cf3', '#f2e394', '#ff8c69'],
  shop: '#ff5fa2',
  garage: '#19c2d8',
  alley: '#b7a06a',
  palm: '#2f9e44',
  palmTrunk: '#8a5a2b',
  player: '#ff7a1a',
  playerShirt: '#ffe14d',
  police: '#1d2433',
  policeWhite: '#f4f6f8',
  swat: '#232a3a',
  heli: '#e8ecf2',
  heliStripe: '#ff3b30',
  ped: ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b', '#9b5de5'],
  car: ['#ff5fa2', '#19c2d8', '#ffb347', '#f2e394', '#7dd069', '#8e7cf3', '#e5534b', '#4fc3f7'],
  text: '#fff7e6',
  darkText: '#241f2e',
  panel: '#14101ccc',
  panelEdge: '#ff5fa2',
  liveRed: '#ff2e3e',
  star: '#ffd94d',
  minimap: '#14101cd9',
  ticker: '#ff2e3e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const FONT_DISPLAY = '"Arial Black", "Segoe UI", system-ui, sans-serif';

/** News ticker lines that scroll along the bottom of the screen. */
export const TICKER_LINES = [
  'BREAKING: Mystery driver turns Costa Vidrio into a live show — viewers climbing by the minute',
  'VIDRIO TV: Who is the Wheelman? City asks as chase goes viral',
  'SUNNY COLA signs on as first sponsor of the runaway broadcast',
  'Traffic advisory: avoid Avenida del Sol — police activity and one very pink car',
  'Witnesses report pedestrians filming the chase: "It is like TV, but real"',
  'Marina Vault heist: police confirm a vault was emptied during a live stream',
  'VIDRIO ENERGY offers a reward for the Comet GT — "bring it to the studio, live"',
];

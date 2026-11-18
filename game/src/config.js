// SPDX-License-Identifier: MIT
// Live Heist — tuning table for Costa Vidrio.
// Every number that shapes the chase, the crowd and the broadcast lives here,
// so the rest of the game reads like a script, not a spreadsheet.

export const CFG = {
  // World
  worldW: 3600,
  worldH: 2600,
  roadW: 96,
  // Player on foot
  walkSpeed: 235,
  runSpeed: 330,
  playerRadius: 13,
  playerMaxHealth: 100,
  playerMaxArmor: 100,
  // Cars
  carAccel: 520,
  carBrake: 900,
  carReverse: 260,
  carMaxSpeed: 560,
  carMaxReverse: 200,
  carTurn: 2.6,
  carLength: 52,
  carWidth: 26,
  stealRange: 64,
  // Traffic
  trafficCount: 30,
  pedCount: 48,
  trafficSpeedMin: 90,
  trafficSpeedMax: 170,
  // Wanted / broadcast
  heatPerSteal: 26,
  heatPerHitPed: 14,
  heatPerShot: 9,
  heatPerCopDown: 34,
  heatPerSpeeding: 0.6,
  heatDecay: 2.2,
  heatDecayDeadZone: 26,
  starThresholds: [0, 18, 42, 72, 108, 150],
  viewersBase: 380,
  viewersPerHeat: 118,
  viewersJitter: 240,
  // Police
  policeMaxSpeed: 520,
  policeAccel: 640,
  policeRamDamage: 7,
  policeSpawnGap: 3.2,
  roadblockAtStars: 4,
  swatAtStars: 5,
  heliAtStars: 3,
  // Combat
  pistolDamage: 34,
  pistolAmmo: 12,
  pistolRange: 420,
  punchDamage: 18,
  punchRange: 42,
  // Missions
  missionRewardCash: [2400, 3600, 5200, 9000],
  missionRewardFollowers: [1800, 3400, 6100, 12500],
  // Camera / view
  viewW: 1280,
  viewH: 720,
  camLerp: 6.5,
  // Money / progress
  startCash: 850,
  startFollowers: 1240,
};

export const PALETTE = {
  sand: '#e8c98a',
  sandDark: '#d9b878',
  sea: '#1fa8c9',
  seaDeep: '#0e7ba0',
  grass: '#7fb069',
  asphalt: '#3a3f4a',
  asphaltLight: '#4a4f5c',
  sidewalk: '#b9b3a4',
  lineYellow: '#ffd23f',
  lineWhite: '#f2f2f2',
  orange: '#ff7a1a',
  pink: '#ff4d8d',
  cyan: '#19d3e6',
  cream: '#fff3d6',
  ink: '#14161f',
  roofA: '#e2603f',
  roofB: '#3f8f6b',
  roofC: '#e8a13c',
  roofD: '#7a5fb0',
  roofE: '#c94f6d',
  roofF: '#4f7ec9',
};

export const RADIO_STATIONS = [
  { name: 'RADIO VIDRIO 101.3', track: '"Sunset Static" — Las Olas' },
  { name: 'OLA FM 88.7', track: '"Neon Palms" — DJ Brisa' },
  { name: 'COSTA TALK 640 AM', track: 'Heist Talk with Mara Voss' },
  { name: 'PLAYA BEATS 96.1', track: '"Boardwalk Run" — The Tides' },
];

export const TICKER_LINES = [
  'BREAKING: Masked driver livestreaming a chase down Avenida Sol — viewers climbing fast',
  'VIDRIO PD: "Do not approach the orange coupe — it is being broadcast live"',
  'Sponsor deal of the day: SUNNY SODA backs the boldest driver in Costa Vidrio',
  'Traffic alert: roadblocks reported near the Marina — expect delays',
  'City Hall denies the "LIVE HEIST" channel exists. The channel disagrees.',
  'Weather: 31C, clear skies, perfect for a getaway',
];

export const MISSION_DEFS = [
  {
    id: 1,
    title: 'EPISODE 1 — THE MARINA GRAB',
    intro: 'Rico: "First episode, kid. Steal the orange Comet parked at the Marina and bring it to my garage. Make it look good — the chat is watching."',
    sponsor: 'SUNNY SODA',
  },
  {
    id: 2,
    title: 'EPISODE 2 — CORNER STORE SMASH',
    intro: 'Mara: "Bodega Sol keeps its till in the back. Walk in, take it, and vanish into a dead zone before the PD catches the signal."',
    sponsor: 'TACO LOCO',
  },
  {
    id: 3,
    title: 'EPISODE 3 — THE SPONSOR RUN',
    intro: 'Rico: "A sponsor package is waiting on the pier. Grab it, deliver it to the rooftop drop, and do it loud — three stars minimum or the deal dies."',
    sponsor: 'VOLT ENERGY',
  },
  {
    id: 4,
    title: 'EPISODE 4 — THE BROADCAST HEIST',
    intro: 'Mara: "The finale. Crack the Bank Vidrio vault, hold the line at five stars, and cut the feed in a dead zone. One million viewers or it never happened."',
    sponsor: 'VIDRIO BANK',
  },
];

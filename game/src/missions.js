// SPDX-License-Identifier: MIT
// Live Heist — missions: four heist episodes, one story.
// Each episode is a little arc with stages: go there, do the thing,
// get out loud. Finishing one pays cash and followers, unlocks the
// next, and flashes an episode-complete card. The story is told by
// Rico and Mara, the two voices on the player's earpiece.

import { CFG, MISSION_DEFS } from './config.js';
import { inDeadZone } from './world.js';
import { makePlayerCar } from './vehicles.js';

export function createMissions() {
  return {
    index: 0, // which episode is live (0..3), 4 = all done
    stage: 0,
    active: false,
    started: false,
    holdProgress: 0,
    holdNeeded: 0,
    objective: '',
    target: null,
    timer: 0,
    completedCount: 0,
    completeCard: null,
    completeCardTimer: 0,
    stashesFound: 0,
    stashesTotal: 5,
    dialog: null,
    dialogTimer: 0,
  };
}

function setObjective(G, text, target) {
  G.missions.objective = text;
  G.missions.target = target || null;
}

function say(G, who, text, seconds = 5) {
  G.missions.dialog = { who, text };
  G.missions.dialogTimer = seconds;
}

export function startEpisode(G, idx) {
  const m = G.missions;
  const def = MISSION_DEFS[idx];
  if (!def) return;
  m.index = idx;
  m.stage = 0;
  m.active = true;
  m.started = true;
  m.holdProgress = 0;
  m.timer = 0;
  const L = G.world.landmarks;
  if (idx === 0) {
    // Stage 0: reach the Marina, stage 1: steal the Comet, stage 2: deliver.
    setObjective(G, 'Go to the MARINA and steal the orange Comet GT', { x: L.marina.x, y: L.marina.y, r: 90, label: 'MARINA' });
    G.missionCar = makePlayerCar(L.marina.x + 40, L.marina.y + 30, -Math.PI / 2, 0);
    G.missionCar.isMission = true;
    say(G, 'RICO', def.intro, 7);
  } else if (idx === 1) {
    setObjective(G, 'Rob the till at BODEGA SOL — walk up and hold E', { x: L.bodega.x, y: L.bodega.y, r: 110, label: 'BODEGA SOL' });
    say(G, 'MARA', def.intro, 7);
  } else if (idx === 2) {
    setObjective(G, 'Pick up the sponsor package on PIER 9', { x: L.pier.x, y: L.pier.y, r: 90, label: 'PIER 9' });
    say(G, 'RICO', def.intro, 7);
  } else if (idx === 3) {
    setObjective(G, 'Crack the BANK VIDRIO vault — hold E at the door', { x: L.bank.x, y: L.bank.y, r: 120, label: 'BANK VIDRIO' });
    say(G, 'MARA', def.intro, 7);
  }
  G.feed.push(def.title + ' — STARTED');
  G.audio.blip(660, 0.1);
  G.audio.blip(990, 0.14);
}

export function completeEpisode(G) {
  const m = G.missions;
  const idx = m.index;
  const cash = CFG.missionRewardCash[idx];
  const fans = CFG.missionRewardFollowers[idx];
  G.player.cash += cash;
  G.player.followers += fans;
  m.completedCount += 1;
  m.active = false;
  m.completeCard = {
    episode: idx + 1,
    title: MISSION_DEFS[idx].title,
    cash, fans,
    sponsor: MISSION_DEFS[idx].sponsor,
  };
  m.completeCardTimer = 6;
  G.feed.push(`${MISSION_DEFS[idx].title} COMPLETE — +$${cash}, +${fans} followers`);
  G.audio.fanfare();
  G.saveGame();
  if (idx + 1 < MISSION_DEFS.length) {
    m.nextReady = true;
  }
}

function atTarget(G, slack = 0) {
  const t = G.missions.target;
  if (!t) return false;
  return Math.hypot(G.player.x - t.x, G.player.y - t.y) < t.r + slack;
}

export function updateMissions(G, dt) {
  const m = G.missions;
  m.timer += dt;
  if (m.dialogTimer > 0) m.dialogTimer -= dt;
  if (m.completeCardTimer > 0) m.completeCardTimer -= dt;

  // Hidden stashes: five orange duffel bags around the city, $300 each.
  if (!m.stashSpots) {
    m.stashSpots = [
      { x: 420, y: 1420, found: false },
      { x: 2450, y: 420, found: false },
      { x: 1420, y: 2450, found: false },
      { x: 2950, y: 1950, found: false },
      { x: 700, y: 950, found: false },
    ];
  }
  for (const s of m.stashSpots) {
    if (!s.found && Math.hypot(G.player.x - s.x, G.player.y - s.y) < 44) {
      s.found = true;
      m.stashesFound += 1;
      G.player.cash += 300;
      G.feed.push(`STASH FOUND ${m.stashesFound}/5 — +$300`);
      G.audio.blip(1200, 0.1);
    }
  }

  if (!m.active) {
    // Between episodes: offer the next one with a prompt.
    if (m.index < MISSION_DEFS.length && m.completedCount === m.index && !m.started) {
      m.started = true;
      startEpisode(G, m.index);
    } else if (m.nextReady) {
      m.nextReady = false;
      startEpisode(G, m.index + 1);
    }
    return;
  }

  const L = G.world.landmarks;
  if (m.index === 0) {
    if (m.stage === 0 && atTarget(G)) {
      m.stage = 1;
      setObjective(G, 'Steal the orange Comet GT — press E next to it', { x: L.marina.x + 40, y: L.marina.y + 30, r: 70, label: 'COMET GT' });
      say(G, 'RICO', '"There she is. Orange, loud, insured by someone else. Take her."');
    } else if (m.stage === 1 && G.playerCar && G.playerCar.isMission) {
      m.stage = 2;
      setObjective(G, "Deliver the Comet to RICO'S GARAGE", { x: L.garageRico.x, y: L.garageRico.y, r: 110, label: "RICO'S GARAGE" });
      say(G, 'RICO', '"Beautiful. Now bring her home — and try not to total her on camera."');
    } else if (m.stage === 2 && atTarget(G)) {
      completeEpisode(G);
    }
  } else if (m.index === 1) {
    if (m.stage === 0) {
      if (atTarget(G)) {
        m.stage = 1;
        m.holdNeeded = 2.5;
        m.holdProgress = 0;
        setObjective(G, 'HOLD E — empty the till', { x: L.bodega.x, y: L.bodega.y, r: 110, label: 'BODEGA SOL' });
      }
    } else if (m.stage === 1) {
      if (G.input.keys.has('e') && atTarget(G)) {
        m.holdProgress += dt;
        if (m.holdProgress >= m.holdNeeded) {
          m.stage = 2;
          G.wanted.heat += 30;
          setObjective(G, 'Escape to a SIGNAL DEAD ZONE — cut the feed!', { x: 2050, y: 2050, r: 130, label: 'ALLEY 9' });
          say(G, 'MARA', '"Till\'s empty. Now disappear — Alley 9 kills the signal."');
        }
      } else {
        m.holdProgress = Math.max(0, m.holdProgress - dt * 2);
      }
    } else if (m.stage === 2 && inDeadZone(G.world, G.player.x, G.player.y)) {
      completeEpisode(G);
    }
  } else if (m.index === 2) {
    if (m.stage === 0 && atTarget(G)) {
      m.stage = 1;
      G.wanted.heat = Math.max(G.wanted.heat, 72);
      setObjective(G, 'Deliver the package to the ROOFTOP DROP — stay loud (3★)', { x: L.rooftopDrop.x, y: L.rooftopDrop.y, r: 110, label: 'ROOFTOP DROP' });
      say(G, 'RICO', '"Package secured. The sponsor wants a show — keep the stars up till the drop."');
    } else if (m.stage === 1 && atTarget(G)) {
      completeEpisode(G);
    }
  } else if (m.index === 3) {
    if (m.stage === 0) {
      if (atTarget(G)) {
        m.stage = 1;
        m.holdNeeded = 4;
        m.holdProgress = 0;
        setObjective(G, 'HOLD E — crack the vault', { x: L.bank.x, y: L.bank.y, r: 120, label: 'BANK VIDRIO' });
      }
    } else if (m.stage === 1) {
      if (G.input.keys.has('e') && atTarget(G)) {
        m.holdProgress += dt;
        G.wanted.heat = Math.max(G.wanted.heat, 108);
        if (m.holdProgress >= m.holdNeeded) {
          m.stage = 2;
          setObjective(G, 'VAULT OPEN — escape to a SIGNAL DEAD ZONE at 5★', { x: 950, y: 2050, r: 130, label: 'UNDERPASS' });
          say(G, 'MARA', '"Vault\'s open, the whole city is watching. Cut the feed in the underpass!"');
        }
      } else {
        m.holdProgress = Math.max(0, m.holdProgress - dt * 2);
      }
    } else if (m.stage === 2 && inDeadZone(G.world, G.player.x, G.player.y)) {
      completeEpisode(G);
    }
  }
}

export function missionProgressText(G) {
  const m = G.missions;
  if (m.completedCount >= MISSION_DEFS.length) return 'ALL EPISODES COMPLETE';
  return `EPISODE ${m.index + 1}/4`;
}

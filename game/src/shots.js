// SPDX-License-Identifier: MIT
// Live Heist — screenshot staging.
// When the page loads with ?scene=cover|chase|onfoot|episode, the game
// jumps straight into a staged moment: a chase, a street full of
// filming bystanders, or an episode-complete card. This is how the
// maker's four screenshots are taken — the same live code, no edits,
// just a chosen starting state.

import { CFG } from './config.js';
import { makePlayerCar } from './vehicles.js';
import { spawnPoliceUnit } from './police.js';

export function sceneFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('scene') || q.get('shot') || '';
  } catch (err) {
    return '';
  }
}

export function stageScene(G, scene) {
  if (!scene) return;
  const L = G.world.landmarks;
  const P = G.player;

  if (scene === 'cover') {
    // A four-star chase on the main avenue: player in the orange Comet,
    // three cruisers behind, news heli overhead, roadblock ahead.
    const car = makePlayerCar(1300, 1300, 0, 0);
    G.playerCar = car;
    P.inCar = true;
    P.x = car.x; P.y = car.y; P.angle = 0;
    P.cash = 4850;
    P.followers = 12400;
    G.wanted.heat = 135; // holds 4 stars through the capture delay
    G.wanted.stars = 4;
    G.wanted.viewers = 12400;
    G.police.length = 0;
    for (let i = 0; i < 3; i++) {
      const u = spawnPoliceUnit(G, 'cruiser');
      u.x = 1300 - 180 - i * 110;
      u.y = 1300 + (i - 1) * 44;
      u.angle = 0;
      u.speed = 420;
      u.status = i === 0 ? 'RAMMING' : 'PURSUIT';
    }
    G.heli.active = true;
    G.heli.x = 1150;
    G.heli.y = 1110;
    G.heli.spotlight = 1;
    G.roadblocks.push({
      x: 1780, y: 1300, angle: Math.PI / 2, kind: 'roadblock',
      health: 160, name: 'ROADBLOCK', callsign: 'Block', status: 'ROADBLOCK',
    });
    G.missions.active = true;
    G.missions.index = 0;
    G.missions.stage = 2;
    G.missions.objective = "Deliver the Comet to RICO'S GARAGE — lose the PD first!";
    G.missions.target = { x: L.garageRico.x, y: L.garageRico.y, r: 110, label: "RICO'S GARAGE" };
    G.missions.dialog = { who: 'RICO', text: '"Four stars, kid — the whole city is watching. Make it worth their while!"' };
    G.missions.dialogTimer = 99;
    // A crowd of filming bystanders along the avenue.
    G.peds.slice(0, 10).forEach((ped, i) => {
      ped.x = 1150 + i * 70;
      ped.y = 1236;
      ped.filming = true;
      ped.angle = Math.atan2(P.y - ped.y, P.x - ped.x);
    });
    G.camera.x = P.x - CFG.viewW / 2;
    G.camera.y = P.y - CFG.viewH / 2;
  } else if (scene === 'chase') {
    // Five stars at dusk-ish heat: SWAT van, heli, roadblock, red minimap.
    const car = makePlayerCar(1800, 1800, Math.PI / 2, 1);
    G.playerCar = car;
    P.inCar = true;
    P.x = car.x; P.y = car.y; P.angle = Math.PI / 2;
    P.cash = 9200;
    P.followers = 31200;
    G.wanted.heat = 168; // holds 5 stars through the capture delay
    G.wanted.stars = 5;
    G.wanted.viewers = 48200;
    G.police.length = 0;
    for (let i = 0; i < 4; i++) {
      const u = spawnPoliceUnit(G, i === 3 ? 'swat' : 'cruiser');
      u.x = 1800 + (i - 1.5) * 52;
      u.y = 1800 - 150 - i * 72;
      u.angle = Math.PI / 2;
      u.speed = 460;
      u.status = i === 3 ? 'BOXING IN' : 'PURSUIT';
    }
    G.heli.active = true;
    G.heli.x = 1650;
    G.heli.y = 1610;
    G.heli.spotlight = 1;
    G.roadblocks.push({
      x: 1800, y: 2280, angle: 0, kind: 'roadblock',
      health: 160, name: 'ROADBLOCK', callsign: 'Block', status: 'ROADBLOCK',
    });
    G.missions.active = true;
    G.missions.index = 3;
    G.missions.stage = 2;
    G.missions.objective = 'VAULT OPEN — escape to the UNDERPASS at 5★!';
    G.missions.target = { x: 950, y: 2050, r: 130, label: 'UNDERPASS' };
    G.missions.dialog = { who: 'MARA', text: '"Five stars and the vault is open. The finale is LIVE — do not get caught now!"' };
    G.missions.dialogTimer = 99;
    G.tickerIdx = 0;
    G.camera.x = P.x - CFG.viewW / 2;
    G.camera.y = P.y - CFG.viewH / 2;
  } else if (scene === 'onfoot') {
    // On foot outside Bodega Sol: filming crowd, shops, mission objective.
    P.inCar = false;
    P.x = 1340;
    P.y = 1010;
    P.angle = -Math.PI / 2;
    P.cash = 2100;
    P.followers = 8600;
    G.wanted.heat = 62; // holds 2 stars through the capture delay
    G.wanted.stars = 2;
    G.wanted.viewers = 8600;
    G.missions.active = true;
    G.missions.index = 1;
    G.missions.stage = 0;
    G.missions.objective = 'Rob the till at BODEGA SOL — walk up and hold E';
    G.missions.target = { x: L.bodega.x, y: L.bodega.y, r: 110, label: 'BODEGA SOL' };
    G.missions.dialog = { who: 'MARA', text: '"Bodega Sol, till in the back. Walk in like you own the place — you do, for the next two minutes."' };
    G.missions.dialogTimer = 99;
    G.peds.slice(0, 12).forEach((ped, i) => {
      ped.x = 1200 + (i % 6) * 56;
      ped.y = 940 + Math.floor(i / 6) * 60;
      ped.filming = true;
      ped.angle = Math.atan2(P.y - ped.y, P.x - ped.x);
    });
    G.camera.x = P.x - CFG.viewW / 2;
    G.camera.y = P.y - CFG.viewH / 2;
  } else if (scene === 'episode') {
    // Episode-complete card over a quiet street at dawn of episode 2.
    P.inCar = false;
    P.x = 800;
    P.y = 800;
    P.angle = 0;
    P.cash = 4850;
    P.followers = 12400;
    G.wanted.heat = 0;
    G.wanted.stars = 0;
    G.wanted.viewers = 12400;
    G.missions.active = false;
    G.missions.completedCount = 1;
    G.missions.index = 1;
    G.missions.objective = 'Next: EPISODE 2 — CORNER STORE SMASH. Press M when ready.';
    G.missions.target = null;
    G.missions.completeCard = {
      episode: 1,
      title: 'EPISODE 1 — THE MARINA GRAB',
      cash: 2400,
      fans: 1800,
      sponsor: 'SUNNY SODA',
    };
    G.missions.completeCardTimer = 999;
    G.camera.x = P.x - CFG.viewW / 2;
    G.camera.y = P.y - CFG.viewH / 2;
  }
}

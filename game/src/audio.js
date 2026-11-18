// SPDX-License-Identifier: MIT
// Live Heist — sound, synthesized live with WebAudio.
// No audio files, no network: oscillators and noise buffers only.
// Engine hum follows the car's speed, sirens wail at one star and up,
// and a little bassline keeps the broadcast moving.

import { CFG } from './config.js';

export function createAudio() {
  return {
    ctx: null,
    enabled: false,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    musicTimer: 0,
    musicStep: 0,
    muted: false,
  };
}

export function ensureAudio(G) {
  const a = G.audio;
  if (a.ctx || !a.enabled) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    a.ctx = new AC();
    // A context created outside a gesture starts suspended; resume it
    // so the first click actually brings the sound in.
    if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {});
    a.master = a.ctx.createGain();
    a.master.gain.value = 0.35;
    a.master.connect(a.ctx.destination);
    // Engine hum.
    a.engineOsc = a.ctx.createOscillator();
    a.engineOsc.type = 'sawtooth';
    a.engineOsc.frequency.value = 55;
    a.engineGain = a.ctx.createGain();
    a.engineGain.gain.value = 0;
    a.engineOsc.connect(a.engineGain);
    a.engineGain.connect(a.master);
    a.engineOsc.start();
    // Police siren, two-tone.
    a.sirenOsc = a.ctx.createOscillator();
    a.sirenOsc.type = 'sine';
    a.sirenOsc.frequency.value = 750;
    a.sirenGain = a.ctx.createGain();
    a.sirenGain.gain.value = 0;
    a.sirenOsc.connect(a.sirenGain);
    a.sirenGain.connect(a.master);
    a.sirenOsc.start();
  } catch (err) {
    a.ctx = null;
  }
}

function tone(a, freq, dur, type = 'square', vol = 0.18) {
  if (!a.ctx || a.muted) return;
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + dur);
  o.connect(g);
  g.connect(a.master);
  o.start();
  o.stop(a.ctx.currentTime + dur);
}

function noiseBurst(a, dur, vol = 0.25) {
  if (!a.ctx || a.muted) return;
  const len = Math.floor(a.ctx.sampleRate * dur);
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const g = a.ctx.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(a.master);
  src.start();
}

export function attachAudioHelpers(G) {
  const a = G.audio;
  a.blip = (freq, dur) => tone(a, freq, dur, 'square', 0.14);
  a.thud = () => noiseBurst(a, 0.12, 0.3);
  a.shot = (far) => {
    noiseBurst(a, 0.09, far ? 0.1 : 0.3);
    tone(a, far ? 220 : 160, 0.08, 'sawtooth', far ? 0.06 : 0.14);
  };
  a.sirenBurst = () => {
    tone(a, 880, 0.12, 'sine', 0.12);
    setTimeout(() => tone(a, 660, 0.12, 'sine', 0.12), 130);
  };
  a.fanfare = () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(a, f, 0.22, 'triangle', 0.16), i * 110));
  };
}

const BASSLINE = [55, 0, 65.4, 0, 49, 0, 58.3, 0, 55, 0, 65.4, 0, 73.4, 82.4, 98, 0];

export function updateAudio(G, dt) {
  const a = G.audio;
  if (!a.ctx || a.muted) return;
  // Engine follows speed.
  const speed = G.playerCar ? Math.abs(G.playerCar.speed) : 0;
  a.engineOsc.frequency.setTargetAtTime(48 + speed * 0.16, a.ctx.currentTime, 0.05);
  a.engineGain.gain.setTargetAtTime(G.playerCar ? 0.05 : 0, a.ctx.currentTime, 0.1);
  // Siren wails while wanted.
  const wailing = G.wanted.stars >= 1;
  a.sirenGain.gain.setTargetAtTime(wailing ? 0.035 : 0, a.ctx.currentTime, 0.2);
  if (wailing) {
    a.sirenOsc.frequency.setTargetAtTime(700 + Math.sin(G.time * 4.4) * 160, a.ctx.currentTime, 0.05);
  }
  // A lazy bassline, one note per beat.
  a.musicTimer -= dt;
  if (a.musicTimer <= 0) {
    a.musicTimer = 0.42;
    const note = BASSLINE[a.musicStep % BASSLINE.length];
    a.musicStep += 1;
    if (note > 0) tone(a, note, 0.36, 'triangle', 0.07);
    if (a.musicStep % 4 === 0) tone(a, 220, 0.1, 'sine', 0.04);
  }
}

export function toggleMute(G) {
  G.audio.muted = !G.audio.muted;
  if (G.audio.master) G.audio.master.gain.value = G.audio.muted ? 0 : 0.35;
  return G.audio.muted;
}

// Audio: everything is synthesized with WebAudio — no audio files, no
// network. A low engine hum, a two-tone police siren, and short blips for
// punches, shots, pickups and mission jingles. Silent until the first key
// press, as browsers require.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      started = true;
      // Engine: a quiet sawtooth whose pitch follows the speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      // Siren: two alternating tones, quiet, only while wanted.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
      setInterval(() => {
        if (!ctx || muted) return;
        sirenOsc.frequency.value = sirenOsc.frequency.value > 800 ? 660 : 920;
      }, 420);
    } catch {
      // Audio is decoration: a failure here must never stop the game.
      ctx = null;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Ignore.
    }
  }

  return {
    /** Unlock audio on the first user gesture. */
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      if (sirenGain) sirenGain.gain.value = 0;
      return muted;
    },
    /** Engine hum + siren level, called every frame from the loop. */
    update(driving, speedRatio, stars) {
      if (!ctx || muted) return;
      try {
        if (engineGain) engineGain.gain.value = driving ? 0.03 + speedRatio * 0.05 : 0.012;
        if (engineOsc) engineOsc.frequency.value = 50 + speedRatio * 130;
        if (sirenGain) sirenGain.gain.value = stars > 0 ? 0.018 : 0;
      } catch {
        // Ignore.
      }
    },
    punch() {
      blip(140, 0.12, 'sine', 0.2, 60);
    },
    shoot() {
      blip(900, 0.09, 'square', 0.1, 180);
    },
    thud() {
      blip(90, 0.18, 'sine', 0.25, 45);
    },
    explosion() {
      blip(70, 0.6, 'sawtooth', 0.22, 30);
    },
    sirenBlip() {
      blip(880, 0.12, 'triangle', 0.12, 660);
      setTimeout(() => blip(660, 0.12, 'triangle', 0.12, 880), 130);
    },
    missionStart() {
      blip(523, 0.14, 'triangle', 0.14);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.14), 140);
      setTimeout(() => blip(784, 0.22, 'triangle', 0.14), 280);
    },
    missionComplete() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.15), i * 150));
    },
    busted() {
      blip(392, 0.2, 'sawtooth', 0.14, 196);
      setTimeout(() => blip(311, 0.35, 'sawtooth', 0.14, 155), 200);
    },
    pickup() {
      blip(1046, 0.1, 'sine', 0.12, 1568);
    },
  };
}

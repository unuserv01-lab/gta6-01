// LIVE HEIST — audio.js
// Tiny WebAudio synth: no audio files, everything is oscillators and filtered
// noise. Silent until the first user gesture (browsers demand it), and every
// method is a no-op when the context is missing.

/** Create the synth. Call ensure() from a user gesture before playing. */
export function createAudio() {
  let ctx = null;
  let sirenOsc = null;
  let sirenGain = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      return true;
    } catch {
      return false;
    }
  }

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function tone(freq, dur, type = 'sine', vol = 0.16, slideTo = null) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch {
      // Audio is decoration; never break the game.
    }
  }

  return {
    ensure,

    setMuted(m) {
      muted = m;
      if (sirenGain) sirenGain.gain.value = 0;
      if (engineGain) engineGain.gain.value = 0;
    },

    /** Two-tone police siren, on/off. */
    siren(on) {
      if (!ensure() || muted) return;
      try {
        if (on && !sirenOsc) {
          sirenOsc = ctx.createOscillator();
          sirenOsc.type = 'triangle';
          sirenOsc.frequency.value = 720;
          sirenGain = ctx.createGain();
          sirenGain.gain.value = 0.045;
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 1.6;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 180;
          lfo.connect(lfoGain).connect(sirenOsc.frequency);
          sirenOsc.connect(sirenGain).connect(ctx.destination);
          sirenOsc.start();
          lfo.start();
          sirenOsc._lfo = lfo;
        } else if (!on && sirenOsc) {
          sirenOsc.stop();
          sirenOsc._lfo.stop();
          sirenOsc = null;
          sirenGain = null;
        }
      } catch {
        sirenOsc = null;
      }
    },

    /** Car horn: two quick square blips. */
    honk() {
      tone(370, 0.14, 'square', 0.1);
      setTimeout(() => tone(370, 0.14, 'square', 0.1), 150);
    },

    /** Gunshot: a burst of filtered noise. */
    shot() {
      if (!ctx || muted) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(0.12);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2400;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start();
      } catch {
        // Ignore.
      }
    },

    /** Dull thud (crash, punch, ram). */
    thud() {
      tone(90, 0.16, 'sine', 0.22, 45);
    },

    /** Reward chime: two rising notes. */
    chime() {
      tone(660, 0.16, 'sine', 0.14);
      setTimeout(() => tone(880, 0.24, 'sine', 0.14), 140);
    },

    /** Engine hum that follows the car speed (0..1). */
    engine(level) {
      if (!ensure() || muted) return;
      try {
        if (!engineOsc) {
          engineOsc = ctx.createOscillator();
          engineOsc.type = 'sawtooth';
          engineOsc.frequency.value = 70;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 420;
          engineGain = ctx.createGain();
          engineGain.gain.value = 0;
          engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
          engineOsc.start();
        }
        engineOsc.frequency.value = 60 + level * 190;
        engineGain.gain.value = level > 0.02 ? 0.03 + level * 0.03 : 0;
      } catch {
        engineOsc = null;
      }
    },
  };
}

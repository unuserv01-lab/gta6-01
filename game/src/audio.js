// Sound, synthesized live with WebAudio — no audio files, no network.
// A soft engine hum that follows speed, a two-tone siren when the law is
// close, and short blips for pickups, punches and episode payouts. The
// context is created on the first user gesture; muted state is remembered
// in the game state, never in a file.

/** Create the sound board. Every method is safe to call before any gesture. */
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (muted || !ensure() || !ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type ?? 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol ?? 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setMuted(value) {
      muted = value;
      if (engineGain) engineGain.gain.value = 0;
      if (sirenGain) sirenGain.gain.value = 0;
    },
    /** The engine hum follows the player's speed; silent on foot or stopped. */
    engine(speed, driving) {
      if (muted || !ctx || !engineOsc || !engineGain) return;
      const target = driving && speed > 20 ? 0.02 + Math.min(0.05, speed / 9000) : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speed * 0.16, ctx.currentTime, 0.1);
    },
    /** The siren wails while any cruiser is on the road. */
    siren(on, time) {
      if (muted || !ctx || !sirenOsc || !sirenGain) return;
      if (!on) {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        return;
      }
      sirenGain.gain.setTargetAtTime(0.025, ctx.currentTime, 0.2);
      sirenOsc.frequency.setTargetAtTime(Math.sin(time * 3.2) > 0 ? 720 : 540, ctx.currentTime, 0.05);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.1, 990);
    },
    punch() {
      blip(180, 0.1, 'square', 0.12, 90);
    },
    steal() {
      blip(440, 0.1, 'square', 0.09, 660);
      blip(660, 0.14, 'square', 0.09, 880);
    },
    busted() {
      blip(320, 0.5, 'sawtooth', 0.1, 120);
    },
    /** The episode payout: a little rising arpeggio. */
    jingle() {
      blip(523, 0.14, 'sine', 0.11);
      setTimeout(() => blip(659, 0.14, 'sine', 0.11), 120);
      setTimeout(() => blip(784, 0.22, 'sine', 0.12), 240);
    },
  };
}

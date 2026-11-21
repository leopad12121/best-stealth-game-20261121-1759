// audio.js — every sound is synthesized with WebAudio: no audio files at all.
// Footsteps tick softly (a guard's steps get louder as it nears you, so you can
// hear danger coming), pickups chime, the alarm wails, winning arpeggiates.
export function makeAudio() {
  let ctx = null;
  let muted = false;
  let alarmNodes = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type, vol, when = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopAlarm();
      return muted;
    },
    isMuted() { return muted; },

    footstep(running) {
      blip(running ? 170 : 120, 0.07, 'triangle', running ? 0.10 : 0.05);
    },

    // A guard's step: volume grows as the guard closes in on the player.
    guardStep(dist) {
      const vol = Math.max(0, 0.16 * (1 - dist / 320));
      if (vol <= 0.01) return;
      blip(95, 0.09, 'sine', vol);
    },

    pebble() {
      blip(900, 0.05, 'square', 0.06);
      blip(620, 0.08, 'square', 0.05, 0.07);
    },

    pickup() {
      blip(660, 0.12, 'sine', 0.12);
      blip(880, 0.16, 'sine', 0.12, 0.09);
      blip(1320, 0.22, 'sine', 0.10, 0.18);
    },

    spotted() {
      blip(520, 0.14, 'sawtooth', 0.10);
      blip(780, 0.18, 'sawtooth', 0.10, 0.12);
    },

    startAlarm() {
      const c = ensure();
      if (!c || muted || alarmNodes) return;
      const osc = c.createOscillator();
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      const gain = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 620;
      lfo.type = 'sine';
      lfo.frequency.value = 2.2;
      lfoGain.gain.value = 220;
      gain.gain.value = 0.045;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      lfo.start();
      alarmNodes = { osc, lfo, gain };
    },

    stopAlarm() {
      if (!alarmNodes) return;
      try {
        alarmNodes.gain.gain.setValueAtTime(0.0001, alarmNodes.osc.context.currentTime);
        alarmNodes.osc.stop();
        alarmNodes.lfo.stop();
      } catch (e) { /* already stopped */ }
      alarmNodes = null;
    },

    win() {
      [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.3, 'sine', 0.12, i * 0.13));
    },

    caught() {
      [392, 330, 262, 196].forEach((f, i) => blip(f, 0.25, 'sawtooth', 0.09, i * 0.14));
    },
  };
}

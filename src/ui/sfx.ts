/**
 * Sounds are synthesised with the Web Audio API — no audio files, no network,
 * nothing to load. That keeps the consumer build offline and Kids-Category safe.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function isSoundEnabled() {
  return enabled;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.06, delayMs = 0) {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + delayMs / 1000;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  vol.gain.setValueAtTime(0, start);
  vol.gain.linearRampToValueAtTime(gain, start + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.connect(vol).connect(ac.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.02);
}

export const sfx = {
  tap: () => tone(520, 70, 'triangle', 0.05),
  coin: () => tone(880, 90, 'square', 0.04),
  ouch: () => tone(160, 260, 'sawtooth', 0.05),
  cheer: () => {
    tone(523, 120, 'triangle', 0.05, 0);
    tone(659, 120, 'triangle', 0.05, 110);
    tone(784, 200, 'triangle', 0.06, 220);
  },
  levelUp: () => {
    tone(523, 110, 'square', 0.05, 0);
    tone(659, 110, 'square', 0.05, 100);
    tone(784, 110, 'square', 0.05, 200);
    tone(1047, 260, 'square', 0.06, 300);
  },
  whoosh: () => tone(300, 180, 'sine', 0.03),
};

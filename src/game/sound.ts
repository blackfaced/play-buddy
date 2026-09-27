/** WebAudio synthesized sound effects — no audio files. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let rollingGain: GainNode | null = null;
let rollingSrc: AudioBufferSourceNode | null = null;
let lastTokAt = 0;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio(): void {
  ensureCtx();
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (!on) {
    setRolling(0);
    setWind(0);
  }
}

function now(): number {
  return ctx ? ctx.currentTime : 0;
}

function env(g: GainNode, t0: number, peak: number, dur: number): void {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

function osc(type: OscillatorType, freq: number, t0: number, dur: number, peak: number, freqEnd?: number): void {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
  env(g, t0, peak, dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBurst(t0: number, dur: number, peak: number, filterFreq: number): void {
  if (!ctx || !master) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  env(g, t0, peak, dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

/** Short wood "pop" on block removal. */
export function playPop(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  noiseBurst(t, 0.12, 0.5, 1400);
  osc('sine', 180, t, 0.12, 0.55, 90);
}

/** Soft "tok" collision, volume ∝ impact. Rate-limited 6/s. */
export function playTok(strength: number): void {
  if (!enabled || !ensureCtx()) return;
  const t = performance.now();
  if (t - lastTokAt < 1000 / 6) return;
  lastTokAt = t;
  const v = Math.min(0.45, 0.08 + strength * 0.05);
  const dur = 0.04 + Math.min(0.05, strength * 0.008);
  const t0 = now();
  noiseBurst(t0, dur, v, 900);
  osc('triangle', 220, t0, dur, v * 0.7, 140);
}

/** Two-note milestone chime E5 → A5. */
export function playChime(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  osc('sine', 659.25, t, 0.2, 0.35);
  osc('sine', 880, t + 0.1, 0.22, 0.35);
}

/** 4-note warm jingle (perfect landing / new record). */
export function playJingle(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => osc('triangle', f, t + i * 0.11, 0.26, 0.3));
}

/** Gentle descending "boop" on game over. */
export function playBoop(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  osc('sine', 320, t, 0.3, 0.4, 110);
}

/** Short metronome tick for the last-10-seconds countdown. */
export function playTick(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  osc('square', 1250, t, 0.05, 0.16);
  osc('sine', 1900, t, 0.04, 0.08);
}

/** Time's up: two descending brass-ish notes. */
export function playTimeout(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  osc('triangle', 392, t, 0.28, 0.4, 330);
  osc('triangle', 262, t + 0.24, 0.5, 0.42, 196);
  noiseBurst(t + 0.24, 0.3, 0.12, 600);
}

/** Single soft bell (forced rest begin/end). */
export function playBell(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  osc('sine', 880, t, 0.9, 0.25);
  osc('sine', 1318.5, t, 0.7, 0.1);
}

/** Wind-chime arpeggio when the hero crosses a checkpoint line (+3s). */
export function playWindChime(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  const notes = [1567.98, 2093.0, 2637.02, 3135.96]; // G6 C7 E7 G7
  notes.forEach((f, i) => {
    osc('sine', f, t + i * 0.07, 0.55, 0.16);
    osc('sine', f * 2, t + i * 0.07, 0.28, 0.045);
  });
}

/** Bright two-note coin "bling". */
export function playCoin(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  osc('square', 987.77, t, 0.07, 0.1); // B5
  osc('square', 1318.51, t + 0.07, 0.18, 0.1); // E6
}

/** Crisper, brighter pop for combos (layered over the wood pop). */
export function playPopCrisp(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  noiseBurst(t, 0.07, 0.35, 3200);
  osc('square', 660, t, 0.05, 0.12, 440);
  osc('sine', 240, t, 0.1, 0.4, 120);
}

/** Heartbeat (two low thumps) for near-miss slow-mo. */
export function playHeartbeat(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  osc('sine', 72, t, 0.16, 0.55, 46);
  osc('sine', 66, t + 0.22, 0.14, 0.4, 42);
}

/** Saved! short rising two-note relief chime after a survived near-miss. */
export function playSaved(): void {
  if (!enabled || !ensureCtx()) return;
  const t = now();
  osc('triangle', 587.33, t, 0.16, 0.28); // D5
  osc('triangle', 880, t + 0.12, 0.24, 0.3); // A5
  osc('sine', 1174.66, t + 0.24, 0.3, 0.18); // D6
}

/** Low rumble for big collapses; strength 0..1 scales volume/duration. */
export function playRumble(strength: number): void {
  if (!enabled || !ensureCtx()) return;
  const s = Math.max(0, Math.min(1, strength));
  const t = now();
  noiseBurst(t, 0.28 + 0.3 * s, 0.22 + 0.3 * s, 180);
  osc('sine', 55, t, 0.3 + 0.25 * s, 0.3 + 0.25 * s, 32);
}

/** Wind-noise loop; level 0..1 follows hero fall speed. */
let windGain: GainNode | null = null;
let windSrc: AudioBufferSourceNode | null = null;
export function setWind(level: number): void {
  if (!ctx || !master) {
    if (level <= 0) return;
    if (!ensureCtx()) return;
  }
  if (!ctx || !master) return;
  if (!windSrc) {
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 0.7;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(f).connect(windGain).connect(master);
    windSrc.start();
  }
  const target = enabled ? Math.min(0.16, Math.max(0, level) * 0.16) : 0;
  windGain?.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
}

/** Rolling noise loop; level 0..1 follows ball angular velocity. */
export function setRolling(level: number): void {
  if (!ctx || !master) {
    if (level <= 0) return;
    if (!ensureCtx()) return;
  }
  if (!ctx || !master) return;
  if (!rollingSrc) {
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    rollingSrc = ctx.createBufferSource();
    rollingSrc.buffer = buf;
    rollingSrc.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    rollingGain = ctx.createGain();
    rollingGain.gain.value = 0;
    rollingSrc.connect(f).connect(rollingGain).connect(master);
    rollingSrc.start();
  }
  const target = enabled ? Math.min(0.22, Math.max(0, level) * 0.22) : 0;
  rollingGain?.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
}

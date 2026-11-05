/*
 * Música original de CashRich, sintetizada en el momento (sin ficheros de audio).
 * El MISMO algoritmo vive en android/.../Music.kt: si cambias uno, cambia el otro.
 * Cada ambiente es un bucle de 8 acordes que se renderiza una vez y suena en bucle.
 */
export type Mood = 'lobby' | 'game' | 'fast';

const RATE = 22050;
const STEPS_PER_CHORD = 8; // corcheas: 4 tiempos
const PENTA = [0, 2, 4, 7, 9];
const ECHO = [[0.27, 0.34], [0.54, 0.18], [0.81, 0.09]]; // [segundos, ganancia]: eco suave de la melodía

type Quality = 'maj7' | 'm7' | 'dom7' | 'maj' | 'min';
const QUALITY: Record<Quality, number[]> = {
  maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], maj: [0, 4, 7], min: [0, 3, 7],
};
type Chord = [number, Quality]; // [nota MIDI de la fundamental (grave), calidad]

const C = 36, D = 38, E = 40, F = 41, G = 43, A = 45;
const PROGRESSIONS: Record<Mood, { bpm: number; chords: Chord[]; melody: number; seed: number }> = {
  lobby: { bpm: 84, melody: 42, seed: 3, chords: [[C, 'maj7'], [A, 'm7'], [F, 'maj7'], [G, 'dom7'], [C, 'maj7'], [E, 'm7'], [F, 'maj7'], [G, 'dom7']] },
  game: { bpm: 104, melody: 58, seed: 11, chords: [[C, 'maj7'], [A, 'm7'], [D, 'm7'], [G, 'dom7'], [C, 'maj7'], [E, 'm7'], [F, 'maj7'], [G, 'dom7']] },
  fast: { bpm: 126, melody: 72, seed: 29, chords: [[A, 'm7'], [F, 'maj7'], [C, 'maj'], [G, 'dom7'], [A, 'm7'], [F, 'maj7'], [D, 'm7'], [E, 'dom7']] },
};

/* Frases de 16 corcheas: [paso, grado de la pentatónica (0-9), duración en corcheas]. Se tocan A B A B'. */
type Phrase = [number, number, number][];
const MOTIFS: Record<Mood, { A: Phrase; B: Phrase }> = {
  lobby: {
    A: [[0, 5, 3], [3, 4, 1], [4, 3, 2], [6, 2, 2], [8, 3, 3], [11, 2, 1], [12, 1, 2], [14, 0, 2]],
    B: [[0, 2, 2], [2, 3, 2], [4, 4, 3], [7, 3, 1], [8, 5, 3], [11, 4, 1], [12, 3, 2], [14, 2, 2]],
  },
  game: {
    A: [[0, 4, 1], [1, 5, 1], [2, 7, 2], [4, 5, 1], [5, 4, 1], [6, 3, 2], [8, 4, 1], [9, 5, 1], [10, 7, 2], [12, 8, 2], [14, 7, 1], [15, 5, 1]],
    B: [[0, 5, 2], [2, 4, 1], [3, 3, 1], [4, 2, 2], [6, 3, 1], [7, 4, 1], [8, 5, 2], [10, 4, 1], [11, 3, 1], [12, 2, 2], [14, 0, 2]],
  },
  fast: {
    A: [[0, 7, 1], [1, 8, 1], [2, 9, 1], [3, 8, 1], [4, 7, 2], [6, 5, 1], [7, 7, 1], [8, 8, 1], [9, 9, 1], [10, 8, 1], [11, 7, 2], [13, 5, 1], [14, 4, 2]],
    B: [[0, 5, 1], [1, 7, 1], [2, 8, 2], [4, 9, 1], [5, 8, 1], [6, 7, 1], [7, 5, 1], [8, 4, 1], [9, 5, 1], [10, 7, 2], [12, 5, 1], [13, 4, 1], [14, 2, 2]],
  },
};

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function hash(x: number): number {
  let h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
const noise = (n: number, salt: number) => (hash(n * 7 + salt) / 4294967296) * 2 - 1;

/** Renderiza el bucle completo a PCM mono en coma flotante. */
export function renderLoop(mood: Mood): Float32Array {
  const p = PROGRESSIONS[mood];
  const stepSec = 60 / p.bpm / 2;
  const stepLen = Math.round(stepSec * RATE);
  const total = p.chords.length * STEPS_PER_CHORD * stepLen;
  const mix = new Float64Array(total);
  const lead = new Float64Array(total);

  /** Suma una nota (con cola que da la vuelta al principio del bucle). */
  const note = (at: number, midiOrHz: number, len: number, vol: number, kind: 'sine' | 'tri' | 'bell' | 'pad' | 'bass', isHz = false, out: Float64Array = mix) => {
    const f = isHz ? midiOrHz : hz(midiOrHz);
    const n = Math.round(len * RATE);
    const attack = kind === 'pad' ? 0.18 * RATE : 0.004 * RATE;
    let phase = 0;
    for (let i = 0; i < n; i++) {
      phase += f / RATE;
      const c = phase - Math.floor(phase);
      const t = i / n;
      let s: number;
      if (kind === 'tri') s = 1 - 4 * Math.abs(c - 0.5);
      else if (kind === 'bell') s = Math.sin(2 * Math.PI * c) + 0.35 * Math.sin(4 * Math.PI * c) * (1 - t) + 0.12 * Math.sin(6 * Math.PI * c);
      else if (kind === 'bass') s = Math.sin(2 * Math.PI * c) * 0.8 + (1 - 4 * Math.abs(c - 0.5)) * 0.35;
      else s = Math.sin(2 * Math.PI * c);
      let env: number;
      if (kind === 'pad') env = Math.min(1, i / attack) * Math.min(1, (n - i) / (0.25 * RATE));
      else env = Math.min(1, i / attack) * Math.exp(-(kind === 'bass' ? 3.2 : 4.5) * t);
      out[(at + i) % total] += s * env * vol;
    }
  };
  const kick = (at: number, vol: number) => {
    const n = Math.round(0.2 * RATE);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      phase += (45 + 90 * Math.exp(-14 * t)) / RATE;
      mix[(at + i) % total] += Math.sin(2 * Math.PI * phase) * Math.exp(-6 * t) * vol;
    }
  };
  const hat = (at: number, vol: number, len: number, salt: number) => {
    const n = Math.round(len * RATE);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      mix[(at + i) % total] += (noise(at + i, salt) - noise(at + i - 1, salt)) * 0.5 * Math.exp(-7 * t) * vol;
    }
  };

  for (let ci = 0; ci < p.chords.length; ci++) {
    const [root, q] = p.chords[ci];
    const tones = QUALITY[q];
    for (let l = 0; l < STEPS_PER_CHORD; l++) {
      const g = ci * STEPS_PER_CHORD + l;
      const at = g * stepLen;

      // Bajo
      if (l === 0) note(at, root, stepSec * 3.2, 0.34, 'bass');
      if (l === 4 && mood !== 'lobby') note(at, root + 7, stepSec * 2.6, 0.26, 'bass');
      if (l === 6 && mood === 'fast') note(at, root + 12, stepSec * 1.4, 0.2, 'bass');

      // Acorde: colchón en lobby y partida, arpegio en vía rápida
      if (mood === 'fast') {
        note(at, root + 24 + tones[l % tones.length] + (l >= 4 ? 12 : 0), stepSec * 1.1, 0.075, 'tri');
      } else if (l === 0) {
        for (const t of tones) note(at, root + 24 + t, stepSec * 8.2, mood === 'lobby' ? 0.05 : 0.04, 'pad');
      }

      // Melodía: frases A B A B' (la última acaba en la tónica)
      if (l === 0 && ci % 2 === 0) {
        const phrase = Math.floor(ci / 2);
        const motif = MOTIFS[mood][phrase % 2 === 0 ? 'A' : 'B'];
        motif.forEach(([step, deg, len], k) => {
          let d = deg;
          if (phrase === 3 && k >= motif.length - 2) d = k === motif.length - 1 ? 0 : 2; // cadencia final
          if (phrase === 2 && k === 3) d += 1; // pequeña variación en la repetición
          const midi = 72 + PENTA[d % 5] + 12 * Math.floor(d / 5);
          const vel = 0.88 + (hash(g * 17 + k) % 13) / 100; // matiz humano
          note(at + step * stepLen, midi, stepSec * (len + 0.8), (mood === 'lobby' ? 0.11 : 0.1) * vel, 'bell', false, lead);
        });
      }

      // Percusión
      if (mood !== 'lobby') {
        if (l === 0 || l === 4) kick(at, mood === 'fast' ? 0.34 : 0.28);
        if (mood === 'fast' && (l === 2 || l === 6)) hat(at, 0.55, 0.12, 5);
        if (l % 2 === 1) hat(at, mood === 'fast' ? 0.16 : 0.1, 0.05, 1);
      } else if (l % 2 === 1) {
        hat(at, 0.045, 0.07, 2);
      }
    }
  }

  for (let i = 0; i < total; i++) {
    let v = lead[i];
    for (const [sec, gain] of ECHO) v += lead[(i - Math.round(sec * RATE) % total + total) % total] * gain;
    mix[i] += v;
  }
  let sq = 0;
  for (let i = 0; i < total; i++) sq += mix[i] * mix[i];
  const k = Math.sqrt(sq / total) > 0 ? 0.15 / Math.sqrt(sq / total) : 1; // mismo volumen en los tres ambientes
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) out[i] = Math.tanh(mix[i] * k * 1.1) / 1.1; // limitador suave: sin saturar
  return out;
}

/* ───────── Reproductor ───────── */

const KEY = 'cashrich:music';
const BASE_VOLUME = 0.32;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: { mood: Mood; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let wanted: Mood | null = null;
let enabled: boolean | null = null;
const buffers = new Map<Mood, AudioBuffer>();

/** En TV y pantallas grandes suena por defecto; en el móvil (que hace de mando) hay que activarla. */
function defaultOn() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('tv') || window.matchMedia('(min-width: 1024px)').matches;
}

export function musicEnabled(): boolean {
  if (enabled === null) {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* sin almacenamiento */ }
    enabled = saved === null ? defaultOn() : saved === '1';
  }
  return enabled;
}

export function setMusicEnabled(on: boolean) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* no pasa nada */ }
  if (on) void sync(); else fadeOut();
}

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext({ sampleRate: RATE });
    master = ctx.createGain();
    master.gain.value = BASE_VOLUME;
    master.connect(ctx.destination);
  }
  return ctx;
}

function bufferFor(a: AudioContext, mood: Mood) {
  let b = buffers.get(mood);
  if (!b) {
    const pcm = renderLoop(mood);
    b = a.createBuffer(1, pcm.length, RATE);
    b.getChannelData(0).set(pcm);
    buffers.set(mood, b);
  }
  return b;
}

function fadeOut() {
  if (!ctx || !current) return;
  const old = current;
  current = null;
  const t = ctx.currentTime;
  old.gain.gain.cancelScheduledValues(t);
  old.gain.gain.setValueAtTime(old.gain.gain.value, t);
  old.gain.gain.linearRampToValueAtTime(0, t + 1.2);
  old.src.stop(t + 1.3);
}

async function sync() {
  if (!wanted || !musicEnabled()) return;
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') await a.resume().catch(() => undefined);
  if (a.state !== 'running' || !wanted || (current && current.mood === wanted)) return;
  fadeOut();
  const src = a.createBufferSource();
  src.buffer = bufferFor(a, wanted);
  src.loop = true;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0, a.currentTime);
  gain.gain.linearRampToValueAtTime(1, a.currentTime + 1.6);
  src.connect(gain).connect(master!);
  src.start();
  current = { mood: wanted, src, gain };
}

/** Los navegadores solo dejan sonar tras un gesto del usuario. */
if (typeof window !== 'undefined') {
  const unlock = () => { void sync(); };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

export const music = {
  play(mood: Mood | null) {
    wanted = mood;
    if (mood) void sync(); else fadeOut();
  },
  /** Baja un momento la música para que se oiga un efecto. */
  duck(ms = 700) {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(BASE_VOLUME * 0.35, t + 0.08);
    master.gain.linearRampToValueAtTime(BASE_VOLUME, t + 0.08 + ms / 1000);
  },
};

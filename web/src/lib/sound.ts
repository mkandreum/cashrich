/* Efectos sintetizados con WebAudio: sin ficheros que descargar. */
import { music } from './music';

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem('flujo:mute') === '1';
} catch {
  /* sin almacenamiento: sonido activado */
}

export const isMuted = () => muted;
export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem('flujo:mute', value ? '1' : '0');
  } catch {
    /* no pasa nada */
  }
}

function audio() {
  if (muted || typeof AudioContext === 'undefined') return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, at = 0, length = 0.14, type: OscillatorType = 'triangle', volume = 0.16, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const start = a.currentTime + at;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(a.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

const buzz = (ms: number | number[]) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* no disponible */
  }
};

export const sfx = {
  tap: () => tone(520, 0, 0.06, 'square', 0.05),
  roll: () => {
    music.duck(1000);
    for (let i = 0; i < 9; i++) tone(180 + Math.random() * 260, i * 0.095, 0.05, 'square', 0.07);
    buzz([30, 40, 30, 40, 30]);
  },
  hop: () => tone(640, 0, 0.08, 'triangle', 0.1, 900),
  card: () => { music.duck(900); tone(320, 0, 0.09, 'sawtooth', 0.05, 720); tone(880, 0.09, 0.1, 'triangle', 0.08); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.07); tone(1319, 0.08, 0.24, 'square', 0.07); buzz(25); },
  loss: () => { tone(300, 0, 0.26, 'sawtooth', 0.09, 110); buzz([60, 40, 60]); },
  turn: () => { music.duck(800); [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.14, 'triangle', 0.13)); buzz([80, 60, 80]); },
  fanfare: () => {
    music.duck(1800);
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.24, 'square', 0.08));
    buzz([100, 60, 100, 60, 200]);
  },
};

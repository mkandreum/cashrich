import art from '../../shared/art.json';

export type Shape =
  | { t: 'c'; x: number; y: number; r: number; f: string; a: number }
  | { t: 'e'; x: number; y: number; rx: number; ry: number; f: string; a: number }
  | { t: 'p'; d: string; f: string; a: number }
  | { t: 's'; d: string; f: string; w: number; a: number };

const AVATARS = art.avatars as Record<string, Shape[]>;
const BADGES = art.badges as Record<string, Shape[]>;

/** Las partidas guardan el emoji como identificador; aquí se traduce al dibujo. */
export const avatarShapes = (id: string): Shape[] | undefined => AVATARS[id];
export const badgeShapes = (id: string): Shape[] | undefined => BADGES[id];

/** Dibuja las formas en un canvas 2D (para las texturas 3D). */
export function paintShapes(g: CanvasRenderingContext2D, shapes: Shape[], x: number, y: number, size: number) {
  const k = size / 64;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  for (const s of shapes) {
    g.globalAlpha = s.a;
    if (s.t === 'c') { g.fillStyle = s.f; g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill(); }
    else if (s.t === 'e') { g.fillStyle = s.f; g.beginPath(); g.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2); g.fill(); }
    else if (s.t === 'p') { g.fillStyle = s.f; g.fill(new Path2D(s.d)); }
    else { g.strokeStyle = s.f; g.lineWidth = s.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(new Path2D(s.d)); }
  }
  g.restore();
}

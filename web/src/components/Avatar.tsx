import { avatarShapes, badgeShapes, type Shape } from '../lib/art';

function Layers({ shapes }: { shapes: Shape[] }) {
  return (
    <>
      {shapes.map((s, i) => {
        const o = s.a === 1 ? undefined : s.a;
        if (s.t === 'c') return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.f} opacity={o} />;
        if (s.t === 'e') return <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={s.f} opacity={o} />;
        if (s.t === 'p') return <path key={i} d={s.d} fill={s.f} opacity={o} />;
        return <path key={i} d={s.d} fill="none" stroke={s.f} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" opacity={o} />;
      })}
    </>
  );
}

/** Avatar dibujado (el servidor sigue guardando el emoji como identificador). */
export function Avatar({ id, size = '1em', className }: { id?: string; size?: number | string; className?: string }) {
  const shapes = id ? avatarShapes(id) : undefined;
  if (!shapes) return <span className={className}>{id}</span>;
  return (
    <svg viewBox="0 -2 64 66" width={size} height={size} className={className} aria-hidden style={{ overflow: 'visible', verticalAlign: '-0.15em', filter: 'drop-shadow(0 2px 1.5px rgb(0 0 0 / .28))' }}>
      <Layers shapes={shapes} />
    </svg>
  );
}

/** Medalla grande para los avisos de la partida: 'unlock', 'skull', 'trophy' o 'dice'. */
export function Badge({ id, size = '1em' }: { id: string; size?: number | string }) {
  const shapes = badgeShapes(id);
  if (!shapes) return null;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden style={{ filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / .3))' }}>
      <Layers shapes={shapes} />
    </svg>
  );
}

/** Medalla si existe con ese nombre; si no, avatar. */
export function Glyph({ id, size }: { id: string; size?: number | string }) {
  return badgeShapes(id) ? <Badge id={id} size={size} /> : <Avatar id={id} size={size} />;
}

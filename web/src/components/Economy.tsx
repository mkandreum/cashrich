import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Snapshot } from '../lib/api';

const PHASE_STYLE: Record<string, string> = {
  expansion: 'bg-mint text-ink',
  boom: 'bg-gold text-ink',
  recesion: 'bg-coral text-white',
  recuperacion: 'bg-sky text-ink',
};
const SECTORS = [['property', 'Inmuebles'], ['stock', 'Bolsa'], ['business', 'Negocios']] as const;

export const PhaseChip = ({ room }: { room: Snapshot }) => (
  <span className={`rounded-full border-2 border-ink px-2.5 py-0.5 font-display text-sm whitespace-nowrap ${PHASE_STYLE[room.economy.phase]}`}>
    {room.economy.label} · crédito al {room.economy.rate}%
  </span>
);

function Sparkline({ values }: { values: number[] }) {
  const series = values.length > 1 ? values : [values[0], values[0]];
  const min = Math.min(...series);
  const span = Math.max(0.05, Math.max(...series) - min);
  const points = series.map((v, i) => `${(i / (series.length - 1)) * 100},${26 - ((v - min) / span) * 22}`).join(' ');
  const up = series[series.length - 1] >= series[series.length - 2];
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      <polyline points={points} fill="none" stroke={up ? 'var(--color-mint)' : 'var(--color-coral)'} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* Dónde está el ciclo y qué sector está barato: la información para decidir cuándo operar */
export function EconomyPanel({ room, compact }: { room: Snapshot; compact?: boolean }) {
  const { economy } = room;
  return (
    <section className={`panel-dark ${compact ? 'p-2' : 'p-3'}`}>
      <PhaseChip room={room} />
      {!compact && <p className="mt-1.5 text-sm leading-snug text-cream/90">{economy.hint}</p>}
      <ul className={compact ? 'mt-1' : 'mt-2 space-y-1'}>
        {SECTORS.map(([key, name]) => {
          const idx = economy.idx[key];
          const pct = Math.round((idx - 1) * 100);
          const history = economy.hist[key];
          const rising = history.length < 2 || history[history.length - 1] >= history[history.length - 2];
          const Icon = rising ? TrendingUp : TrendingDown;
          return (
            <li key={key} className="grid grid-cols-[5.2rem_minmax(0,1fr)_4.2rem] items-center gap-2 text-sm font-semibold">
              <span>{name}</span>
              <Sparkline values={history} />
              <span className={`inline-flex items-center justify-end gap-1 ${pct >= 0 ? 'text-mint' : 'text-coral'}`}>
                <Icon size={14} aria-hidden /> {pct > 0 ? '+' : ''}{pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react';
import { Lock, Rocket, Skull, Unlock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { freedomPct, money, type PlayerView, type Snapshot } from '../lib/api';
import { Avatar } from './Avatar';

/* Guarda los últimos cambios de una cifra para enseñarlos un momento como +/- */
function useDeltas(value: number) {
  const previous = useRef(value);
  const [floats, setFloats] = useState<{ id: number; delta: number }[]>([]);
  useEffect(() => {
    const delta = value - previous.current;
    previous.current = value;
    if (!delta) return;
    const id = Date.now() + Math.random();
    setFloats((f) => [...f.slice(-1), { id, delta }]);
    const timer = setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1600);
    return () => clearTimeout(timer);
  }, [value]);
  return floats;
}

/* El +/- se pinta en su propio hueco (la fila de la etiqueta), nunca encima de otra cifra */
export function Delta({ value, className }: { value: number; className?: string }) {
  const floats = useDeltas(value);
  const last = floats[floats.length - 1];
  return (
    <span className={`relative inline-flex min-w-0 justify-end ${className ?? ''}`} aria-live="polite">
      <AnimatePresence mode="popLayout">
        {last && (
          <motion.span
            key={last.id}
            initial={{ y: 6, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="font-display text-sm leading-none whitespace-nowrap"
            style={{ color: last.delta > 0 ? 'var(--color-mint-dark)' : 'var(--color-coral-dark)' }}
          >
            {last.delta > 0 ? '+' : '−'}{money(Math.abs(last.delta))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* Cifra que corre hasta su valor */
export function Money({ value, className }: { value: number; className?: string }) {
  const shown = useMotionValue(value);
  const text = useTransform(shown, (v) => money(v));
  useEffect(() => {
    const controls = animate(shown, value, { duration: 0.7, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, shown]);
  return <motion.span className={className}>{text}</motion.span>;
}

export function FreedomMeter({ player }: { player: PlayerView }) {
  const pct = freedomPct(player);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm font-semibold">
        <span className="inline-flex items-center gap-1">
          {player.escaped ? <Unlock size={15} aria-hidden /> : <Lock size={15} aria-hidden />}
          Rentas {money(player.passive)}
        </span>
        <span>Meta {money(player.goal)}</span>
      </div>
      <div className="meter-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Camino a vivir de tus rentas">
        <motion.div className="meter-fill" initial={false} animate={{ width: `${Math.max(pct, 3)}%` }} transition={{ type: 'spring', stiffness: 90, damping: 16 }} />
      </div>
    </div>
  );
}

/* Tu hoja: efectivo, flujo y cuánto te falta para salir */
export function PlayerHud({ player, room }: { player: PlayerView; room: Snapshot }) {
  return (
    <section className="panel p-3">
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 flex-none place-items-center rounded-full border-[3px] border-ink text-xl" style={{ background: player.color }}>
          <Avatar id={player.avatar} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-xl leading-none">{player.name}</p>
          <p className="truncate text-sm font-medium text-ink/70">{player.profession || 'En la sala de espera'}</p>
        </div>
        <span className="rounded-full border-2 border-ink bg-gold px-2.5 py-0.5 font-display text-sm whitespace-nowrap">Ronda {room.round}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-cream-dark/70 px-3 py-1">
          <div className="flex items-center justify-between gap-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink/65">Efectivo</p>
            <Delta value={player.cash} />
          </div>
          <Money value={player.cash} className="block font-display text-xl leading-tight" />
        </div>
        <div className="rounded-xl bg-cream-dark/70 px-3 py-1">
          <div className="flex items-center justify-between gap-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink/65">Flujo / mes</p>
            <Delta value={player.flow} />
          </div>
          <Money value={player.flow} className={`block font-display text-xl leading-tight ${player.flow < 0 ? 'text-coral-dark' : 'text-mint-dark'}`} />
        </div>
      </div>
      <div className="mt-2"><FreedomMeter player={player} /></div>
    </section>
  );
}

function Status({ player }: { player: PlayerView }) {
  if (player.bankrupt) return <Skull size={16} className="text-coral" aria-label="En bancarrota" />;
  if (player.escaped) return <Rocket size={16} className="text-gold" aria-label="En la Avenida del Legado" />;
  return null;
}

export function PlayersList({ room, meId, compact }: { room: Snapshot; meId?: string; compact?: boolean }) {
  return (
    <ul className={compact ? 'space-y-1' : 'space-y-2'}>
      {room.players.map((p, i) => (
        <li
          key={p.id}
          className={`panel-dark flex items-center gap-2 transition-transform ${compact ? 'px-2 py-1' : 'px-2.5 py-2'} ${i === room.turn && room.phase === 'playing' ? 'translate-x-1 !border-gold' : ''} ${p.bankrupt ? 'opacity-50' : ''}`}
        >
          <span className={`grid flex-none place-items-center rounded-full border-2 border-white ${compact ? 'size-7 text-sm' : 'size-9 text-lg'}`} style={{ background: p.color }}><Avatar id={p.avatar} /></span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-semibold leading-tight">
              <span className="truncate">{p.name}{p.id === meId ? ' (tú)' : ''}</span>
              <Status player={p} />
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full bg-mint" initial={false} animate={{ width: `${freedomPct(p)}%` }} />
            </div>
          </div>
          <div className="text-right">
            <Money value={p.cash} className="font-display text-base leading-none" />
            {!compact && <p className="text-xs text-cream/65">Patrimonio {money(p.netWorth)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LogList({ room }: { room: Snapshot }) {
  return (
    <ul className="space-y-1 text-sm leading-snug">
      {room.log.slice(0, 25).map((entry) => {
        const who = room.players.find((p) => p.id === entry.who);
        return (
          <li key={entry.id} className="flex gap-1.5 border-b border-white/10 pb-1 last:border-0">
            {who && <span aria-hidden><Avatar id={who.avatar} /></span>}
            <span className="text-cream/90">{entry.text}</span>
          </li>
        );
      })}
      {!room.log.length && <li className="text-cream/70">Aquí aparecerá lo que pase en la mesa.</li>}
    </ul>
  );
}

import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { sfx } from '../lib/sound';
import { Avatar } from './Avatar';

const AVATARS = ['🐭', '🦊', '🐸', '🐼', '🦁', '🐙', '🐧', '🐷', '🐵', '🦄', '🐯', '🐻'];

export function JoinForm({ title, cta, taken = [], onSubmit }: {
  title: string; cta: string; taken?: string[]; onSubmit: (name: string, avatar: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const avatar = picked && !taken.includes(picked) ? picked : AVATARS.find((a) => !taken.includes(a))!;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    sfx.tap();
    try {
      await onSubmit(name.trim(), avatar);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel w-full max-w-md p-5">
      <h2 className="font-display text-2xl leading-tight">{title}</h2>
      <label className="mt-3 block font-semibold" htmlFor="player-name">Tu nombre</label>
      <input
        id="player-name" value={name} maxLength={14} autoFocus autoComplete="nickname" placeholder="Escribe tu nombre"
        onChange={(e) => setName(e.target.value)}
        className="mt-1 w-full rounded-xl border-[3px] border-ink bg-white px-3 py-2.5 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-ink/50"
      />
      <p className="mt-3 font-semibold">Elige tu ficha</p>
      <div className="mt-1.5 grid grid-cols-6 gap-1.5">
        {AVATARS.map((a) => {
          const isTaken = taken.includes(a);
          const selected = a === avatar;
          return (
            <motion.button
              key={a} type="button" disabled={isTaken} aria-pressed={selected} aria-label={`Ficha ${a}`}
              whileTap={{ scale: 0.85 }} animate={{ scale: selected ? 1.12 : 1 }}
              onClick={() => { sfx.tap(); setPicked(a); }}
              className={`chip aspect-square rounded-full border-[3px] text-2xl ${selected ? 'border-ink bg-gold' : 'border-transparent bg-cream-dark/70'} ${isTaken ? 'opacity-25' : 'cursor-pointer'}`}
            >
              <Avatar id={a} />
            </motion.button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-coral/15 px-3 py-2 font-semibold text-coral-dark">{error}</p>}
      <button className="btn btn-coral btn-giant mt-4" disabled={!name.trim() || busy}>{busy ? 'Entrando…' : cta}</button>
    </form>
  );
}

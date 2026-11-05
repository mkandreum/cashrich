import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Share2, Tv, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { Snapshot } from '../lib/api';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';

const LEVELS = [
  ['facil', 'Fácil', 'Más efectivo inicial, crédito barato y mercados tranquilos.'],
  ['normal', 'Normal', 'La partida equilibrada: sales cuando tus rentas cubren tus gastos.'],
  ['dificil', 'Difícil', 'Menos efectivo, crédito caro, mercados violentos; necesitas rentas del 125% de tus gastos y los sueños cuestan un 50% más.'],
] as const;
const DURATIONS = [[0, 'Sin límite'], [12, '12 rondas'], [20, '20 rondas'], [30, '30 rondas']] as const;

function GameOptions({ room, isHost, send }: { room: Snapshot; isHost: boolean; send: (type: string, payload?: unknown) => void }) {
  const { difficulty, rounds } = room.settings;
  const level = LEVELS.find(([id]) => id === difficulty)!;
  const pick = (active: boolean) => `rounded-xl border-2 px-2 py-1.5 font-display text-sm ${active ? 'border-gold bg-gold text-ink' : 'border-white/20 bg-white/10'} ${isHost ? 'cursor-pointer' : ''}`;
  return (
    <div className="panel-dark p-4">
      <h2 className="font-display text-xl">Opciones de la partida</h2>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {LEVELS.map(([id, name]) => (
          <button key={id} disabled={!isHost} aria-pressed={id === difficulty} className={pick(id === difficulty)} onClick={() => send('settings', { difficulty: id })}>{name}</button>
        ))}
      </div>
      <p className="mt-1.5 text-sm leading-snug text-cream/85">{level[2]}</p>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {DURATIONS.map(([value, name]) => (
          <button key={value} disabled={!isHost} aria-pressed={value === rounds} className={pick(value === rounds)} onClick={() => send('settings', { rounds: value })}>{name}</button>
        ))}
      </div>
      <p className="mt-1.5 text-sm leading-snug text-cream/85">{rounds ? 'Al acabar las rondas gana el mayor patrimonio, si nadie ha comprado antes su sueño.' : 'Gana quien compre primero su sueño.'}</p>
    </div>
  );
}

export function Lobby({ room, meId, isHost, tv, send }: {
  room: Snapshot; meId?: string; isHost: boolean; tv: boolean; send: (type: string, payload?: unknown) => void;
}) {
  const [origin, setOrigin] = useState(window.location.origin);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const link = `${origin}/m/${room.code}`;
  const needed = 2 - room.players.length;

  /* En localhost el enlace debe llevar la IP de la Wi-Fi para que sirva a los móviles */
  useEffect(() => {
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return;
    void fetch('/api/lan').then((r) => r.json()).then((d) => { if (d.origin) setOrigin(d.origin); }).catch(() => {});
  }, []);

  useEffect(() => {
    void QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#1d1a33', light: '#fff6df' } }).then(setQr);
  }, [link]);

  async function copy() {
    await navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  const share = () => navigator.share?.({ title: 'CashRich', text: `Únete a mi partida de CashRich con el código ${room.code}`, url: link }).catch(() => {});

  return (
    <main className={tv ? 'mx-auto flex h-dvh max-w-6xl flex-col items-center overflow-hidden px-4 py-3' : 'mx-auto flex min-h-dvh max-w-4xl flex-col items-center px-4 py-6'}>
      <Logo className="text-center text-[clamp(2.6rem,8vw,4.5rem)]" />
      <div className={`grid w-full gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] ${tv ? 'mt-3 min-h-0 flex-1' : 'mt-6'}`}>
        <section className="panel p-5 text-center">
          <p className="font-semibold text-ink/70">Código de la mesa</p>
          <p className="font-display text-6xl tracking-[0.14em]" aria-live="polite">{room.code}</p>
          {qr && <img src={qr} alt={`QR para unirse a la mesa ${room.code}`} className={`mx-auto mt-2 aspect-square rounded-xl border-[3px] border-ink ${tv ? 'w-[min(38dvh,18rem)]' : 'w-44'}`} />}
          {tv && <p className="mt-3 font-display text-2xl leading-tight">Escanea para jugar</p>}
          <div className={tv ? 'hidden' : 'mt-4 grid gap-1.5'}>
            {typeof navigator.share === 'function' && (
              <button className="btn btn-mint" onClick={share}><Share2 size={20} aria-hidden /> Invitar</button>
            )}
            <button className="btn btn-cream" onClick={copy}>
              {copied ? <Check size={20} aria-hidden /> : <Copy size={20} aria-hidden />} {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="panel-dark flex-1 p-4">
            <h2 className="font-display text-2xl">En la mesa ({room.players.length}/6)</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <AnimatePresence>
                {room.players.map((p) => (
                  <motion.li
                    key={p.id} layout
                    initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                    className="relative flex flex-col items-center rounded-2xl bg-white/10 p-2.5"
                  >
                    <span className="grid size-16 place-items-center rounded-full border-[3px] border-white text-4xl" style={{ background: p.color }}><Avatar id={p.avatar} /></span>
                    <span className="mt-1 max-w-full truncate font-semibold">{p.name}{p.id === meId ? ' (tú)' : ''}</span>
                    {p.id === room.adminId && <span className="text-xs font-semibold text-gold">Admin</span>}
                    {isHost && p.id !== meId && (
                      <button
                        aria-label={`Sacar a ${p.name}`} onClick={() => send('kick', { playerId: p.id })}
                        className="absolute right-1 top-1 grid size-7 cursor-pointer place-items-center rounded-full bg-black/40 hover:bg-coral"
                      >
                        <X size={16} aria-hidden />
                      </button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
          {!tv && <GameOptions room={room} isHost={isHost} send={send} />}
          {isHost ? (
            <div>
              <button className="btn btn-coral btn-giant" disabled={needed > 0} onClick={() => send('start')}>
                {needed > 0 ? `Falta ${needed} jugador` : '¡Empezar partida!'}
              </button>
              <a className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4" href="/tv" target="_blank" rel="noreferrer">
                <Tv size={16} aria-hidden /> Abrir el tablero en una TV
              </a>
            </div>
          ) : (
            <p className="panel-dark p-4 text-center text-lg font-semibold">
              {room.adminId
                ? `Esperando a que ${room.players.find((p) => p.id === room.adminId)?.name} empiece desde su móvil…`
                : 'Quien entre primero será el admin y empezará la partida.'}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

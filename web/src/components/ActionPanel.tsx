import { Dices, Gavel, Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { money, type Pending, type PlayerView, type Snapshot } from '../lib/api';
import type { Motion } from '../lib/hooks';
import { sfx } from '../lib/sound';
import { Dice } from './Dice';
import { GameCard } from './GameCard';

type Send = (type: string, payload?: unknown) => void;

type Auction = Extract<Snapshot['pending'], { type: 'auction' }>;

function Countdown({ endsIn }: { endsIn: number }) {
  const [end] = useState(() => Date.now() + endsIn);
  const [left, setLeft] = useState(endsIn);
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, end - Date.now())), 250);
    return () => clearInterval(timer);
  }, [end]);
  return (
    <div className="mt-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-cream-dark">
        <div className="h-full bg-coral transition-[width] duration-200" style={{ width: `${(left / 20000) * 100}%` }} />
      </div>
      <p className="mt-0.5 text-right text-xs font-semibold text-ink/70">{Math.ceil(left / 1000)} s</p>
    </div>
  );
}

/* Puja a ciegas: gana la más alta y la prima se la lleva quien pasó de la oferta */
function AuctionPanel({ auction, me, room, send }: { auction: Auction; me: PlayerView; room: Snapshot; send: Send }) {
  const down = auction.card.down;
  const seller = room.players.find((p) => p.id === auction.sellerId);
  const canBid = auction.eligible.includes(me.id) && !auction.answered.includes(me.id);
  const options = [1, 1.1, 1.25, 1.5].map((k) => Math.ceil((down * k) / 100) * 100).filter((v, i, all) => v <= me.cash && all.indexOf(v) === i);
  return (
    <GameCard deck={auction.deck} card={auction.card}>
      <p className="mt-3 inline-flex items-center gap-1.5 font-display text-lg text-coral-dark"><Gavel size={18} aria-hidden /> ¡Subasta a ciegas!</p>
      <p className="text-sm text-ink/75">
        {seller?.id === me.id
          ? 'Has pasado: te quedas lo que paguen por encima del precio.'
          : `${seller?.name} ha pasado y se llevará lo que pagues por encima del precio. Solo efectivo.`}
      </p>
      <Countdown key={auction.card.name} endsIn={auction.endsIn} />
      {canBid ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {options.map((amount) => (
            <button key={amount} className="btn btn-small btn-mint" onClick={() => send('bid', { amount })}>{money(amount)}</button>
          ))}
          <button className="btn btn-small btn-cream" onClick={() => send('bid', { amount: 0 })}>No pujo</button>
        </div>
      ) : (
        <p className="mt-2 text-center font-semibold">{seller?.id === me.id ? 'Esperando las pujas…' : 'Puja hecha. A ver quién gana…'}</p>
      )}
    </GameCard>
  );
}

function Choices({ pending, player, send }: { pending: Extract<Pending, { type: 'sell' | 'rent' }>; player: PlayerView; send: Send }) {
  const options = player.assets.filter((a) => pending.options.includes(a.id));
  const selling = pending.type === 'sell';
  return (
    <GameCard deck="market" card={pending.card}>
      <ul className="mt-3 space-y-2">
        {options.map((a) => (
          <li key={a.id} className="flex items-center gap-2 rounded-xl bg-cream-dark/60 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{a.name}</p>
              <p className="text-sm text-ink/70">
                {selling ? `Cobras ${money(Math.max(0, a.cost * pending.mult - a.mortgage))} tras la hipoteca; dejas de ganar ${money(a.flow)}/mes` : `Renta ${money(a.flow)} → ${money(a.flow * (1 + pending.pct / 100))}`}
              </p>
            </div>
            <button className="btn btn-small btn-mint" onClick={() => send('choose', { assetId: a.id })}>{selling ? 'Vender' : 'Subir'}</button>
          </li>
        ))}
      </ul>
      <button className="btn btn-cream mt-3 w-full" onClick={() => send('pass')}>Conservar todo</button>
    </GameCard>
  );
}

function Deal({ pending, player, frozen, rate, send }: { pending: Extract<Pending, { type: 'deal' }>; player: PlayerView; frozen: boolean; rate: number; send: Send }) {
  const { card } = pending;
  const missing = Math.max(0, card.down - player.cash);
  const loan = Math.ceil(missing / 1000) * 1000;
  const canBuy = missing === 0 || (!frozen && loan <= player.loanRoom);
  const months = card.flow > 0 ? Math.ceil(card.down / card.flow) : 0;
  const gap = Math.round((1 - (card.idx ?? 1)) * 100);
  return (
    <GameCard deck={pending.deck} card={card}>
      <div className="mt-2 flex flex-wrap gap-1.5 text-sm font-semibold">
        {months > 0 && <span className="rounded-full bg-sky/25 px-2.5 py-0.5">Recuperas la entrada en {months} {months === 1 ? 'mes' : 'meses'}</span>}
        {gap !== 0 && <span className={`rounded-full px-2.5 py-0.5 ${gap > 0 ? 'bg-mint/35' : 'bg-coral/20'}`}>{gap > 0 ? `Ganga: −${gap}%` : `Caro: +${-gap}%`}</span>}
      </div>
      {missing > 0 && (
        <p className="mt-2.5 rounded-lg bg-coral/15 px-2.5 py-1.5 text-sm font-semibold text-coral-dark">
          {canBuy
            ? `Te falta efectivo: pedirás ${money(loan)} al banco (+${money(loan * rate / 100)}/mes).`
            : frozen ? 'Crédito congelado este turno: no te alcanza.' : 'No te alcanza ni con el préstamo máximo.'}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn btn-cream" onClick={() => send('pass')}>Subastar</button>
        <button className="btn btn-mint" disabled={!canBuy} onClick={() => send('buy')}>Comprar</button>
      </div>
    </GameCard>
  );
}

function Waiting({ room, motion }: { room: Snapshot; motion: Motion | null }) {
  const current = room.players[room.turn];
  return (
    <section className="panel-dark flex items-center gap-3 p-3">
      <span className="grid size-11 flex-none place-items-center rounded-full border-2 border-white text-xl" style={{ background: current?.color }}>{current?.avatar}</span>
      <div className="min-w-0">
        <p className="font-display text-lg leading-tight">Juega {current?.name}</p>
        <p className="text-sm text-cream/80">{motion ? 'Moviendo ficha…' : room.message}</p>
      </div>
      <Hourglass className="ml-auto flex-none text-gold" size={22} aria-hidden />
    </section>
  );
}

export function ActionPanel({ room, me, motion, send }: { room: Snapshot; me: PlayerView; motion: Motion | null; send: Send }) {
  const myTurn = room.phase === 'playing' && room.players[room.turn]?.id === me.id;

  if (me.bankrupt) {
    return (
      <section className="panel p-4 text-center">
        <p className="font-display text-2xl">En bancarrota 💀</p>
        <p className="mt-1 text-ink/75">Te quedaste sin efectivo ni activos. Puedes seguir mirando la partida.</p>
        {myTurn && <button className="btn btn-cream mt-3 w-full" onClick={() => send('end')}>Pasar turno</button>}
      </section>
    );
  }
  if (room.pending?.type === 'auction' && !motion) return <AuctionPanel auction={room.pending} me={me} room={room} send={send} />;
  if (!myTurn) return <Waiting room={room} motion={motion} />;
  if (motion) {
    return (
      <section className="panel flex flex-col items-center gap-3 p-5 text-center">
        <Dice value={motion.value} rolling={motion.rolling} size="96px" />
        <p className="font-display text-2xl">{motion.rolling ? '¡Rodando!' : `¡Un ${motion.value}! Avanza…`}</p>
      </section>
    );
  }

  const { pending } = room;
  if (pending?.type === 'deal') return <Deal pending={pending} player={me} frozen={room.frozen} rate={room.economy.rate} send={send} />;
  if (pending?.type === 'sell' || pending?.type === 'rent') return <Choices pending={pending} player={me} send={send} />;

  if (pending?.type === 'dream') {
    const canBuy = me.cash >= pending.card.cost;
    return (
      <GameCard deck="dream" card={pending.card}>
        <p className="mt-2 text-ink/80">{canBuy ? '¡Si lo compras, ganas la partida!' : `Tienes ${money(me.cash)}. Te faltan ${money(pending.card.cost - me.cash)}.`}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn btn-cream" onClick={() => send('pass')}>Ahorrar más</button>
          <button className="btn btn-mint shine" disabled={!canBuy} onClick={() => send('dream')}>¡Comprar y ganar!</button>
        </div>
      </GameCard>
    );
  }

  if (pending?.type === 'bank') {
    const donation = Math.round(me.salary * 0.1);
    return (
      <GameCard deck="bank" card={{ name: 'Elige una opción', text: `Hoy el crédito está al ${room.economy.rate}%. Un préstamo acelera, pero sube tus gastos. Donar el 10% de tu sueldo te da dos dados durante tres turnos.` }}>
        <div className="mt-3 grid gap-2">
          <button className="btn btn-sky" disabled={room.frozen || me.loanRoom < 10000} onClick={() => send('loan', { amount: Math.min(me.loanRoom, 50000) })}>
            Pedir {money(Math.min(me.loanRoom, 50000))}
          </button>
          <button className="btn btn-mint" disabled={me.cash < donation} onClick={() => send('donate')}>Donar {money(donation)}</button>
          <button className="btn btn-cream" onClick={() => send('pass')}>Seguir de largo</button>
        </div>
      </GameCard>
    );
  }

  if (room.skipping) {
    return (
      <section className="panel p-4">
        <p className="font-display text-2xl leading-tight">Recesión 🥶</p>
        <p className="mt-1 text-ink/75">Pierdes este turno. Aprovecha para pagar deudas en tu cartera.</p>
        <button className="btn btn-coral mt-3 w-full" onClick={() => send('end')}>Terminar turno</button>
      </section>
    );
  }

  if (!room.dice) {
    return (
      <section className="panel p-4">
        <p className="font-display text-2xl leading-none">¡Te toca!</p>
        <p className="mb-3 mt-1 text-ink/75">{room.message}{me.adv > 0 ? ` Te quedan ${me.adv} tiradas con dos dados.` : ''} Puedes operar en tu cartera antes de tirar.</p>
        <button className="btn btn-coral btn-giant" onClick={() => { sfx.tap(); send('roll'); }}>
          <Dices size={32} aria-hidden /> Tirar el dado
        </button>
      </section>
    );
  }

  const card = room.lastCard;
  return (
    <div className="space-y-3">
      {card && <GameCard deck={card.kind} card={card} />}
      <section className="panel p-3">
        {!card && <p className="mb-2 font-semibold leading-snug">{room.message}</p>}
        <button className="btn btn-coral w-full" onClick={() => send('end')}>Terminar turno</button>
      </section>
    </div>
  );
}

import { ArrowUpCircle, BadgeDollarSign } from 'lucide-react';
import { useState } from 'react';
import { money, type PlayerView, type Snapshot } from '../lib/api';
import { EconomyPanel } from './Economy';
import { tagIcon } from '../lib/theme';
import { Trades } from './Trades';

export function Wallet({ room, me, send }: { room: Snapshot; me: PlayerView; send: (type: string, payload?: unknown) => void }) {
  const myTurn = room.phase === 'playing' && room.players[room.turn]?.id === me.id;
  const loans = [10000, 50000, 100000];
  const canOperate = myTurn && !room.pending;
  const [asking, setAsking] = useState(0);
  const owed = room.players.filter((p) => !p.bankrupt).flatMap((p) => p.debts.filter((d) => d.creditorId === me.id).map((d) => ({ who: p.name, d })));
  const askPayment = Math.round((asking * room.economy.rate) / 100);
  return (
    <div className="space-y-3">
      <EconomyPanel room={room} />
      <section className="panel p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg">Mis activos</h3>
          <span className="text-sm font-semibold text-ink/70">Patrimonio {money(me.netWorth)}</span>
        </div>
        {me.synergies.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {me.synergies.map((s) => <span key={s} className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold">★ {s}</span>)}
          </div>
        )}
        {me.assets.length === 0 && <p className="mt-1 text-sm text-ink/70">Aún no tienes nada que te pague. Esa es la misión: compra activos en las casillas de Ganga y Gran proyecto.</p>}
        <ul className="mt-1.5 space-y-1.5">
          {me.assets.map((a) => {
            const Icon = tagIcon(a.tag);
            return (
              <li key={a.id} className="rounded-xl bg-cream-dark/60 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <Icon size={20} className="flex-none" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.95rem] font-semibold leading-tight">{a.upgraded ? '⭐ ' : ''}{a.name}</p>
                    <p className="text-xs text-ink/65">Vale {money(a.value)} · hipoteca {money(a.mortgage)}</p>
                  </div>
                  <span className="font-display whitespace-nowrap text-mint-dark">+{money(a.flow)}</span>
                </div>
                {canOperate && (
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <button className={`btn btn-small ${a.equity >= 0 ? 'btn-cream' : 'btn-coral'}`} disabled={me.cash + a.equity < 0} onClick={() => send('sell', { assetId: a.id })}>
                      <BadgeDollarSign size={16} aria-hidden /> {a.equity >= 0 ? `Vender +${money(a.equity)}` : `Vender −${money(-a.equity)}`}
                    </button>
                    <button className="btn btn-small btn-mint" disabled={a.upgraded || me.cash < a.upgradeCost} onClick={() => send('upgrade', { assetId: a.id })}>
                      <ArrowUpCircle size={16} aria-hidden /> {a.upgraded ? 'Mejorado' : `Mejorar ${money(a.upgradeCost)}`}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <Trades room={room} me={me} send={send} />

      <section className="panel p-3">
        <h3 className="font-display text-lg">Banco</h3>
        <p className="text-sm text-ink/70">
          Ahora el banco presta al {room.economy.rate}% mensual, fijo para esa deuda. Te queda crédito por {money(me.loanRoom)}.
          {!myTurn && ' Solo puedes operar en tu turno.'}
          {room.frozen && ' Crédito congelado este turno.'}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {loans.map((amount) => (
            <button key={amount} className="btn btn-small btn-sky" disabled={!myTurn || room.frozen || me.loanRoom < amount} onClick={() => setAsking(amount)}>
              +{amount / 1000}k
            </button>
          ))}
        </div>
        {asking > 0 && myTurn && (
          <div className="mt-2 rounded-xl border-2 border-ink bg-gold/30 p-2.5" role="alertdialog" aria-label="Confirmar préstamo">
            <p className="font-semibold leading-snug">¿Pedir {money(asking)} al banco al {room.economy.rate}%?</p>
            <p className="text-sm text-ink/75">Pagarás {money(askPayment)} cada mes hasta que la liquides. Aunque la devuelvas antes, el primer mes de interés se paga.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-small btn-cream" onClick={() => setAsking(0)}>Cancelar</button>
              <button className="btn btn-small btn-sky" autoFocus onClick={() => { send('loan', { amount: asking }); setAsking(0); }}>Pedir {asking / 1000}k</button>
            </div>
          </div>
        )}
        {me.debts.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {me.debts.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-xl bg-coral/15 px-2.5 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">Deuda de {money(d.balance)}{d.creditor ? ` con ${d.creditor}` : ''}</p>
                  <p className="text-xs text-ink/65">Al {d.rate}%: pagas {money(d.payment)}/mes{d.fresh ? ` · liquidarla ya cuesta ${money(d.balance + d.payment)}` : ''}</p>
                </div>
                <button className="btn btn-small btn-mint" disabled={!myTurn || me.cash < d.balance + (d.fresh ? d.payment : 0)} onClick={() => send('repay', { debtId: d.id })}>Liquidar</button>
              </li>
            ))}
          </ul>
        )}
        {owed.length > 0 && (
          <div className="mt-2 rounded-xl bg-mint/15 px-2.5 py-1.5">
            <p className="font-semibold leading-tight">Te deben dinero: cobras {money(me.interestIn)}/mes de intereses</p>
            <ul className="text-xs text-ink/70">
              {owed.map(({ who, d }) => <li key={d.id}>{who}: {money(d.balance)} al {d.rate}% → {money(d.payment)}/mes</li>)}
            </ul>
          </div>
        )}
      </section>

      {me.note && <p className="px-1 text-sm italic text-cream/80">{me.profession}: {me.note}</p>}
    </div>
  );
}

import { Check, Handshake, X } from 'lucide-react';
import { useState } from 'react';
import { money, type PlayerView, type Snapshot } from '../lib/api';
import { Avatar } from './Avatar';

type Send = (type: string, payload?: unknown) => void;
type Kind = 'sell' | 'buy' | 'lend' | 'borrow';
const KINDS: [Kind, string][] = [['sell', 'Vender'], ['buy', 'Comprar'], ['lend', 'Prestar'], ['borrow', 'Pedir']];

const describe = (o: Snapshot['offers'][number], mine: boolean) => {
  if (o.kind === 'sell') return mine ? `Le vendes ${o.assetName} por ${money(o.amount)}` : `Te vende ${o.assetName} por ${money(o.amount)}`;
  if (o.kind === 'buy') return mine ? `Le compras ${o.assetName} por ${money(o.amount)}` : `Te compra ${o.assetName} por ${money(o.amount)}`;
  if (o.kind === 'lend') return mine ? `Le prestas ${money(o.amount)} al ${o.rate} %` : `Te presta ${money(o.amount)} al ${o.rate} % mensual`;
  return mine ? `Le pides ${money(o.amount)} al ${o.rate} %` : `Te pide ${money(o.amount)} y te paga un ${o.rate} % mensual`;
};

/* Tratos entre jugadores: se proponen y se aceptan en cualquier momento, también fuera de tu turno. */
export function Trades({ room, me, send }: { room: Snapshot; me: PlayerView; send: Send }) {
  const rivals = room.players.filter((p) => p.id !== me.id && !p.bankrupt);
  const [toId, setToId] = useState('');
  const [kind, setKind] = useState<Kind>('sell');
  const [assetId, setAssetId] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('8');
  const to = rivals.find((p) => p.id === toId) ?? rivals[0];
  const incoming = room.offers.filter((o) => o.toId === me.id);
  const outgoing = room.offers.filter((o) => o.fromId === me.id);
  const assets = kind === 'sell' ? me.assets : kind === 'buy' ? to?.assets ?? [] : [];
  const needsAsset = kind === 'sell' || kind === 'buy';
  const chosen = assets.find((a) => a.id === assetId) ?? assets[0];
  const value = Number(amount);
  const ready = !!to && value >= 100 && (!needsAsset || !!chosen);
  if (room.phase !== 'playing' || me.bankrupt || !rivals.length) return null;

  const propose = () => {
    send('offer', { kind, toId: to!.id, amount: value, ...(needsAsset ? { assetId: chosen!.id } : { rate: Number(rate) }) });
    setAmount('');
  };
  const name = (id: string) => room.players.find((p) => p.id === id);
  const field = 'mt-1 w-full rounded-lg border-2 border-ink bg-white px-2 py-1.5 font-semibold';

  return (
    <section className="panel p-3" aria-label="Tratos con otros jugadores">
      <h3 className="inline-flex items-center gap-1.5 font-display text-lg"><Handshake size={20} aria-hidden /> Tratos</h3>
      {incoming.length > 0 && (
        <ul className="mt-1.5 space-y-1.5">
          {incoming.map((o) => (
            <li key={o.id} className="flex items-center gap-2 rounded-xl bg-gold/40 px-2.5 py-1.5">
              <Avatar id={name(o.fromId)?.avatar} size="1.5em" />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-tight">{name(o.fromId)?.name}: {describe(o, false)}</p>
              <button aria-label="Aceptar el trato" className="btn btn-small btn-mint" onClick={() => send('acceptOffer', { offerId: o.id })}><Check size={16} aria-hidden /></button>
              <button aria-label="Rechazar el trato" className="btn btn-small btn-cream" onClick={() => send('dropOffer', { offerId: o.id })}><X size={16} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      {outgoing.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {outgoing.map((o) => (
            <li key={o.id} className="flex items-center gap-2 rounded-xl bg-cream-dark/60 px-2.5 py-1 text-sm">
              <p className="min-w-0 flex-1 leading-tight">A {name(o.toId)?.name}: {describe(o, true)} <span className="text-ink/60">(esperando)</span></p>
              <button aria-label="Retirar la oferta" className="btn btn-small btn-cream" onClick={() => send('dropOffer', { offerId: o.id })}><X size={16} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 grid grid-cols-4 gap-1">
        {KINDS.map(([id, label]) => (
          <button key={id} aria-pressed={id === kind} onClick={() => setKind(id)} className={`cursor-pointer rounded-lg border-2 border-ink px-1 py-1 text-sm font-semibold ${id === kind ? 'bg-gold' : 'bg-white'}`}>{label}</button>
        ))}
      </div>
      <label className="mt-2 block text-sm font-semibold">Con
        <select className={field} value={to?.id ?? ''} onChange={(e) => setToId(e.target.value)}>
          {rivals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      {needsAsset && (
        assets.length ? (
          <label className="mt-1.5 block text-sm font-semibold">Activo
            <select className={field} value={chosen?.id ?? ''} onChange={(e) => setAssetId(e.target.value)}>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name} (+{money(a.flow)}/mes, hipoteca {money(a.mortgage)})</option>)}
            </select>
          </label>
        ) : <p className="mt-1.5 text-sm text-ink/70">{kind === 'sell' ? 'No tienes activos que vender.' : `${to?.name} no tiene activos.`}</p>
      )}
      <div className={`mt-1.5 grid gap-2 ${needsAsset ? '' : 'grid-cols-2'}`}>
        <label className="block text-sm font-semibold">{needsAsset ? 'Precio' : 'Cantidad'}
          <input className={field} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="10000" />
        </label>
        {!needsAsset && (
          <label className="block text-sm font-semibold">% mensual
            <input className={field} inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ''))} />
          </label>
        )}
      </div>
      {needsAsset && <p className="mt-1 text-xs text-ink/65">La hipoteca va con el activo: quien compra paga el precio y se queda la deuda.</p>}
      <button className="btn btn-small btn-sky mt-2 w-full" disabled={!ready} onClick={propose}>Proponer trato</button>
    </section>
  );
}

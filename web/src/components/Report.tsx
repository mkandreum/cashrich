import { Printer, Share2 } from 'lucide-react';
import { money, type Snapshot } from '../lib/api';

type Entry = NonNullable<Snapshot['report']>[number];
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`;

const QUESTIONS = [
  '¿Qué compra te dio más dinero al mes y por qué?',
  '¿Cuándo te compensó endeudarte y cuándo no?',
  '¿Qué harías distinto si la economía entrase antes en recesión?',
  '¿Qué gasto de la vida real se parece a tus caprichos del juego?',
];

function Spark({ series }: { series: number[] }) {
  if (series.length < 2) return null;
  const min = Math.min(...series, 0);
  const max = Math.max(...series, 1);
  const points = series.map((v, i) => `${(i / (series.length - 1)) * 100},${28 - ((v - min) / (max - min)) * 26}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-1 h-14 w-full" role="img" aria-label={`Patrimonio: de ${money(series[0])} a ${money(series[series.length - 1])}`}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className="text-mint-dark" />
    </svg>
  );
}

/* Informe final de cada jugador; en modo aula añade la ficha de reflexión. */
export function Report({ room, entry }: { room: Snapshot; entry: Entry }) {
  const t = entry.totals;
  const aula = room.settings.mode === 'aula';
  const summary = `CashRich: ${entry.name} ha terminado con ${money(entry.series[entry.series.length - 1])}.${entry.best ? ` Mejor operación: ${entry.best.name} (${money(entry.best.gain)}).` : ''} ${entry.lesson}`;
  const share = () => {
    if (typeof navigator.share === 'function') void navigator.share({ title: 'CashRich', text: summary }).catch(() => {});
    else void navigator.clipboard?.writeText(summary).catch(() => {});
  };
  return (
    <section className="panel print-area mt-3 p-3 text-left">
      <h3 className="font-display text-lg">Tu informe, {entry.name}</h3>
      <Spark series={entry.series} />
      <dl className="mt-1 space-y-1 text-sm">
        {entry.best && <div><dt className="inline font-semibold">Mejor operación: </dt><dd className="inline">{entry.best.name} ({signed(entry.best.gain)})</dd></div>}
        {entry.worst && <div><dt className="inline font-semibold">Peor operación: </dt><dd className="inline">{entry.worst.name} ({signed(entry.worst.gain)})</dd></div>}
        <div><dt className="inline font-semibold">Rentas cobradas: </dt><dd className="inline">{money(t.rent)}</dd></div>
        <div><dt className="inline font-semibold">Intereses: </dt><dd className="inline">{money(t.interest)}</dd></div>
        <div><dt className="inline font-semibold">Caprichos e imprevistos: </dt><dd className="inline">{money(t.gustos + t.bills)}</dd></div>
        <div><dt className="inline font-semibold">Impuestos: </dt><dd className="inline">{money(t.taxes)}</dd></div>
      </dl>
      <p className="mt-2 font-semibold">{entry.lesson}</p>
      {aula && (
        <>
          <h4 className="mt-3 font-display">Para pensar</h4>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{QUESTIONS.map((q) => <li key={q}>{q}</li>)}</ol>
        </>
      )}
      <div className="no-print mt-2 grid grid-cols-2 gap-2">
        <button className="btn btn-small btn-mint" onClick={share}><Share2 size={16} aria-hidden /> Compartir</button>
        {aula && <button className="btn btn-small btn-cream" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimir ficha</button>}
      </div>
    </section>
  );
}

export function LeaderboardPanel({ room }: { room: Snapshot }) {
  if (!room.week) return null;
  return (
    <section className="panel mt-3 p-3 text-left">
      <h3 className="font-display text-lg">Reto de la semana {room.week}</h3>
      {room.leaderboard.length === 0 && <p className="text-sm text-ink/70">Aún no hay marcas. ¡Pon la primera!</p>}
      <ol className="mt-1 space-y-0.5 text-sm">
        {room.leaderboard.map((e, i) => (
          <li key={e.name} className="flex gap-2"><span className="w-5 font-display">{i + 1}</span><span className="min-w-0 flex-1 truncate font-semibold">{e.name}</span><span className="font-display text-mint-dark">+{e.score} meses</span></li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-ink/65">Mismas cartas, economía y dados para todas las mesas. Puntúa lo ganado, medido en meses de tu sueldo.</p>
    </section>
  );
}

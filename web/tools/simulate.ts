/* Mide el equilibrio jugando miles de partidas con reglas fijas. Solo es una herramienta: no forma parte del juego.
   Uso: npx tsx tools/simulate.ts [partidas] [jugadores] */
import { createEngine, newGame, type GameMode } from '../server/game';

type Creds = { playerId: string; token: string };
type Style = 'prudente' | 'apalancado';

function play(mode: GameMode, players: number, style: (i: number) => Style) {
  const engine = createEngine(newGame('SIM'));
  const S = engine.state;
  const creds: Creds[] = [];
  for (let i = 0; i < players; i++) creds.push(engine.join(`J${i}`, '') as Creds);
  engine.act(creds[0], 'settings', { mode });
  engine.act(creds[0], 'start');
  const by = (id: string) => creds[S.players.findIndex((p) => p.id === id)];
  let turns = 0;
  while (S.phase === 'playing' && turns < 3000) {
    turns++;
    const i = S.turn;
    const p = S.players[i];
    const c = creds[i];
    if (!S.dice && !S.skipping && !p.bankrupt) engine.act(c, 'roll');
    const pending = S.pending;
    if (pending?.type === 'deal') {
      const down = pending.card.down as number;
      const flow = pending.card.flow as number;
      const canPay = p.cash >= down;
      const leverage = style(i) === 'apalancado' && flow > 0 && down - p.cash <= p.salary * 3;
      engine.act(c, flow > 0 && (canPay || leverage) ? 'buy' : 'pass');
      const a = S.pending;
      if (a?.type === 'auction') a.eligible.forEach((id) => engine.act(by(id), 'bid', { amount: S.players.find((x) => x.id === id)!.cash > a.card.down * 2 ? a.card.down : 0 }));
      if (S.pending?.type === 'deal') engine.act(c, 'pass');
    } else if (pending?.type === 'dream') {
      engine.act(c, p.cash >= pending.card.cost ? 'dream' : 'pass');
    } else if (pending?.type === 'sell' || pending?.type === 'rent') {
      engine.act(c, pending.type === 'rent' || pending.optional === false ? 'choose' : 'pass', { assetId: pending.options[0] });
      if (S.pending) engine.act(c, 'choose', { assetId: (S.pending as { options: string[] }).options[0] });
    } else if (pending) {
      engine.act(c, 'pass');
    }
    if (S.phase === 'playing') engine.act(c, 'end');
  }
  return { turns, rounds: S.round, S };
}

function report(mode: GameMode, games: number, players: number) {
  const rounds: number[] = [];
  let dream = 0, none = 0, escaped = 0, bankrupt = 0, total = 0, styleWins = [0, 0];
  const prof = new Map<string, { games: number; wins: number }>();
  for (let g = 0; g < games; g++) {
    const { S } = play(mode, players, (i) => (i % 2 ? 'apalancado' : 'prudente'));
    rounds.push(Math.min(S.round, S.settings.rounds || S.round));
    if (S.log.some((l) => /GANÓ LA PARTIDA/.test(l.text))) dream++;
    if (!S.winner) none++;
    S.players.forEach((p, i) => {
      total++;
      if (p.escaped) escaped++;
      if (p.bankrupt) bankrupt++;
      const e = prof.get(p.profession) ?? { games: 0, wins: 0 };
      e.games++;
      if (S.winner === p.id) { e.wins++; styleWins[i % 2]++; }
      prof.set(p.profession, e);
    });
  }
  rounds.sort((a, b) => a - b);
  const median = rounds[Math.floor(rounds.length / 2)];
  const p90 = rounds[Math.floor(rounds.length * 0.9)];
  const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;
  const list = [...prof.entries()].map(([k, v]) => [k, v.wins / v.games] as const).sort((a, b) => b[1] - a[1]);
  console.log(`\n== ${mode} · ${players} jugadores · ${games} partidas`);
  console.log(`rondas: mediana ${median}, p90 ${p90} | a 30 s por turno: ${Math.round((median * players * 30) / 60)} min (p90 ${Math.round((p90 * players * 30) / 60)})`);
  console.log(`acaban con Legado ${pct(dream, games)} | sin ganador ${pct(none, games)} | salen del barrio ${pct(escaped, total)} | bancarrota ${pct(bankrupt, total)}`);
  console.log(`victorias: prudente ${pct(styleWins[0], games)} / apalancado ${pct(styleWins[1], games)}`);
  console.log(`profesiones: ${list.map(([k, w]) => `${k} ${Math.round(w * 100)}%`).join(', ')}`);
}

const games = Number(process.argv[2]) || 1000;
const players = Number(process.argv[3]) || 4;
for (const mode of ['expres', 'clasico'] as const) report(mode, games, players);

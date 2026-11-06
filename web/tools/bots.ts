/* Bots de prueba: juegan partidas enteras usando todas las acciones (préstamos, tratos, ventas,
   mejoras, subastas) y comprueban las reglas tras cada jugada. Solo es una herramienta.
   Uso: npx tsx tools/bots.ts [partidas] [jugadores] */
import { createEngine, newGame, type GameMode } from '../server/game';

type Creds = { playerId: string; token: string };
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const chance = (p: number) => Math.random() < p;

const problems = new Map<string, { count: number; example: string }>();
function fail(rule: string, example: string) {
  const e = problems.get(rule) ?? { count: 0, example };
  e.count++;
  problems.set(rule, e);
}

const stats = {
  games: 0, rounds: [] as number[], byDream: 0, byTime: 0, byElimination: 0, stuck: 0,
  embargoes: 0, emergencyLoans: 0, bankrupt: 0, escaped: 0, players: 0,
  bankLoans: 0, earlyFees: 0, trades: 0, playerLoans: 0, twoDice: 0, errors: new Map<string, number>(),
};

const perMode = new Map<string, { games: number; dream: number; time: number; elim: number; rounds: number[]; escaped: number; players: number; winnerProg: number[] }>();
function play(mode: GameMode, n: number) {
  const engine = createEngine(newGame('BOT'));
  const S = engine.state;
  const creds: Creds[] = [];
  for (let i = 0; i < n; i++) creds.push(engine.join(`Bot${i}`, '') as Creds);
  engine.act(creds[0], 'settings', { mode });
  if (engine.act(creds[0], 'start').error) throw new Error('no arranca');
  const cOf = (id: string) => creds[S.players.findIndex((p) => p.id === id)];
  const base = new Map(S.players.map((p) => [p.id, p.expenses - p.debts.reduce((a, d) => a + d.payment, 0)]));
  const risk = S.players.map(() => Math.random()); // 0 prudente … 1 temerario

  const act = (c: Creds, type: string, payload?: unknown, expectOk = false) => {
    const before = S.log[0]?.id ?? 0;
    const r = engine.act(c, type, payload) as { error?: string };
    if (r.error) {
      stats.errors.set(`${type}: ${r.error}`, (stats.errors.get(`${type}: ${r.error}`) ?? 0) + 1);
      if (expectOk) fail(`acción válida rechazada (${type})`, r.error);
    }
    for (const l of S.log.filter((x) => x.id > before)) {
      if (l.text.includes('Embargo')) stats.embargoes++;
      if (l.text.includes('del interés del primer mes')) stats.earlyFees++;
      if (/vende .* a .* por/.test(l.text)) stats.trades++;
      if (/presta .* al .*%/.test(l.text) && l.text.startsWith('🤝') && !l.text.includes('propone')) stats.playerLoans++;
      if (/pidió un préstamo/.test(l.text)) stats.bankLoans++;
    }
    check(type);
    return r;
  };

  function check(after: string) {
    const ids = new Set<string>();
    for (const p of S.players) {
      const nums = { cash: p.cash, expenses: p.expenses, passive: p.passive, salary: p.salary };
      for (const [k, v] of Object.entries(nums)) if (!Number.isFinite(v)) fail(`${k} no es un número`, `${p.name} tras ${after}: ${v}`);
      if (p.bankrupt && p.escaped) fail('bancarrota y fuera del barrio a la vez', p.name);
      if (p.pos < 0 || p.pos >= 32 + 64 || p.vpos < 0) fail('posición imposible', `${p.pos}/${p.vpos}`);
      const payments = p.debts.reduce((a, d) => a + d.payment, 0);
      // Las casillas (caprichos, inflación) pueden subir el coste de vida; el resto de acciones no
      if (after === 'roll' || after === 'end' || after === 'bid' || after === 'pass') base.set(p.id, p.expenses - payments);
      else if (!p.bankrupt && p.expenses - payments !== base.get(p.id))
        fail('los gastos no cuadran con las cuotas', `${p.name} tras ${after}: gastos ${p.expenses}, cuotas ${payments}, base ${base.get(p.id)}`);
      if (p.expenses - payments < 0) fail('coste de vida negativo', `${p.name}: ${p.expenses - payments}`);
      for (const d of p.debts) {
        if (d.balance <= 0 || d.payment < 0) fail('deuda rara', JSON.stringify(d));
        if (d.creditorId === p.id) fail('deuda consigo mismo', p.name);
        if (d.creditorId && !S.players.some((x) => x.id === d.creditorId)) fail('acreedor inexistente', p.name);
      }
      for (const a of p.assets) {
        if (ids.has(a.id)) fail('activo duplicado entre jugadores', a.name);
        ids.add(a.id);
        if (a.mortgage < 0 || a.flow < -1e6) fail('activo raro', JSON.stringify(a));
      }
    }
    for (const o of S.offers) {
      const from = S.players.find((x) => x.id === o.fromId), to = S.players.find((x) => x.id === o.toId);
      if (!from || !to || from.bankrupt || to.bankrupt) fail('oferta con jugador fuera', JSON.stringify(o));
    }
    if (S.dice2 && S.dice2 > S.dice) fail('el dado descartado es mayor que el usado', `${S.dice}/${S.dice2}`);
  }

  // Cada vez que cambia el turno, quien empieza no puede quedar en negativo
  const turnStartCheck = () => {
    const p = S.players[S.turn];
    if (S.phase === 'playing' && !p.bankrupt && p.cash < 0) fail('empieza el turno con efectivo negativo', `${p.name}: ${p.cash}`);
  };

  let turns = 0;
  while (S.phase === 'playing' && turns < 4000) {
    turns++;
    // Fuera de turno: cualquiera puede proponer o contestar tratos
    for (let i = 0; i < n; i++) {
      const me = S.players[i];
      if (me.bankrupt || S.phase !== 'playing') continue;
      for (const o of S.offers.filter((x) => x.toId === me.id)) {
        const fair = o.kind === 'lend' || o.kind === 'borrow' ? (o.rate ?? 0) <= 12 : chance(0.5);
        act(creds[i], fair && chance(0.6) ? 'acceptOffer' : 'dropOffer', { offerId: o.id });
      }
      if (!chance(0.08)) continue;
      const other = pick(S.players.filter((x) => x.id !== me.id && !x.bankrupt));
      if (!other) continue;
      const kind = pick(['sell', 'buy', 'lend', 'borrow'] as const);
      if (kind === 'sell' && me.assets.length) {
        const a = pick(me.assets);
        act(creds[i], 'offer', { kind, toId: other.id, assetId: a.id, amount: Math.max(1000, Math.round(a.down * (0.8 + Math.random()))) });
      } else if (kind === 'buy' && other.assets.length && me.cash > 5000) {
        const a = pick(other.assets);
        act(creds[i], 'offer', { kind, toId: other.id, assetId: a.id, amount: Math.min(me.cash, Math.round(a.down * (0.6 + Math.random()))) });
      } else if (kind === 'lend' && me.cash > 20000) {
        act(creds[i], 'offer', { kind, toId: other.id, amount: Math.round(me.cash * 0.3), rate: 4 + Math.floor(Math.random() * 12) });
      } else if (kind === 'borrow') {
        act(creds[i], 'offer', { kind, toId: other.id, amount: 10000 * (1 + Math.floor(Math.random() * 5)), rate: 4 + Math.floor(Math.random() * 12) });
      }
    }
    if (S.phase !== 'playing') break;

    const i = S.turn;
    const p = S.players[i];
    const c = creds[i];
    const r = risk[i];
    // Antes de tirar: a veces pide crédito, liquida deudas o mejora
    if (!S.dice && !S.skipping && !p.bankrupt) {
      if (chance(r * 0.15) && p.debts.length < 4) act(c, 'loan', { amount: pick([10000, 50000, 100000]) });
      for (const d of p.debts.slice()) if (p.cash > d.balance + d.payment + p.salary && chance(0.5)) act(c, 'repay', { debtId: d.id }, true);
      const up = p.assets.find((a) => !a.upgraded);
      if (up && p.cash > p.salary * 4 && chance(0.3)) act(c, 'upgrade', { assetId: up.id });
      if (p.adv > 0) stats.twoDice++;
      act(c, 'roll', undefined, true);
    }
    const pending = S.pending;
    if (pending?.type === 'deal') {
      const down = pending.card.down as number;
      const flow = pending.card.flow as number;
      const want = flow > 0 && (p.cash >= down || (chance(r) && down - p.cash < p.salary * 4));
      act(c, want ? 'buy' : 'pass');
      if (S.pending?.type === 'deal') act(c, 'pass');
      const a = S.pending;
      if (a?.type === 'auction') {
        for (const id of a.eligible.slice()) {
          const x = S.players.find((y) => y.id === id)!;
          const bid = x.cash > a.card.down * 1.5 && chance(0.6) ? Math.min(x.cash, Math.round(a.card.down * (1 + Math.random() * 0.4))) : 0;
          if (S.pending?.type === 'auction') act(cOf(id), 'bid', { amount: bid });
        }
      }
    } else if (pending?.type === 'dream') {
      act(c, p.cash >= pending.card.cost ? 'dream' : 'pass');
    } else if (pending?.type === 'sell' || pending?.type === 'rent') {
      const optional = (pending as { optional?: boolean }).optional !== false;
      if (pending.type === 'sell' && optional && chance(0.5)) act(c, 'pass');
      else act(c, 'choose', { assetId: pending.options[0] }, true);
      if (S.pending?.type === 'sell' || S.pending?.type === 'rent') act(c, 'choose', { assetId: (S.pending as { options: string[] }).options[0] });
    } else if (pending?.type === 'bank') {
      act(c, chance(0.3) ? 'donate' : 'pass');
    } else if (pending) {
      act(c, 'pass');
    }
    if (S.phase !== 'playing') break;
    if (S.pending) act(c, 'pass');
    if (S.pending) fail('turno atascado con algo pendiente', S.pending.type);
    const r2 = act(c, 'end');
    if (r2.error && S.phase === 'playing') { fail('no se puede terminar el turno', r2.error); break; }
    // Nadie empieza su turno en negativo
    turnStartCheck();
  }
  stats.games++;
  if (S.phase === 'playing') { stats.stuck++; fail('la partida no termina', `${turns} turnos, ronda ${S.round}`); }
  stats.rounds.push(S.round);
  if (S.log.some((l) => /GANÓ LA PARTIDA/.test(l.text))) stats.byDream++;
  else if (S.log.some((l) => /Se acabó el tiempo/.test(l.text))) stats.byTime++;
  else stats.byElimination++;
  const m = perMode.get(mode) ?? { games: 0, dream: 0, time: 0, elim: 0, rounds: [], escaped: 0, players: 0, winnerProg: [] };
  m.games++; m.rounds.push(S.round);
  if (S.log.some((l) => /GANÓ LA PARTIDA/.test(l.text))) m.dream++; else if (S.log.some((l) => /Se acabó el tiempo/.test(l.text))) m.time++; else m.elim++;
  S.players.forEach((p) => { m.players++; if (p.escaped) m.escaped++; });
  perMode.set(mode, m);
  stats.emergencyLoans += S.log.filter((l) => /pidió un préstamo/.test(l.text) && false).length;
  S.players.forEach((p) => { stats.players++; if (p.bankrupt) stats.bankrupt++; if (p.escaped) stats.escaped++; });
  const snap = engine.snapshot();
  if (!snap.report || snap.report.some((r) => !Number.isFinite(r.progress ?? 0))) fail('informe final vacío o con NaN', '');
  if (JSON.stringify(snap).includes('NaN') || JSON.stringify(snap).includes('null,null')) fail('NaN en el estado público', '');
}

const games = Number(process.argv[2]) || 300;
const players = Number(process.argv[3]) || 4;
for (const mode of ['expres', 'clasico', 'aula'] as const) for (let g = 0; g < games; g++) play(mode, players);
const pct = (a: number, b: number) => `${Math.round((a / b) * 100)}%`;
stats.rounds.sort((a, b) => a - b);
console.log(`partidas ${stats.games} (${players} bots) · rondas mediana ${stats.rounds[stats.rounds.length >> 1]}`);
console.log(`terminan: Legado ${pct(stats.byDream, stats.games)} · tiempo ${pct(stats.byTime, stats.games)} · eliminación ${pct(stats.byElimination, stats.games)} · atascadas ${stats.stuck}`);
console.log(`jugadores: salen del barrio ${pct(stats.escaped, stats.players)} · bancarrota ${pct(stats.bankrupt, stats.players)}`);
console.log(`por partida: embargos ${(stats.embargoes / stats.games).toFixed(2)} · préstamos banco ${(stats.bankLoans / stats.games).toFixed(1)} · intereses de primer mes ${(stats.earlyFees / stats.games).toFixed(2)} · ventas entre jugadores ${(stats.trades / stats.games).toFixed(2)} · préstamos entre jugadores ${(stats.playerLoans / stats.games).toFixed(2)} · tiradas con dos dados ${(stats.twoDice / stats.games).toFixed(2)}`);
perMode.forEach((m, k) => {
  m.rounds.sort((a, b) => a - b);
  console.log(`  ${k}: rondas mediana ${m.rounds[m.rounds.length >> 1]} (p90 ${m.rounds[Math.floor(m.rounds.length * 0.9)]}) · Legado ${pct(m.dream, m.games)} · tiempo ${pct(m.time, m.games)} · eliminación ${pct(m.elim, m.games)} · salen del barrio ${pct(m.escaped, m.players)}`);
});
console.log('\nERRORES DEVUELTOS (normales si el bot intenta algo no permitido):');
[...stats.errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`  ${v}× ${k}`));
console.log(problems.size ? '\nPROBLEMAS:' : '\nSin problemas de reglas.');
problems.forEach((v, k) => console.log(`  ${v.count}× ${k} — ej.: ${v.example}`));

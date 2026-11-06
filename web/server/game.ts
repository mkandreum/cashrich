/* CashRich - motor del juego. Una mesa por instancia; sin red ni disco. */
import { randomBytes } from 'node:crypto';
import DATA from '../data.json';

export const AVATARS = ['🐭', '🦊', '🐸', '🐼', '🦁', '🐙', '🐧', '🐷', '🐵', '🦄', '🐯', '🐻'];
const COLORS = ['#FF5A4E', '#2FB5F5', '#FFC83D', '#C77DFF', '#3DDC97', '#FF8FC7'];
export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

export type Asset = {
  id: string; name: string; tag: string; cost: number; baseCost: number; down: number; mortgage: number; flow: number; kind: string; upgraded: boolean;
};
/* fresh: aún no ha pasado un mes; si la liquidas ya, pagas igualmente el interés de ese primer mes */
export type Debt = { id: string; balance: number; payment: number; rate: number; creditorId?: string; creditor?: string; fresh?: boolean };
export type Offer = { id: string; kind: 'sell' | 'buy' | 'lend' | 'borrow'; fromId: string; toId: string; assetId?: string; assetName?: string; amount: number; rate?: number; expires: number };
type Ledger = { assetId: string; name: string; round: number; paid: number; received: number; rent: number; open: boolean };
type Totals = { rent: number; taxes: number; gustos: number; bills: number; interest: number };
type Card = Record<string, any>;
export type Pending =
  | { type: 'bank' }
  | { type: 'deal'; card: Card; deck: 'small' | 'big' }
  | { type: 'dream'; card: Card }
  | { type: 'sell'; card: Card; mult: number; options: string[]; optional: boolean }
  | { type: 'rent'; card: Card; pct: number; options: string[] }
  | { type: 'auction'; card: Card; deck: 'small' | 'big'; sellerId: string; eligible: string[]; bids: Record<string, number>; answered: string[]; deadline: number };

type Player = {
  id: string; token: string; name: string; avatar: string; color: string;
  profession: string; note: string; salary: number; expenses: number; cash: number; passive: number;
  assets: Asset[]; debts: Debt[]; pos: number; vpos: number; escaped: boolean; bankrupt: boolean;
  skip: number; adv: number; rentLost: number; turns: number;
  ledger: Ledger[]; totals: Totals; series: number[]; dreamPaid: number; startCash: number;
};

export type GameState = {
  code: string; tv: boolean; phase: 'lobby' | 'playing' | 'over';
  players: Player[]; turn: number; round: number; dice: number; dice2: number; frozen: boolean; skipping: boolean;
  pending: Pending | null; lastCard: Card | null; message: string; winner: string | null;
  log: { id: number; text: string; who: string | null }[]; seq: number;
  settings: Settings; economy: Economy;
  decks: Record<'small' | 'big' | 'market' | 'gusto' | 'dream', Card[]>;
  offers: Offer[];
  challenge: { week: string; counters: Record<string, number>; recorded: boolean } | null;
};

/* Clasificación del reto semanal: la guarda el servidor, el motor solo la consulta y la alimenta. */
export type ScoreEntry = { name: string; avatar: string; profession: string; score: number };
export type Leaderboard = { top: (week: string) => ScoreEntry[]; add: (week: string, entries: ScoreEntry[]) => void };

export type Result = { error?: string };

/* ---------- Economía: ciclos que mueven precios, rentas y tipos de interés ---------- */
type Sector = 'property' | 'stock' | 'business';
export type Difficulty = 'facil' | 'normal' | 'dificil';
export type GameMode = 'expres' | 'clasico' | 'reto' | 'aula';
export type Settings = { difficulty: Difficulty; rounds: number; mode: GameMode };
type PhaseName = 'expansion' | 'boom' | 'recesion' | 'recuperacion';
type Economy = { phase: PhaseName; left: number; idx: Record<Sector, number>; hist: Record<Sector, number[]> };

const DIFFICULTY: Record<Difficulty, { cash: number; rate: number; vol: number; goal: number; dream: number }> = {
  facil: { cash: 1.5, rate: -2, vol: 0.6, goal: 1, dream: 1 },
  normal: { cash: 1, rate: 0, vol: 1, goal: 1, dream: 1 },
  dificil: { cash: 0.75, rate: 3, vol: 1.4, goal: 1.25, dream: 1.5 },
};
const ROUND_LIMITS = [0, 12, 20, 30];
/* Ajustes de cada modo, sobre la dificultad. Los valores salen de web/tools/simulate.ts. */
const MODES: Record<GameMode, { cash: number; goal: number; dream: number; rounds: number }> = {
  expres: { cash: 1, goal: 0.75, dream: 0.6, rounds: 12 },
  clasico: { cash: 1, goal: 1, dream: 1, rounds: 0 },
  reto: { cash: 1, goal: 0.75, dream: 0.6, rounds: 12 },
  aula: { cash: 1, goal: 0.75, dream: 0.6, rounds: 12 },
};
const MAX_OPEN_OFFERS = 3;
const emptyTotals = (): Totals => ({ rent: 0, taxes: 0, gustos: 0, bills: 0, interest: 0 });
const hash01 = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/* Semana ISO: identifica el reto en curso, p. ej. 2026-W45 */
export function weekId(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
const PHASES: Record<PhaseName, { label: string; hint: string; next: PhaseName; rounds: [number, number]; drift: Record<Sector, number>; rate: number; rent: number }> = {
  expansion: { label: 'Expansión', hint: 'Los precios suben poco a poco. Buen momento para seguir comprando.', next: 'boom', rounds: [3, 5], drift: { property: 0.03, stock: 0.05, business: 0.03 }, rate: 10, rent: 1 },
  boom: { label: 'Burbuja', hint: 'Todo está caro y las rentas suben. Quien vende ahora, gana. La crisis se acerca.', next: 'recesion', rounds: [1, 3], drift: { property: 0.06, stock: 0.1, business: 0.05 }, rate: 12, rent: 1.1 },
  recesion: { label: 'Recesión', hint: 'Precios por los suelos, rentas a la baja y crédito carísimo. Si tienes efectivo, compra.', next: 'recuperacion', rounds: [2, 4], drift: { property: -0.07, stock: -0.14, business: -0.08 }, rate: 15, rent: 0.85 },
  recuperacion: { label: 'Recuperación', hint: 'Crédito barato y gangas que aún no han subido. Es la hora de apalancarse.', next: 'expansion', rounds: [2, 3], drift: { property: 0.02, stock: 0.06, business: 0.03 }, rate: 8, rent: 0.95 },
};
const VOLATILITY: Record<Sector, number> = { property: 0.03, stock: 0.09, business: 0.05 };
const between = ([a, b]: [number, number], rng: () => number = Math.random) => a + Math.floor(rng() * (b - a + 1));
const round100 = (n: number) => Math.max(100, Math.round(n / 100) * 100);
const newEconomy = (rng: () => number = Math.random): Economy => ({
  phase: 'expansion', left: between(PHASES.expansion.rounds, rng), idx: { property: 1, stock: 1, business: 1 },
  hist: { property: [1], stock: [1], business: [1] },
});

const uid = () => randomBytes(5).toString('hex');
const secret = () => randomBytes(18).toString('base64url');
const ADMIN_ACTIONS = ['start', 'reset', 'skipTurn', 'kick', 'settings'];
const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const shuffle = <T,>(input: T[], rng: () => number = Math.random): T[] => {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const defaultSettings = (): Settings => ({ difficulty: 'normal', rounds: MODES.expres.rounds, mode: 'expres' });
const freshDecks = (rng: () => number = Math.random): GameState['decks'] => ({
  small: shuffle(DATA.small, rng), big: shuffle(DATA.big, rng), market: shuffle(DATA.market, rng),
  gusto: shuffle(DATA.gusto, rng), dream: shuffle(DATA.dreams, rng),
});

export function newGame(code: string, tv = false): GameState {
  return {
    code, tv, phase: 'lobby', players: [], turn: 0, round: 1, dice: 0, dice2: 0,
    frozen: false, skipping: false, pending: null, lastCard: null,
    message: 'Esperando jugadores…', winner: null, log: [], seq: 0, decks: freshDecks(),
    settings: defaultSettings(), economy: newEconomy(), offers: [], challenge: null,
  };
}

const PROPERTY = ['VIVIENDA', 'COMERCIAL', 'INDUSTRIAL', 'TURISMO', 'TERRENO', 'ENERGÍA', 'AGRO'];
const STOCK = ['BOLSA', 'RENTA FIJA', 'COLECTIVO', 'PROTECCIÓN', 'VOLÁTIL', 'REGALÍAS', 'CRIPTO', 'RIESGO', 'DUDOSA'];
const BUSINESS = ['NEGOCIO', 'FRANQUICIA', 'SOCIEDAD', 'SERVICIO', 'DIGITAL'];
const sectorOf = (tag: string): Sector => (PROPERTY.includes(tag) ? 'property' : STOCK.includes(tag) ? 'stock' : 'business');
function targetTags(target: string): string[] {
  if (target === 'property') return PROPERTY;
  if (target === 'stock') return STOCK;
  if (target === 'business') return BUSINESS;
  if (target === 'land') return ['TERRENO'];
  return [...PROPERTY, ...STOCK, ...BUSINESS];
}

export const flowOf = (p: Pick<Player, 'escaped' | 'passive' | 'expenses' | 'salary'>) =>
  p.escaped ? Math.max(0, p.passive - p.expenses) : p.salary + p.passive - p.expenses;
const marketValue = (S: GameState, a: Asset) => Math.round(a.baseCost * S.economy.idx[sectorOf(a.tag)] * (a.upgraded ? 1.25 : 1));
const equityOf = (S: GameState, a: Asset) => marketValue(S, a) - a.mortgage;
const upgradeCost = (a: Asset) => round100(a.cost * 0.25);
const debtOf = (p: Player) => p.debts.reduce((a, d) => a + d.balance, 0);
const loanRoom = (p: Player) => Math.floor(Math.max(0, p.salary * 10 - debtOf(p)) / 1000) * 1000;
const fastLaneIncome = (p: Player) => Math.max(15000, Math.round((flowOf(p) * 10) / 1000) * 1000);

export function createEngine(S: GameState, board?: Leaderboard) {
  // Mesas guardadas antes de estos campos
  S.settings.mode ??= 'clasico';
  S.offers ??= [];
  S.challenge ??= null;
  S.dice2 ??= 0;
  S.players.forEach((p) => { p.ledger ??= []; p.totals ??= emptyTotals(); p.series ??= []; p.dreamPaid ??= 0; p.startCash ??= p.cash; });

  /* En el reto semanal todo azar sale de la semana: mismas cartas, economía y dados para todas las mesas. */
  const rand = (stream: string) => {
    const c = S.challenge;
    if (!c) return Math.random();
    const n = c.counters[stream] ?? 0;
    c.counters[stream] = n + 1;
    return hash01(`${c.week}:${stream}:${n}`);
  };
  const log = (text: string, who?: string) => {
    S.log.unshift({ id: ++S.seq, text, who: who ?? null });
    if (S.log.length > 80) S.log.pop();
  };
  const current = () => S.players[S.turn] as Player | undefined;
  const rules = () => {
    const d = DIFFICULTY[S.settings.difficulty];
    const m = MODES[S.settings.mode];
    return { ...d, cash: d.cash * m.cash, goal: d.goal * m.goal, dream: d.dream * m.dream };
  };
  const interest = () => Math.max(4, PHASES[S.economy.phase].rate + rules().rate);
  const lentBy = (p: Player) => S.players.reduce((sum, x) => sum + x.debts.filter((d) => d.creditorId === p.id).reduce((a, d) => a + d.balance, 0), 0);
  /* Intereses que te pagan cada mes quienes te deben dinero */
  const interestIn = (p: Player) => S.players.reduce((sum, x) => sum + (x.bankrupt ? 0 : x.debts.filter((d) => d.creditorId === p.id).reduce((a, d) => a + d.payment, 0)), 0);
  const netWorth = (p: Player) => p.cash + p.assets.reduce((a, x) => a + equityOf(S, x), 0) - debtOf(p) + lentBy(p);

  /* Bonos de cartera: 3 activos de un sector, +20 % en ese sector; uno de cada sector, +10 % en todo */
  function synergies(p: Player) {
    const count = { property: 0, stock: 0, business: 0 };
    p.assets.forEach((a) => { count[sectorOf(a.tag)]++; });
    const names = { property: 'Imperio inmobiliario', stock: 'Tiburón de bolsa', business: 'Magnate' };
    return {
      count,
      diversified: count.property > 0 && count.stock > 0 && count.business > 0,
      labels: [
        ...(['property', 'stock', 'business'] as Sector[]).filter((s) => count[s] >= 3).map((s) => names[s]),
        ...(count.property > 0 && count.stock > 0 && count.business > 0 ? ['Cartera diversificada'] : []),
      ],
    };
  }

  function recompute(p: Player) {
    const { count, diversified } = synergies(p);
    const rent = PHASES[S.economy.phase].rent;
    p.passive = Math.round(p.assets.reduce((sum, a) => {
      const sector = sectorOf(a.tag);
      return sum + a.flow * (count[sector] >= 3 ? 1.2 : 1) * (diversified ? 1.1 : 1);
    }, 0) * rent);
  }

  function nextRound() {
    const e = S.economy;
    (Object.keys(e.idx) as Sector[]).forEach((sector) => {
      const phase = PHASES[e.phase];
      const noise = (rand('eco') * 2 - 1) * VOLATILITY[sector];
      e.idx[sector] = Math.min(2.6, Math.max(0.35, e.idx[sector] * (1 + (phase.drift[sector] + noise) * rules().vol)));
      e.hist[sector] = [...e.hist[sector], Math.round(e.idx[sector] * 100) / 100].slice(-12);
    });
    e.left--;
    if (e.left <= 0) {
      e.phase = PHASES[e.phase].next;
      e.left = between(PHASES[e.phase].rounds, () => rand('eco'));
      log(`📈 La economía entra en ${PHASES[e.phase].label.toLowerCase()}: ${PHASES[e.phase].hint}`);
    }
    S.players.forEach(recompute);
  }

  /* Al acabar el tiempo gana quien más ha progresado: lo ganado, medido en meses de su propio sueldo.
     Con el patrimonio a secas ganaban casi siempre las profesiones ricas (ver tools/simulate.ts). */
  const progress = (p: Player) => (p.salary > 0 ? (netWorth(p) + p.dreamPaid - p.startCash) / p.salary : 0);

  function finishByWorth() {
    const alive = S.players.filter((p) => !p.bankrupt).sort((a, b) => (S.settings.mode === 'clasico' ? netWorth(b) - netWorth(a) : progress(b) - progress(a)));
    if (!alive.length) return;
    S.phase = 'over';
    S.round = S.settings.rounds || S.round;
    S.winner = alive[0].id;
    S.pending = null;
    S.message = S.settings.mode === 'clasico'
      ? `¡Se acabó el tiempo! ${alive[0].name} gana con un patrimonio de ${clp(netWorth(alive[0]))}.`
      : `¡Se acabó el tiempo! ${alive[0].name} gana: ha ganado ${Math.round(progress(alive[0]) * 10) / 10} meses de su sueldo.`;
    log(S.message, alive[0].id);
  }

  function draw(kind: keyof GameState['decks']) {
    const deck = S.decks[kind];
    const card = deck.shift()!;
    deck.push(card);
    return card;
  }

  function takeLoan(p: Player, wanted: number) {
    const amount = Math.floor(Math.min(wanted, loanRoom(p)) / 1000) * 1000;
    if (amount <= 0) return 0;
    const rate = interest();
    const payment = Math.round((amount * rate) / 100);
    p.cash += amount;
    p.debts.push({ id: uid(), balance: amount, payment, rate, fresh: true });
    p.expenses += payment;
    log(`${p.name} pidió un préstamo de ${clp(amount)} al ${rate}% (+${clp(payment)}/mes)`, p.id);
    return amount;
  }

  function repay(p: Player, debtId: string): Result {
    const d = p.debts.find((x) => x.id === debtId);
    if (!d) return { error: 'Esa deuda ya no existe' };
    // Devolverla antes de que pase un mes no sale gratis: se paga el interés de ese mes
    const extra = d.fresh ? d.payment : 0;
    if (p.cash < d.balance + extra) return { error: 'No te alcanza para pagarla' };
    p.cash -= d.balance + extra;
    p.expenses -= d.payment;
    p.debts = p.debts.filter((x) => x.id !== debtId);
    p.totals.interest += extra;
    const lender = S.players.find((x) => x.id === d.creditorId);
    if (lender) lender.cash += d.balance + extra;
    log(`${p.name} pagó una deuda de ${clp(d.balance)}${extra ? ` (+${clp(extra)} del interés del primer mes)` : ''}`, p.id);
    checkEscape(p);
    return {};
  }

  function checkWinnerByElimination() {
    if (S.phase !== 'playing') return;
    const alive = S.players.filter((p) => !p.bankrupt);
    if (!alive.length) {
      S.phase = 'over';
      S.winner = null;
      S.pending = null;
      S.message = 'Todos en bancarrota: nadie gana esta vez.';
      log(S.message);
      return;
    }
    if (alive.length !== 1 || S.players.length < 2) return;
    S.phase = 'over';
    S.winner = alive[0].id;
    S.pending = null;
    S.message = `¡${alive[0].name} es el último en pie y GANA LA PARTIDA!`;
    log(S.message, alive[0].id);
  }

  /* Si no puedes pagar (cuotas, facturas, impuestos), primero te embargan:
     el banco se queda un activo, cancela su hipoteca y te abona el resto.
     Solo si ya no te queda nada que embargar te da un crédito de urgencia. */
  function ensureSolvent(p: Player) {
    if (p.cash >= 0) return;
    const net = (a: Asset) => Math.max(Math.round(a.down * 0.5), Math.round(marketValue(S, a) * 0.7) - a.mortgage);
    while (p.cash < 0 && p.assets.length) {
      const short = -p.cash;
      const byNet = p.assets.slice().sort((x, y) => net(x) - net(y));
      // El más barato que cubra el agujero; si ninguno basta, el que más vale
      const a = byNet.find((x) => net(x) >= short) ?? byNet[byNet.length - 1];
      const price = net(a);
      p.cash += price;
      closeLedger(p, a.id, price);
      p.assets = p.assets.filter((x) => x.id !== a.id);
      S.offers = S.offers.filter((o) => o.assetId !== a.id);
      recompute(p);
      log(`🔨 Embargo: ${p.name} no podía pagar ${clp(short)} y el banco se queda ${a.name}. Le abona ${clp(price)} tras cancelar la hipoteca.`, p.id);
    }
    if (p.cash < 0) takeLoan(p, Math.ceil(-p.cash / 1000) * 1000);
    if (p.cash < 0) {
      p.bankrupt = true;
      log(`${p.name} quedó en bancarrota y sale del juego.`, p.id);
      // Sus deudas con otros jugadores se pierden, y sus ofertas dejan de valer
      p.debts = p.debts.filter((d) => !d.creditorId);
      S.offers = S.offers.filter((o) => o.fromId !== p.id && o.toId !== p.id);
      checkWinnerByElimination();
    }
  }

  function checkEscape(p: Player) {
    if (p.escaped || p.bankrupt || p.passive < p.expenses * rules().goal) return;
    p.escaped = true;
    p.vpos = 0;
    log(`¡${p.name} salió del barrio! Sus rentas ya cubren sus gastos.`, p.id);
    S.message = `${p.name} ya vive de sus rentas. Ahora va por su Legado.`;
  }

  function buyAsset(p: Player, card: Card, kind: string) {
    const missing = card.down - p.cash;
    if (missing > 0) {
      const loan = Math.ceil(missing / 1000) * 1000;
      if (S.frozen || loan > loanRoom(p)) return false;
      takeLoan(p, loan);
    }
    p.cash -= card.down;
    addAsset(p, card, kind, card.down);
    log(`${p.name} compró ${card.name} por ${clp(card.down)} → +${clp(card.flow)}/mes`, p.id);
    return true;
  }

  function closeLedger(p: Player, assetId: string, received: number) {
    const entry = p.ledger.find((l) => l.assetId === assetId && l.open);
    if (entry) { entry.received += received; entry.open = false; }
  }

  /* Cobra un mes: lleva la cuenta de rentas e intereses y paga a quien te prestó. */
  function accrueMonth(p: Player) {
    p.assets.forEach((a) => {
      const entry = p.ledger.find((l) => l.assetId === a.id && l.open);
      if (entry) entry.rent += a.flow;
      p.totals.rent += a.flow;
    });
    p.debts.forEach((d) => {
      d.fresh = false;
      p.totals.interest += d.payment;
      const lender = S.players.find((x) => x.id === d.creditorId && !x.bankrupt);
      if (lender) lender.cash += d.payment;
    });
  }

  function addAsset(p: Player, card: Card, kind: string, paid: number) {
    const id = uid();
    p.ledger.push({ assetId: id, name: card.name, round: S.round, paid, received: 0, rent: 0, open: true });
    p.assets.push({
      id, name: card.name, tag: card.tag, cost: card.cost, baseCost: card.baseCost ?? card.cost, down: card.down,
      mortgage: Math.max(0, card.cost - card.down), flow: card.flow, kind, upgraded: false,
    });
    recompute(p);
  }

  function collectMonth(p: Player) {
    let income = flowOf(p);
    if (p.rentLost > 0) {
      p.rentLost--;
      const rents = p.assets.filter((a) => PROPERTY.includes(a.tag)).map((a) => a.flow);
      if (rents.length) {
        const lost = Math.max(...rents);
        income -= lost;
        log(`${p.name} deja de cobrar ${clp(lost)}: su propiedad sigue vacía.`, p.id);
      }
    }
    p.cash += income;
    ensureSolvent(p);
    return income;
  }

  function beginTurn() {
    const p = current();
    if (!p) return;
    S.dice = 0;
    S.dice2 = 0;
    S.pending = null;
    S.lastCard = null;
    S.skipping = false;
    if (p.bankrupt) return endTurn();
    if (p.skip > 0) {
      p.skip--;
      S.skipping = true;
      S.message = `${p.name} está en recesión: pierde el turno.`;
      log(`${p.name} perdió el turno.`, p.id);
      return;
    }
    accrueMonth(p);
    if (p.escaped) {
      const inc = fastLaneIncome(p);
      p.cash += inc;
      S.message = `${p.name} cobra ${clp(inc)} de su flujo en la Avenida del Legado.`;
      log(`${p.name} cobró ${clp(inc)} (flujo x10).`, p.id);
    } else {
      const inc = collectMonth(p);
      S.message = inc >= 0 ? `${p.name} cobra ${clp(inc)} de flujo de caja.` : `${p.name} paga ${clp(-inc)}: su flujo es negativo.`;
      log(`${p.name} cobró ${clp(inc)} de flujo.`, p.id);
    }
    p.turns++;
  }

  function endTurn() {
    S.pending = null;
    S.frozen = false;
    S.lastCard = null;
    S.dice = 0;
    S.dice2 = 0;
    if (S.phase !== 'playing') return;
    let guard = 0;
    do {
      S.turn = (S.turn + 1) % S.players.length;
      if (S.turn === 0) {
        S.round++;
        nextRound();
        S.players.forEach((x) => x.series.push(netWorth(x)));
        S.offers = S.offers.filter((o) => o.expires >= S.round);
        if (S.settings.rounds && S.round > S.settings.rounds) return finishByWorth();
        if (S.settings.rounds && S.round === S.settings.rounds) log('🏁 ¡Última ronda! Al terminar gana el mayor patrimonio.');
      }
      guard++;
    } while (S.players[S.turn].bankrupt && guard < 20);
    beginTurn();
  }

  function roll(p: Player) {
    const stream = `dice${S.players.indexOf(p)}`;
    let d = 1 + Math.floor(rand(stream) * 6);
    S.dice2 = 0;
    if (p.adv > 0) {
      // Formación: tira dos dados y se queda el mejor; el otro se enseña también
      p.adv--;
      const e = 1 + Math.floor(rand(stream) * 6);
      S.dice2 = Math.min(d, e);
      d = Math.max(d, e);
    }
    S.dice = d;
    if (p.escaped) {
      p.vpos = (p.vpos + d) % DATA.via.length;
      resolveVia(p, p.vpos);
    } else {
      p.pos = (p.pos + d) % DATA.board.length;
      resolveSpace(p, p.pos);
    }
  }

  /* El precio de cada oferta depende de cómo esté su sector hoy; la renta, no. */
  function priced(raw: Card) {
    const idx = S.economy.idx[sectorOf(raw.tag)];
    return { ...raw, baseCost: raw.cost, cost: round100(raw.cost * idx), down: round100(raw.down * idx), idx: Math.round(idx * 100) / 100 };
  }

  function offerDeal(deck: 'small' | 'big', message: string) {
    const card = priced(draw(deck));
    S.lastCard = { kind: deck, ...card };
    S.pending = { type: 'deal', card, deck };
    S.message = message;
  }

  function resolveSpace(p: Player, pos: number) {
    const kind = DATA.board[pos].kind;
    if (kind === 'cobrar') {
      const inc = collectMonth(p);
      S.message = `${p.name} cayó en NÓMINA: ${inc >= 0 ? 'cobra' : 'paga'} ${clp(Math.abs(inc))} extra.`;
      log(`${p.name} cobró un mes extra (${clp(inc)}).`, p.id);
    } else if (kind === 'gusto') {
      const c = draw('gusto');
      S.lastCard = { kind: 'gusto', ...c };
      p.cash -= c.amount; // amount > 0 es un gasto; amount < 0, un ahorro
      if (c.amount > 0) p.totals.gustos += c.amount;
      if (c.fixed) p.expenses += c.fixed;
      S.message = c.amount >= 0
        ? `${p.name}: ${c.name} → paga ${clp(c.amount)}${c.fixed ? ` y +${clp(c.fixed)}/mes` : ''}`
        : `${p.name}: ${c.name} → cobra ${clp(-c.amount)}`;
      log(S.message, p.id);
      ensureSolvent(p);
    } else if (kind === 'mercado') {
      const c = draw('market');
      S.lastCard = { kind: 'market', ...c };
      applyMarket(p, c);
    } else if (kind === 'banco') {
      S.pending = { type: 'bank' };
      S.message = `${p.name} está en el banco: préstamo o caridad.`;
    } else if (kind === 'impuesto') {
      const tax = Math.round((Math.max(0, p.salary + p.passive) * 0.15) / 100) * 100;
      p.cash -= tax;
      p.totals.taxes += tax;
      S.message = `${p.name} pasa por Hacienda: paga ${clp(tax)} de impuestos.`;
      log(S.message, p.id);
      ensureSolvent(p);
    } else if (kind === 'formacion') {
      const fee = 1000;
      if (p.cash >= fee) {
        p.cash -= fee;
        p.adv = Math.max(p.adv, 3);
        S.message = `${p.name} hace un curso (${clp(fee)}): sus próximas 3 tiradas son la mejor de dos dados.`;
      } else {
        S.message = `${p.name} no tiene ${clp(fee)} para el curso de formación.`;
      }
      log(S.message, p.id);
    } else if (kind === 'imprevisto') {
      const [bill, cost] = ([['Avería del coche', 1200], ['Urgencia médica', 2000], ['Reparación del hogar', 1500], ['Multa de tráfico', 800]] as const)[Math.floor(rand('bill') * 4)];
      if (p.assets.some((a) => a.tag === 'PROTECCIÓN')) {
        S.message = `${p.name}: ${bill} (${clp(cost)}), pero su seguro lo cubre.`;
      } else {
        p.cash -= cost;
        p.totals.bills += cost;
        S.message = `${p.name}: ${bill}. Paga ${clp(cost)}. Un activo de PROTECCIÓN lo habría cubierto.`;
        ensureSolvent(p);
      }
      log(S.message, p.id);
    } else if (kind === 'peq') {
      offerDeal('small', `${p.name} tiene una oportunidad: ¿compra o pasa?`);
    } else if (kind === 'grande') {
      offerDeal('big', `${p.name} tiene una gran oportunidad: ¿compra o pasa?`);
    }
  }

  function resolveVia(p: Player, pos: number) {
    const kind = DATA.via[pos].kind;
    if (kind === 'cobrar') {
      const inc = fastLaneIncome(p);
      p.cash += inc;
      S.message = `${p.name} cobra ${clp(inc)} en la Avenida del Legado.`;
      log(`${p.name} cobró ${clp(inc)} (Avenida del Legado).`, p.id);
    } else if (kind === 'sueno') {
      const raw = draw('dream');
      const c: Card = { ...raw, cost: round100(raw.cost * rules().dream) };
      S.lastCard = { kind: 'dream', ...c };
      S.pending = { type: 'dream', card: c };
      S.message = `${p.name}: ${c.name} cuesta ${clp(c.cost)}. ¿Lo compra?`;
    } else if (kind === 'mercado') {
      const c = draw('market');
      S.lastCard = { kind: 'market', ...c };
      applyMarket(p, c);
    } else if (kind === 'peq') {
      offerDeal('big', `${p.name} tiene una oportunidad en la Avenida del Legado.`);
    } else if (kind === 'banco') {
      const cut = Math.round((p.cash * 0.1) / 100) * 100;
      p.cash -= cut;
      S.message = `${p.name} pasó por auditoría: paga ${clp(cut)}.`;
      log(S.message, p.id);
    }
  }

  function applyMarket(p: Player, c: Card) {
    const e = c.effect || { type: 'none' };
    const say = (text: string) => { S.message = text; log(text, p.id); };
    if (e.type === 'sell' || e.type === 'rent') {
      const tags = targetTags(e.target);
      const options = p.assets.filter((a) => tags.includes(a.tag)).map((a) => a.id);
      if (!options.length) return say(`${c.name}: ${p.name} no tiene activos para esta carta.`);
      if (e.type === 'sell') {
        S.pending = { type: 'sell', card: c, mult: e.mult, options, optional: !!e.optional };
        S.message = `${c.name}: ${p.name} elige qué vender (x${e.mult}).`;
      } else {
        S.pending = { type: 'rent', card: c, pct: e.pct, options };
        S.message = `${c.name}: ${p.name} elige la propiedad que sube ${e.pct}%.`;
      }
    } else if (e.type === 'cash_flow_months') {
      const inc = Math.round(p.passive * e.months);
      p.cash += inc;
      say(`${c.name}: ${p.name} cobra ${clp(inc)}.`);
    } else if (e.type === 'cash') {
      p.cash += e.amount;
      say(`${c.name}: ${p.name} ${e.amount >= 0 ? 'cobra' : 'paga'} ${clp(Math.abs(e.amount))}.`);
    } else if (e.type === 'all_pay') {
      say(`${c.name}: todos pagan ${clp(e.amount)}.`);
      S.players.filter((x) => !x.bankrupt).forEach((x) => { x.cash -= e.amount; ensureSolvent(x); });
    } else if (e.type === 'inflation') {
      // Sube el coste de vida, no las cuotas de las deudas (si no, el recargo se quedaba al liquidarlas)
      const payments = p.debts.reduce((sum, d) => sum + d.payment, 0);
      p.expenses = Math.ceil(((p.expenses - payments) * (1 + e.pct / 100)) / 100) * 100 + payments;
      say(`${c.name}: los gastos de ${p.name} suben a ${clp(p.expenses)}/mes.`);
    } else if (e.type === 'skip') {
      p.skip = 1;
      p.cash += e.amount;
      say(`${c.name}: ${p.name} pierde el próximo turno y paga ${clp(-e.amount)}.`);
      ensureSolvent(p);
    } else if (e.type === 'freeze') {
      S.frozen = true;
      say(`${c.name}: nadie puede pedir préstamos este turno.`);
    } else if (e.type === 'rent_lost') {
      p.rentLost = e.turns;
      say(`${c.name}: una propiedad de ${p.name} queda vacía ${e.turns} turnos.`);
    } else if (e.type === 'draw_big') {
      offerDeal('big', `${c.name}: oportunidad grande anticipada.`);
    } else {
      say(`${c.name}: acordadlo en la mesa y seguid.`);
    }
  }

  function start(): Result {
    if (S.phase !== 'lobby') return { error: 'La partida ya empezó' };
    const needed = S.settings.mode === 'reto' ? 1 : MIN_PLAYERS;
    if (S.players.length < needed) return { error: `Hacen falta al menos ${needed} jugadores` };
    S.challenge = S.settings.mode === 'reto' ? { week: weekId(), counters: {}, recorded: false } : null;
    const professions = shuffle(DATA.professions, () => rand('deck'));
    S.decks = freshDecks(() => rand('deck'));
    S.economy = newEconomy(() => rand('eco'));
    S.offers = [];
    S.players.forEach((pl, i) => {
      const pr = professions[i % professions.length];
      Object.assign(pl, {
        profession: pr.name, salary: pr.salary, expenses: pr.expenses, note: pr.note,
        // Fuera del clásico todos empiezan con los mismos meses de sueldo: el efectivo de partida decidía demasiado
        cash: S.settings.mode === 'clasico' ? Math.round(pr.cash * rules().cash) : round100(pr.salary * 2.4 * DIFFICULTY[S.settings.difficulty].cash),
        passive: 0, assets: [], debts: [], pos: 0, vpos: 0, escaped: false, bankrupt: false,
        skip: 0, adv: 0, rentLost: 0, turns: 0, ledger: [], totals: emptyTotals(), dreamPaid: 0,
      });
      pl.series = [pl.cash];
      pl.startCash = pl.cash;
    });
    S.phase = 'playing';
    S.turn = 0;
    S.round = 1;
    log('La partida comenzó. Cada quien recibe su profesión.');
    beginTurn();
    return {};
  }

  function reset(): Result {
    Object.assign(S, {
      phase: 'lobby', turn: 0, round: 1, winner: null, log: [], pending: null, lastCard: null, dice: 0, dice2: 0,
      frozen: false, skipping: false, message: 'Nueva partida: esperando jugadores…', decks: freshDecks(), economy: newEconomy(), offers: [], challenge: null,
    });
    return {};
  }

  function adminAction(type: string, payload: any): Result {
    if (type === 'start') return start();
    if (type === 'settings') {
      if (S.phase !== 'lobby') return { error: 'La partida ya empezó' };
      if (payload.mode in MODES) {
        S.settings.mode = payload.mode;
        S.settings.rounds = MODES[payload.mode as GameMode].rounds;
        if (payload.mode === 'reto') S.settings.difficulty = 'normal';
      }
      // El reto es igual para todos: ni dificultad ni duración se tocan
      if (S.settings.mode !== 'reto') {
        if (payload.difficulty in DIFFICULTY) S.settings.difficulty = payload.difficulty;
        if (ROUND_LIMITS.includes(payload.rounds)) S.settings.rounds = payload.rounds;
      }
      return {};
    }
    if (type === 'reset') return reset();
    if (type === 'skipTurn') {
      if (S.phase !== 'playing') return { error: 'No hay partida en curso' };
      log(`El admin saltó el turno de ${current()?.name}.`);
      endTurn();
      return {};
    }
    if (type === 'kick') {
      if (S.phase !== 'lobby') return { error: 'Solo se puede en la sala de espera' };
      S.players = S.players.filter((x) => x.id !== payload.playerId);
      return {};
    }
    return { error: 'Acción no disponible' };
  }

  /* Quien pasa de una oferta la saca a subasta y se queda la prima que paguen por encima del precio. */
  function openAuction(seller: Player, card: Card, deck: 'small' | 'big') {
    const eligible = S.players.filter((x) => x.id !== seller.id && !x.bankrupt && x.cash >= card.down).map((x) => x.id);
    if (!eligible.length) return false;
    S.pending = { type: 'auction', card, deck, sellerId: seller.id, eligible, bids: {}, answered: [], deadline: Date.now() + 20000 };
    S.message = `¡Subasta! ${card.name}: pujas desde ${clp(card.down)}.`;
    log(`${seller.name} saca a subasta ${card.name}.`, seller.id);
    return true;
  }

  function closeAuction() {
    const a = S.pending;
    if (a?.type !== 'auction') return;
    S.pending = null;
    const best = Object.entries(a.bids).sort((x, y) => y[1] - x[1])[0];
    const winner = best && S.players.find((x) => x.id === best[0]);
    const seller = S.players.find((x) => x.id === a.sellerId);
    if (!winner || winner.cash < best[1]) {
      S.message = `Nadie pujó por ${a.card.name}. Vuelve al mazo.`;
      log(S.message);
      return;
    }
    winner.cash -= best[1];
    addAsset(winner, a.card, a.deck, best[1]);
    const premium = best[1] - a.card.down;
    if (seller) seller.cash += premium;
    S.message = `${winner.name} gana la subasta de ${a.card.name} por ${clp(best[1])}${premium > 0 && seller ? `; ${seller.name} se lleva ${clp(premium)} de prima` : ''}.`;
    log(S.message, winner.id);
    checkEscape(winner);
  }

  function bid(p: Player, payload: any): Result {
    const a = S.pending;
    if (a?.type !== 'auction') return { error: 'No hay subasta abierta' };
    if (!a.eligible.includes(p.id) || a.answered.includes(p.id)) return { error: 'No puedes pujar ahora' };
    const amount = Number(payload.amount) || 0;
    if (amount > 0) {
      if (amount < a.card.down) return { error: 'La puja es menor que el precio' };
      if (amount > p.cash) return { error: 'No tienes tanto efectivo' };
      a.bids[p.id] = Math.round(amount);
    }
    a.answered.push(p.id);
    if (a.answered.length === a.eligible.length) closeAuction();
    return {};
  }

  /* ---------- Tratos entre jugadores: se pueden proponer y aceptar fuera de tu turno ---------- */
  function makeOffer(p: Player, payload: any): Result {
    if (p.bankrupt) return { error: 'Estás fuera de la partida' };
    const to = S.players.find((x) => x.id === payload.toId);
    if (!to || to.id === p.id || to.bankrupt) return { error: 'Elige a otro jugador en activo' };
    if (S.offers.filter((o) => o.fromId === p.id).length >= MAX_OPEN_OFFERS) return { error: `Máximo ${MAX_OPEN_OFFERS} ofertas abiertas` };
    const kind = payload.kind as Offer['kind'];
    const amount = Math.round(Number(payload.amount) || 0);
    if (amount < 100 || amount > 10000000) return { error: 'Pon una cantidad válida' };
    const offer: Offer = { id: uid(), kind, fromId: p.id, toId: to.id, amount, expires: S.round + 2 };
    if (kind === 'sell' || kind === 'buy') {
      const asset = (kind === 'sell' ? p : to).assets.find((a) => a.id === payload.assetId);
      if (!asset) return { error: 'Ese activo no está disponible' };
      offer.assetId = asset.id;
      offer.assetName = asset.name;
      if (kind === 'buy' && p.cash < amount) return { error: 'No tienes tanto efectivo' };
    } else if (kind === 'lend' || kind === 'borrow') {
      const rate = Math.round(Number(payload.rate) || 0);
      if (rate < 1 || rate > 30) return { error: 'El interés debe estar entre 1 % y 30 %' };
      offer.rate = rate;
      if (kind === 'lend' && p.cash < amount) return { error: 'No tienes tanto efectivo' };
    } else {
      return { error: 'Tipo de trato desconocido' };
    }
    S.offers.push(offer);
    log(`🤝 ${p.name} propone un trato a ${to.name}: ${offerText(offer)}.`, p.id);
    return {};
  }

  function offerText(o: Offer) {
    if (o.kind === 'sell') return `vende ${o.assetName} por ${clp(o.amount)}`;
    if (o.kind === 'buy') return `compra ${o.assetName} por ${clp(o.amount)}`;
    if (o.kind === 'lend') return `presta ${clp(o.amount)} al ${o.rate}% mensual`;
    return `pide prestados ${clp(o.amount)} al ${o.rate}% mensual`;
  }

  function acceptOffer(p: Player, payload: any): Result {
    const o = S.offers.find((x) => x.id === payload.offerId);
    if (!o || o.toId !== p.id) return { error: 'Esa oferta ya no existe' };
    const from = S.players.find((x) => x.id === o.fromId);
    if (!from || from.bankrupt || p.bankrupt) return { error: 'Esa oferta ya no vale' };
    const fail = (error: string) => { S.offers = S.offers.filter((x) => x.id !== o.id); return { error }; };
    if (o.kind === 'sell' || o.kind === 'buy') {
      const [seller, buyer] = o.kind === 'sell' ? [from, p] : [p, from];
      const asset = seller.assets.find((a) => a.id === o.assetId);
      if (!asset) return fail('Ese activo ya no está disponible');
      if (buyer.cash < o.amount) return fail(`${buyer.name} no tiene efectivo suficiente`);
      buyer.cash -= o.amount;
      seller.cash += o.amount;
      closeLedger(seller, asset.id, o.amount);
      seller.assets = seller.assets.filter((a) => a.id !== asset.id);
      buyer.assets.push(asset);
      buyer.ledger.push({ assetId: asset.id, name: asset.name, round: S.round, paid: o.amount, received: 0, rent: 0, open: true });
      // Si el activo estaba en una decisión pendiente, deja de ser una opción
      const pending = S.pending;
      if (pending?.type === 'sell' || pending?.type === 'rent') {
        pending.options = pending.options.filter((id) => id !== asset.id);
        if (!pending.options.length) S.pending = null;
      }
      S.offers = S.offers.filter((x) => x.assetId !== asset.id);
      recompute(seller);
      recompute(buyer);
      checkEscape(buyer);
      log(`🤝 ${seller.name} vende ${asset.name} a ${buyer.name} por ${clp(o.amount)}.`, buyer.id);
    } else {
      const [lender, borrower] = o.kind === 'lend' ? [from, p] : [p, from];
      if (lender.cash < o.amount) return fail(`${lender.name} no tiene efectivo suficiente`);
      const payment = Math.round((o.amount * o.rate!) / 100);
      lender.cash -= o.amount;
      borrower.cash += o.amount;
      borrower.debts.push({ id: uid(), balance: o.amount, payment, rate: o.rate!, creditorId: lender.id, creditor: lender.name, fresh: true });
      borrower.expenses += payment;
      S.offers = S.offers.filter((x) => x.id !== o.id);
      log(`🤝 ${lender.name} presta ${clp(o.amount)} a ${borrower.name} al ${o.rate}% (+${clp(payment)}/mes).`, borrower.id);
    }
    S.message = `Trato cerrado entre ${from.name} y ${p.name}.`;
    return {};
  }

  function dropOffer(p: Player, payload: any): Result {
    const o = S.offers.find((x) => x.id === payload.offerId);
    if (!o || (o.toId !== p.id && o.fromId !== p.id)) return { error: 'Esa oferta ya no existe' };
    S.offers = S.offers.filter((x) => x.id !== o.id);
    if (o.toId === p.id) log(`${p.name} rechazó un trato.`, p.id);
    return {};
  }

  /* ---------- Informe final ---------- */
  function buildReport() {
    return S.players.map((p) => {
      const results = p.ledger.map((l) => {
        const held = l.open ? p.assets.find((a) => a.id === l.assetId) : undefined;
        return { name: l.name, round: l.round, gain: Math.round(l.received + l.rent + (held ? equityOf(S, held) : 0) - l.paid) };
      }).sort((a, b) => b.gain - a.gain);
      const t = p.totals;
      const best = results[0] ?? null;
      const worst = results.length > 1 ? results[results.length - 1] : null;
      const cover = p.expenses > 0 ? Math.round((p.passive / p.expenses) * 100) : 100;
      let lesson = p.escaped
        ? 'Tus rentas pagaron la vida: es la idea central del juego.'
        : `Tus rentas cubrían el ${cover} % de tus gastos: te faltó comprar activos antes o más baratos.`;
      if (!results.length) lesson = 'No compraste ningún activo: sin rentas, solo te queda la nómina.';
      else if (t.interest > t.rent) lesson = 'Pagaste más en intereses que lo que cobraste en rentas: la deuda solo ayuda si el activo renta más de lo que cuesta.';
      else if (t.gustos > t.rent) lesson = 'Tus caprichos costaron más de lo que rentaron tus activos.';
      else if (p.bankrupt) lesson = 'La bancarrota suele llegar por falta de efectivo, no de patrimonio: guarda un colchón.';
      return { id: p.id, name: p.name, series: [...p.series, netWorth(p)], best, worst, totals: t, lesson };
    });
  }

  function recordChallenge() {
    const c = S.challenge;
    if (!c || c.recorded || S.phase !== 'over') return;
    c.recorded = true;
    board?.add(c.week, S.players.filter((p) => !p.bankrupt).map((p) => ({ name: p.name, avatar: p.avatar, profession: p.profession, score: Math.round(progress(p) * 10) / 10 })));
  }

  function playerAction(p: Player, type: string, payload: any): Result {
    if (S.phase !== 'playing') return { error: 'No hay partida en curso' };
    if (type === 'bid') return bid(p, payload);
    if (type === 'offer') return makeOffer(p, payload);
    if (type === 'acceptOffer') return acceptOffer(p, payload);
    if (type === 'dropOffer') return dropOffer(p, payload);
    if (current()?.id !== p.id) return { error: 'No es tu turno' };
    const pending = S.pending;

    switch (type) {
      case 'roll':
        if (S.skipping) return { error: 'Pierdes este turno' };
        if (pending || S.dice) return { error: 'Ya tiraste el dado' };
        roll(p);
        return {};
      case 'buy': {
        if (pending?.type !== 'deal') return { error: 'No hay oferta' };
        if (!buyAsset(p, pending.card, pending.deck)) return { error: 'No te alcanza ni con préstamo' };
        S.message = `${p.name} compró ${pending.card.name}.`;
        S.pending = null;
        checkEscape(p);
        return {};
      }
      case 'pass':
        if (!pending || pending.type === 'auction') return {};
        if (pending.type === 'deal') {
          if (openAuction(p, pending.card, pending.deck)) return {};
          log(`${p.name} pasó la oportunidad.`, p.id);
        }
        S.message = {
          deal: `${p.name} pasó. La carta vuelve al mazo.`,
          sell: `${p.name} mantiene sus activos.`,
          dream: `${p.name} no compró su Legado todavía.`,
          bank: `${p.name} pasó por el banco sin operar.`,
          rent: `${p.name} no ajustó rentas.`,
        }[pending.type];
        S.pending = null;
        return {};
      case 'choose': {
        if (pending?.type !== 'sell' && pending?.type !== 'rent') return { error: 'Nada que elegir' };
        const a = p.assets.find((x) => x.id === payload.assetId);
        if (!a || !pending.options.includes(a.id)) return { error: 'Activo inválido' };
        if (pending.type === 'sell') {
          const price = Math.max(0, Math.round(a.cost * pending.mult) - a.mortgage);
          p.cash += price;
          closeLedger(p, a.id, price);
          p.assets = p.assets.filter((x) => x.id !== a.id);
          recompute(p);
          S.message = `${p.name} vendió ${a.name} por ${clp(price)}.`;
        } else {
          const inc = Math.round((a.flow * pending.pct) / 100);
          a.flow += inc;
          recompute(p);
          S.message = `${a.name} sube su renta ${pending.pct}% (+${clp(inc)}/mes).`;
        }
        log(S.message, p.id);
        S.pending = null;
        checkEscape(p);
        return {};
      }
      case 'dream': {
        if (pending?.type !== 'dream') return { error: 'No hay Legado' };
        if (p.cash < pending.card.cost) return { error: 'No te alcanza' };
        p.cash -= pending.card.cost;
        p.dreamPaid = pending.card.cost;
        S.phase = 'over';
        S.winner = p.id;
        S.message = `¡${p.name} compró ${pending.card.name} y GANÓ LA PARTIDA!`;
        S.pending = null;
        log(S.message, p.id);
        return {};
      }
      case 'sell': {
        if (pending) return { error: 'Resuelve primero lo pendiente' };
        const a = p.assets.find((x) => x.id === payload.assetId);
        if (!a) return { error: 'Activo inválido' };
        const equity = equityOf(S, a);
        if (p.cash + equity < 0) return { error: 'No puedes cubrir la hipoteca de esta venta' };
        p.cash += equity;
        closeLedger(p, a.id, equity);
        p.assets = p.assets.filter((x) => x.id !== a.id);
        recompute(p);
        S.message = `${p.name} vendió ${a.name} a precio de mercado: ${equity >= 0 ? 'cobra' : 'paga'} ${clp(Math.abs(equity))}.`;
        log(S.message, p.id);
        return {};
      }
      case 'upgrade': {
        if (pending) return { error: 'Resuelve primero lo pendiente' };
        const a = p.assets.find((x) => x.id === payload.assetId);
        if (!a || a.upgraded) return { error: 'Este activo ya está mejorado' };
        const cost = upgradeCost(a);
        if (p.cash < cost) return { error: 'No te alcanza' };
        p.cash -= cost;
        const entry = p.ledger.find((l) => l.assetId === a.id && l.open);
        if (entry) entry.paid += cost;
        a.upgraded = true;
        a.flow = Math.round(a.flow * 1.35);
        recompute(p);
        S.message = `${p.name} mejoró ${a.name}: ahora renta ${clp(a.flow)}/mes.`;
        log(S.message, p.id);
        checkEscape(p);
        return {};
      }
      case 'loan': {
        if (S.frozen) return { error: 'Crédito congelado este turno' };
        const got = takeLoan(p, Math.min(Number(payload.amount) || 0, 200000));
        if (!got) return { error: 'El banco no te presta más' };
        S.message = `${p.name} pidió ${clp(got)} al banco.`;
        return {};
      }
      case 'repay':
        return repay(p, payload.debtId);
      case 'donate': {
        if (pending?.type !== 'bank') return { error: 'Solo en la casilla de banco' };
        const amount = Math.round(p.salary * 0.1);
        if (p.cash < amount) return { error: 'No te alcanza' };
        p.cash -= amount;
        p.adv = 3;
        S.pending = null;
        S.message = `${p.name} donó ${clp(amount)}: 3 turnos con dos dados.`;
        log(S.message, p.id);
        return {};
      }
      case 'end':
        if (pending) return { error: 'Tienes una decisión pendiente' };
        if (!S.dice && !S.skipping && !p.bankrupt) return { error: 'Primero tira el dado' };
        endTurn();
        return {};
      default:
        return { error: 'Acción desconocida' };
    }
  }

  return {
    state: S,

    join(name: string, avatar: string) {
      if (S.phase !== 'lobby') return { error: 'La partida ya comenzó' };
      if (S.players.length >= MAX_PLAYERS) return { error: 'La mesa está llena' };
      const taken = S.players.map((p) => p.avatar);
      const color = COLORS.find((c) => !S.players.some((p) => p.color === c))!;
      const chosen = AVATARS.includes(avatar) && !taken.includes(avatar) ? avatar : AVATARS.find((a) => !taken.includes(a))!;
      const player: Player = {
        id: uid(), token: secret(), name: name.trim().slice(0, 14) || 'Jugador', avatar: chosen, color,
        profession: '', note: '', salary: 0, expenses: 0, cash: 0, passive: 0, assets: [], debts: [],
        pos: 0, vpos: 0, escaped: false, bankrupt: false, skip: 0, adv: 0, rentLost: 0, turns: 0,
        ledger: [], totals: emptyTotals(), series: [], dreamPaid: 0, startCash: 0,
      };
      S.players.push(player);
      S.message = `${S.players.length} en la mesa.`;
      return { playerId: player.id, token: player.token };
    },

    /* Cierra las subastas cuyo tiempo acabó; devuelve true si algo cambió */
    tick() {
      const a = S.pending;
      if (S.phase !== 'playing' || a?.type !== 'auction' || Date.now() < a.deadline) return false;
      closeAuction();
      recordChallenge();
      return true;
    },

    act(credentials: { playerId?: string; token?: string }, type: string, payload: any = {}): Result {
      const p = S.players.find((x) => x.id === credentials.playerId);
      if (!p || p.token !== credentials.token) return { error: 'Sesión inválida' };
      if (ADMIN_ACTIONS.includes(type)) {
        // El primero en sentarse a la mesa es quien la maneja.
        if (S.players[0].id !== p.id) return { error: 'Solo el admin puede hacer esto' };
        const out = adminAction(type, payload ?? {});
        recordChallenge();
        return out;
      }
      const out = playerAction(p, type, payload ?? {});
      recordChallenge();
      return out;
    },

    snapshot() {
      return {
        code: S.code, tv: S.tv, phase: S.phase, turn: S.turn, round: S.round, dice: S.dice, dice2: S.dice2, frozen: S.frozen,
        skipping: S.skipping, adminId: S.players[0]?.id ?? null, settings: S.settings,
        economy: {
          phase: S.economy.phase, label: PHASES[S.economy.phase].label, hint: PHASES[S.economy.phase].hint, rate: interest(),
          idx: S.economy.idx, hist: S.economy.hist,
        },
        pending: S.pending?.type === 'auction'
          ? { type: 'auction' as const, card: S.pending.card, deck: S.pending.deck, sellerId: S.pending.sellerId, eligible: S.pending.eligible, answered: S.pending.answered, endsIn: Math.max(0, S.pending.deadline - Date.now()) }
          : (S.pending as Exclude<Pending, { type: 'auction' }> | null), lastCard: S.lastCard, message: S.message, winner: S.winner,
        log: S.log.slice(0, 40),
        offers: S.offers,
        report: S.phase === 'over' ? buildReport() : null,
        week: S.settings.mode === 'reto' ? (S.challenge?.week ?? weekId()) : null,
        leaderboard: S.settings.mode === 'reto' ? (board?.top(S.challenge?.week ?? weekId()) ?? []) : [],
        players: S.players.map((p) => ({
          id: p.id, name: p.name, avatar: p.avatar, color: p.color, profession: p.profession, note: p.note,
          salary: p.salary, expenses: p.expenses, cash: p.cash, passive: p.passive, debts: p.debts,
          assets: p.assets.map((a) => ({ ...a, value: marketValue(S, a), equity: equityOf(S, a), upgradeCost: upgradeCost(a) })),
          netWorth: netWorth(p), progress: Math.round(progress(p) * 10) / 10, synergies: synergies(p).labels, freedom: Math.min(1, p.expenses > 0 ? p.passive / (p.expenses * rules().goal) : 0),
          goal: Math.round(p.expenses * rules().goal),
          escaped: p.escaped, bankrupt: p.bankrupt, pos: p.pos, vpos: p.vpos, skip: p.skip, adv: p.adv,
          turns: p.turns, flow: flowOf(p) + interestIn(p), interestIn: interestIn(p), loanRoom: loanRoom(p),
        })),
      };
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
export type Snapshot = ReturnType<Engine['snapshot']>;
export type PlayerView = Snapshot['players'][number];

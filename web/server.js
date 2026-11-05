/* FLUJO LIBRE - servidor local del juego (sin dependencias) */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));

const COLORS = ['#C2452D', '#2E6E6B', '#D99A1F', '#7A4E6E', '#44586B', '#3F7A4A'];
const HOST = { id: '__host__', token: Math.random().toString(36).slice(2) + Date.now().toString(36) };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// ---------------------------------------------------------------- estado
const S = {
  code: 'FLUJO',
  phase: 'lobby',          // lobby | playing | over
  players: [],
  turn: 0,
  round: 1,
  dice: 0,
  frozen: false,
  pending: null,
  lastCard: null,
  message: 'Esperando jugadores…',
  winner: null,
  log: [],
  seq: 0,
};

const DECKS = {};
function shuffleDecks() {
  const sh = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  DECKS.small = sh(DATA.small);
  DECKS.big = sh(DATA.big);
  DECKS.market = sh(DATA.market);
  DECKS.gusto = sh(DATA.gusto);
  DECKS.dream = sh(DATA.dreams);
}
shuffleDecks();

// ---------------------------------------------------------------- helpers
const num = (n) => Math.round(n);
const clp = (n) => '$' + Math.round(n).toLocaleString('es-CO');
function log(text, who) {
  S.log.unshift({ id: ++S.seq, text, who: who || null, t: Date.now() });
  if (S.log.length > 80) S.log.pop();
}
const player = (id) => S.players.find(p => p.id === id);
const current = () => S.players[S.turn];

function flowOf(p) {
  if (p.escaped) return Math.max(0, p.passive - p.expenses);
  return p.salary + p.passive - p.expenses;
}
function freedomNum(p) { return p.expenses; }

function draw(kind) {
  const d = DECKS[kind];
  if (!d.length) return null;
  const c = d.shift();
  d.push(c);
  return c;
}

function takeLoan(p, amount) {
  const maxLoan = p.salary * 10;
  const debt = p.debts.reduce((a, d) => a + d.balance, 0);
  const room = Math.max(0, maxLoan - debt);
  amount = Math.min(amount, room);
  amount = Math.floor(amount / 1000) * 1000;
  if (amount <= 0) return 0;
  p.cash += amount;
  p.debts.push({ id: uid(), balance: amount, payment: Math.round(amount * 0.1) });
  p.expenses += Math.round(amount * 0.1);
  log(`${p.name} pidió un préstamo de ${clp(amount)} (+${clp(Math.round(amount * 0.1))}/mes)`, p.id);
  return amount;
}

function repay(p, debtId) {
  const d = p.debts.find(x => x.id === debtId);
  if (!d || p.cash < d.balance) return;
  p.cash -= d.balance;
  p.expenses -= d.payment;
  p.debts = p.debts.filter(x => x.id !== debtId);
  log(`${p.name} pagó una deuda de ${clp(d.balance)}`, p.id);
}

function ensureSolvent(p) {
  if (p.cash >= 0) return true;
  const need = -p.cash;
  const got = takeLoan(p, Math.ceil(need / 1000) * 1000);
  if (p.cash < 0) {
    // vende activos al 50% hasta cubrir
    while (p.cash < 0 && p.assets.length) {
      const a = p.assets.slice().sort((x, y) => x.cost - y.cost)[0];
      p.cash += Math.round(a.cost * 0.5);
      p.passive -= a.flow;
      p.assets = p.assets.filter(x => x.id !== a.id);
      log(`${p.name} vendió ${a.name} de emergencia al 50% (${clp(Math.round(a.cost * 0.5))})`, p.id);
    }
  }
  if (p.cash < 0) { p.bankrupt = true; log(`${p.name} quedó en bancarrota y sale del juego.`, p.id); }
  return got > 0 || p.cash >= 0;
}

function checkEscape(p) {
  if (p.escaped || p.bankrupt) return;
  if (p.passive >= p.expenses) {
    p.escaped = true;
    p.vpos = 0;
    log(`¡${p.name} salió de la ratonera! Sus rentas ya cubren sus gastos.`, p.id);
    S.message = `${p.name} es financieramente libre. Ahora va por su Sueño.`;
  }
}

function buyAsset(p, card, kind) {
  if (p.cash < card.down) {
    const falta = card.down - p.cash;
    takeLoan(p, Math.ceil(falta / 1000) * 1000);
  }
  if (p.cash < card.down) return false;
  p.cash -= card.down;
  p.assets.push({ id: uid(), name: card.name, tag: card.tag, cost: card.cost,
    down: card.down, flow: card.flow, kind });
  p.passive += card.flow;
  log(`${p.name} compró ${card.name} por ${clp(card.down)} → +${clp(card.flow)}/mes`, p.id);
  checkEscape(p);
  return true;
}

function sellAsset(p, assetId, mult) {
  const a = p.assets.find(x => x.id === assetId);
  if (!a) return 0;
  const price = Math.round(a.cost * mult);
  p.cash += price;
  p.passive -= a.flow;
  p.assets = p.assets.filter(x => x.id !== a.id);
  log(`${p.name} vendió ${a.name} por ${clp(price)}`, p.id);
  return price;
}

function uid() { return Math.random().toString(36).slice(2, 9); }
function targetTags(target) {
  const P = ['VIVIENDA', 'COMERCIAL', 'INDUSTRIAL', 'TURISMO', 'TERRENO', 'ENERGÍA', 'AGRO'];
  const S2 = ['BOLSA', 'RENTA FIJA', 'COLECTIVO', 'PROTECCIÓN', 'VOLÁTIL', 'REGALÍAS', 'CRIPTO'];
  const B = ['NEGOCIO', 'FRANQUICIA', 'SOCIEDAD', 'SERVICIO', 'DIGITAL'];
  if (target === 'property') return P;
  if (target === 'stock') return S2;
  if (target === 'business') return B;
  if (target === 'land') return ['TERRENO'];
  return P.concat(S2, B);
}

// ---------------------------------------------------------------- turno
function beginTurn() {
  const p = current();
  if (!p) return;
  S.dice = 0;
  S.pending = null;
  S.lastCard = null;
  if (p.bankrupt) { return endTurn(); }
  if (p.skip > 0) {
    p.skip--;
    S.message = `${p.name} está en recesión: pierde el turno.`;
    log(`${p.name} perdió el turno.`, p.id);
    return; // debe pulsar "terminar"
  }
  // cobro de inicio de turno
  if (p.escaped) {
    const inc = Math.max(15000, Math.round(flowOf(p) * 10 / 1000) * 1000);
    p.cash += inc;
    S.message = `${p.name} cobra ${clp(inc)} de su flujo en la vía rápida.`;
    log(`${p.name} cobró ${clp(inc)} (flujo x10).`, p.id);
  } else {
    const inc = flowOf(p);
    p.cash += inc;
    ensureSolvent(p);
    S.message = inc >= 0
      ? `${p.name} cobra ${clp(inc)} de flujo de caja.`
      : `${p.name} paga ${clp(-inc)}: su flujo es negativo.`;
    log(`${p.name} cobró ${clp(inc)} de flujo.`, p.id);
  }
  p.turns++;
}

function endTurn() {
  S.pending = null;
  S.frozen = false;
  S.lastCard = null;
  S.dice = 0;
  if (S.phase !== 'playing') return;
  let guard = 0;
  do {
    S.turn = (S.turn + 1) % S.players.length;
    if (S.turn === 0) S.round++;
    guard++;
  } while (S.players[S.turn].bankrupt && guard < 20);
  beginTurn();
}

function roll() {
  const p = current();
  if (S.pending || S.dice) return;
  let d = 1 + Math.floor(Math.random() * 6);
  if (p.adv > 0) { p.adv--; d = Math.max(d, 1 + Math.floor(Math.random() * 6)); }
  S.dice = d;
  if (p.escaped) {
    p.vpos = (p.vpos + d) % 12;
    resolveVia(p, p.vpos);
  } else {
    p.pos = (p.pos + d) % 24;
    resolveSpace(p, p.pos);
  }
}

function resolveSpace(p, pos) {
  const cell = DATA.board[pos];
  const kind = cell.kind;
  if (kind === 'cobrar') {
    if (p.escaped) return;
    const inc = flowOf(p);
    p.cash += inc;
    ensureSolvent(p);
    S.message = `${p.name} cayó en COBRA: ${inc >= 0 ? 'cobra' : 'paga'} ${clp(Math.abs(inc))} extra.`;
    log(`${p.name} cobró un mes extra (${clp(inc)}).`, p.id);
    return;
  }
  if (kind === 'gusto') {
    const c = draw('gusto');
    S.lastCard = { kind: 'gusto', ...c };
    p.cash += c.amount;
    if (c.fixed) p.expenses += c.fixed;
    ensureSolvent(p);
    S.message = c.amount >= 0
      ? `${p.name}: ${c.name} → paga ${clp(c.amount)}${c.fixed ? ` y +${clp(c.fixed)}/mes` : ''}`
      : `${p.name}: ${c.name} → cobra ${clp(-c.amount)}`;
    log(S.message, p.id);
    return;
  }
  if (kind === 'mercado') {
    const c = draw('market');
    S.lastCard = { kind: 'market', ...c };
    applyMarket(p, c);
    return;
  }
  if (kind === 'banco') {
    S.pending = { type: 'bank' };
    S.message = `${p.name}: banco o caridad. Elige en tu móvil.`;
    return;
  }
  if (kind === 'peq' || kind === 'grande') {
    const c = draw(kind === 'peq' ? 'small' : 'big');
    S.lastCard = { kind: kind === 'peq' ? 'small' : 'big', ...c };
    S.pending = { type: 'deal', card: c, deck: kind === 'peq' ? 'small' : 'big' };
    S.message = `${p.name} tiene una oportunidad: ¿compra o pasa?`;
    return;
  }
}

function resolveVia(p, pos) {
  const cell = DATA.via[pos];
  if (cell.kind === 'cobrar') {
    const inc = Math.max(15000, Math.round(flowOf(p) * 10 / 1000) * 1000);
    p.cash += inc;
    S.message = `${p.name} cobra ${clp(inc)} en la vía rápida.`;
    log(`${p.name} cobró ${clp(inc)} (vía rápida).`, p.id);
    return;
  }
  if (cell.kind === 'sueno') {
    const c = draw('dream');
    S.lastCard = { kind: 'dream', ...c };
    S.pending = { type: 'dream', card: c };
    S.message = `${p.name}: ${c.name} cuesta ${clp(c.cost)}. ¿Lo compra?`;
    return;
  }
  if (cell.kind === 'mercado') {
    const c = draw('market');
    S.lastCard = { kind: 'market', ...c };
    applyMarket(p, c);
    return;
  }
  if (cell.kind === 'peq') {
    const c = draw('big');
    S.lastCard = { kind: 'big', ...c };
    S.pending = { type: 'deal', card: c, deck: 'big' };
    S.message = `${p.name} tiene una oportunidad en la vía rápida.`;
    return;
  }
  if (cell.kind === 'banco') {
    const cut = Math.round(p.cash * 0.1 / 100) * 100;
    p.cash -= cut;
    ensureSolvent(p);
    S.message = `${p.name} pasó por auditoría: paga ${clp(cut)}.`;
    log(S.message, p.id);
  }
}

function applyMarket(p, c) {
  const e = c.effect || { type: 'none' };
  if (e.type === 'sell') {
    const tags = targetTags(e.target);
    const options = p.assets.filter(a => tags.includes(a.tag));
    if (!options.length) {
      S.message = `${c.name}: no tienes activos que vender. La economía sigue.`;
      log(S.message, p.id);
      return;
    }
    S.pending = { type: 'sell', card: c, mult: e.mult, options: options.map(a => a.id), optional: !!e.optional };
    S.message = `${c.name}: elige qué vender (x${e.mult}).`;
    return;
  }
  if (e.type === 'rent') {
    const tags = targetTags(e.target);
    const options = p.assets.filter(a => tags.includes(a.tag));
    if (!options.length) { S.message = `${c.name}: no tienes propiedades. Sin efecto.`; return; }
    S.pending = { type: 'rent', card: c, pct: e.pct, options: options.map(a => a.id) };
    S.message = `${c.name}: elige la propiedad que sube ${e.pct}%.`;
    return;
  }
  if (e.type === 'cash_flow_months') {
    const inc = Math.round(flowOf(p) * e.months);
    p.cash += inc;
    S.message = `${c.name}: cobras ${clp(inc)}.`;
    log(S.message, p.id);
    return;
  }
  if (e.type === 'cash') {
    p.cash += e.amount;
    S.message = `${c.name}: ${e.amount >= 0 ? 'cobras' : 'pagas'} ${clp(Math.abs(e.amount))}.`;
    log(S.message, p.id);
    return;
  }
  if (e.type === 'all_pay') {
    S.players.forEach(x => { x.cash -= e.amount; ensureSolvent(x); });
    S.message = `${c.name}: todos pagan ${clp(e.amount)}.`;
    log(S.message);
    return;
  }
  if (e.type === 'inflation') {
    p.expenses = Math.ceil(p.expenses * (1 + e.pct / 100) / 100) * 100;
    S.message = `${c.name}: tus gastos suben a ${clp(p.expenses)}/mes.`;
    log(S.message, p.id);
    return;
  }
  if (e.type === 'skip') {
    p.skip = 1;
    p.cash += e.amount;
    ensureSolvent(p);
    S.message = `${c.name}: pierdes el próximo turno y pagas ${clp(-e.amount)}.`;
    log(S.message, p.id);
    return;
  }
  if (e.type === 'freeze') {
    S.frozen = true;
    S.message = `${c.name}: nadie puede pedir préstamos este turno.`;
    return;
  }
  if (e.type === 'rent_lost') {
    p.rentLost = e.turns;
    S.message = `${c.name}: una propiedad queda vacía ${e.turns} turnos.`;
    return;
  }
  if (e.type === 'draw_big') {
    const big = draw('big');
    S.lastCard = { kind: 'big', ...big };
    S.pending = { type: 'deal', card: big, deck: 'big' };
    S.message = `${c.name}: oportunidad grande anticipada.`;
    return;
  }
  S.message = `${c.name}: sin efecto automático. Sigue el juego.`;
  log(S.message, p.id);
}

// ---------------------------------------------------------------- acciones
function act(playerId, token, type, payload = {}) {
  const isHost = playerId === HOST.id && token === HOST.token;
  const p = isHost ? null : player(playerId);
  if (!isHost && (!p || p.token !== token)) return { error: 'Sesión inválida' };
  if (isHost && !['start', 'reset', 'kick'].includes(type)) return { error: 'Acción solo para jugadores' };
  if (S.phase === 'over' && type !== 'reset') return { error: 'La partida terminó' };
  const mine = current() && p && current().id === p.id;

  if (type === 'start') {
    if (!isHost) return { error: 'Solo el anfitrión puede empezar' };
    if (S.phase !== 'lobby') return { error: 'Ya empezó' };
    const profs = DATA.professions.slice();
    for (let i = profs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [profs[i], profs[j]] = [profs[j], profs[i]]; }
    S.players.forEach((pl, i) => {
      const pr = profs[i % profs.length];
      pl.profession = pr.name;
      pl.salary = pr.salary;
      pl.expenses = pr.expenses;
      pl.cash = pr.cash;
      pl.note = pr.note;
      pl.passive = 0;
      pl.assets = [];
      pl.debts = [];
      pl.pos = 0;
      pl.vpos = 0;
      pl.escaped = false;
      pl.bankrupt = false;
      pl.skip = 0;
      pl.adv = 0;
      pl.rentLost = 0;
    });
    S.phase = 'playing';
    S.turn = 0;
    S.round = 1;
    log('La partida comenzó. Cada quien recibe su profesión.');
    beginTurn();
    return {};
  }
  if (type === 'roll') {
    if (!mine) return { error: 'No es tu turno' };
    if (S.pending) return { error: 'Resuelve la carta primero' };
    roll();
    return {};
  }
  if (type === 'buy') {
    if (!mine || !S.pending || S.pending.type !== 'deal') return { error: 'No hay oferta' };
    const c = S.pending.card;
    if (!buyAsset(p, c, S.pending.deck)) return { error: 'No alcanza el efectivo' };
    S.pending = null;
    S.message = `${p.name} compró ${c.name}.`;
    return {};
  }
  if (type === 'pass') {
    if (!mine) return { error: 'No es tu turno' };
    if (S.pending && (S.pending.type === 'deal')) {
      log(`${p.name} pasó la oportunidad.`, p.id);
      S.message = `${p.name} pasó. La carta vuelve al mazo.`;
      S.pending = null;
      return {};
    }
    if (S.pending && S.pending.type === 'sell' && S.pending.optional) {
      S.pending = null;
      S.message = `${p.name} decidió mantener sus activos.`;
      return {};
    }
    if (S.pending && S.pending.type === 'dream') {
      S.pending = null;
      S.message = `${p.name} no compró su sueño todavía.`;
      return {};
    }
    if (S.pending && S.pending.type === 'bank') {
      S.pending = null;
      S.message = `${p.name} pasó por el banco sin operar.`;
      return {};
    }
    if (S.pending && S.pending.type === 'sell') {
      S.pending = null;
      S.message = `${p.name} no vendió nada.`;
      return {};
    }
    if (S.pending && S.pending.type === 'rent') {
      S.pending = null;
      S.message = `${p.name} no ajustó rentas.`;
      return {};
    }
    return {};
  }
  if (type === 'choose') {
    if (!mine || !S.pending) return { error: 'Nada que elegir' };
    const id = payload.assetId;
    if (S.pending.type === 'sell') {
      const a = p.assets.find(x => x.id === id);
      if (!a) return { error: 'Activo inválido' };
      const price = Math.round(a.cost * S.pending.mult);
      sellAsset(p, id, S.pending.mult);
      S.message = `${p.name} vendió ${a.name} por ${clp(price)}.`;
      S.pending = null;
      return {};
    }
    if (S.pending.type === 'rent') {
      const a = p.assets.find(x => x.id === id);
      if (!a) return { error: 'Activo inválido' };
      const inc = Math.round(a.flow * S.pending.pct / 100);
      a.flow += inc;
      p.passive += inc;
      S.message = `${a.name} sube su renta ${S.pending.pct}% (+${clp(inc)}/mes).`;
      log(S.message, p.id);
      S.pending = null;
      checkEscape(p);
      return {};
    }
    return {};
  }
  if (type === 'dream') {
    if (!mine || !S.pending || S.pending.type !== 'dream') return { error: 'No hay sueño' };
    const c = S.pending.card;
    if (p.cash < c.cost) return { error: 'No te alcanza' };
    p.cash -= c.cost;
    S.phase = 'over';
    S.winner = p.id;
    S.pending = null;
    S.message = `¡${p.name} compró ${c.name} y GANÓ LA PARTIDA!`;
    log(S.message, p.id);
    return {};
  }
  if (type === 'loan') {
    if (S.frozen) return { error: 'Crédito congelado este turno' };
    if (!mine) return { error: 'Solo en tu turno' };
    const amount = Math.min(Number(payload.amount) || 0, 200000);
    const got = takeLoan(p, amount);
    if (!got) return { error: 'No puedes pedir más' };
    S.message = `${p.name} pidió ${clp(got)} al banco.`;
    return {};
  }
  if (type === 'repay') {
    if (!mine) return { error: 'Solo en tu turno' };
    repay(p, payload.debtId);
    return {};
  }
  if (type === 'donate') {
    if (!mine) return { error: 'Solo en tu turno' };
    const amount = Math.round(p.salary * 0.1);
    if (p.cash < amount) return { error: 'No te alcanza' };
    p.cash -= amount;
    p.adv = 3;
    S.message = `${p.name} donó ${clp(amount)}: 3 turnos con dos dados.`;
    log(S.message, p.id);
    return {};
  }
  if (type === 'end') {
    if (!mine) return { error: 'No es tu turno' };
    if (S.pending) return { error: 'Tienes una decisión pendiente' };
    endTurn();
    return {};
  }
  if (type === 'reset') {
    S.phase = 'lobby';
    S.players.forEach(pl => { pl.ready = false; });
    S.turn = 0; S.round = 1; S.winner = null; S.log = []; S.pending = null;
    S.lastCard = null; S.dice = 0; S.message = 'Nueva partida: esperando jugadores…';
    shuffleDecks();
    return {};
  }
  if (type === 'kick') {
    if (!isHost) return { error: 'Solo el anfitrión' };
    if (S.phase !== 'lobby') return { error: 'Solo en la sala de espera' };
    const id = payload.playerId;
    if (S.players.length <= 1) return { error: 'No puedes dejar la mesa vacía' };
    S.players = S.players.filter(x => x.id !== id);
    log('Un jugador salió de la mesa.');
    broadcast();
    return {};
  }
  return { error: 'Acción desconocida' };
}

// ---------------------------------------------------------------- red
const clients = new Set();

function snapshot() {
  return {
    code: S.code, phase: S.phase, turn: S.turn, round: S.round, dice: S.dice,
    pending: S.pending, lastCard: S.lastCard, message: S.message, winner: S.winner,
    frozen: S.frozen, log: S.log.slice(0, 40),
    board: DATA.board, via: DATA.via, ratoneraPos: DATA.ratoneraPos, viaPos: DATA.viaPos,
    players: S.players.map(p => ({
      id: p.id, name: p.name, color: p.color, profession: p.profession, note: p.note,
      salary: p.salary, expenses: p.expenses, cash: p.cash, passive: p.passive,
      assets: p.assets, debts: p.debts, escaped: p.escaped, bankrupt: p.bankrupt,
      pos: p.pos, vpos: p.vpos, skip: p.skip, adv: p.adv, turns: p.turns,
      flow: flowOf(p), freedom: freedomNum(p),
    })),
    turnPlayer: S.players[S.turn] ? S.players[S.turn].name : null,
    lanUrl: LAN_URL,
    allUrls: ALL_IPS.map(ip => `http://${ip}:${PORT}`),
  };
}

function broadcast() {
  const payload = 'data: ' + JSON.stringify(snapshot()) + '\n\n';
  for (const c of clients) {
    try { c.res.write(payload); } catch (e) { clients.delete(c); }
  }
}

function lanIp() {
  const ifs = os.networkInterfaces();
  const all = [];
  for (const k of Object.keys(ifs)) {
    for (const a of ifs[k]) {
      if (a.family === 'IPv4' && !a.internal) all.push(a.address);
    }
  }
  const rank = (ip) => ip.startsWith('192.168.') ? 0
    : ip.startsWith('10.') ? 1
    : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2
    : ip.startsWith('169.254.') ? 4 : 3;
  all.sort((a, b) => rank(a) - rank(b));
  ALL_IPS.length = 0;
  all.forEach(ip => ALL_IPS.push(ip));
  return all[0] || '127.0.0.1';
}
const ALL_IPS = [];
const LAN_URL = `http://${lanIp()}:${PORT}`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
      'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 2000\n\n');
    const c = { res };
    clients.add(c);
    res.write('data: ' + JSON.stringify(snapshot()) + '\n\n');
    req.on('close', () => clients.delete(c));
    return;
  }

  if (p === '/api/join' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      let name = 'Jugador';
      try { name = (JSON.parse(body).name || '').trim().slice(0, 14) || name; } catch (e) {}
      if (S.phase !== 'lobby') return json(res, { error: 'La partida ya comenzó' });
      if (S.players.length >= 6) return json(res, { error: 'La mesa está llena (6)' });
      const pl = {
        id: uid(), token: uid(), name, color: COLORS[S.players.length % COLORS.length],
        salary: 0, expenses: 0, cash: 0, passive: 0, assets: [], debts: [],
        pos: 0, vpos: 0, escaped: false, bankrupt: false, skip: 0, adv: 0,
        rentLost: 0, turns: 0, profession: '',
      };
      S.players.push(pl);
      log(`${name} se unió a la mesa.`);
      S.message = `${S.players.length} jugador(es) en la mesa.`;
      broadcast();
      json(res, { playerId: pl.id, token: pl.token });
    });
    return;
  }

  if (p === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      let q = {};
      try { q = JSON.parse(body); } catch (e) {}
      const out = act(q.playerId, q.token, q.type, q.payload || {});
      broadcast();
      json(res, out || {});
    });
    return;
  }

  if (p === '/api/state') { json(res, snapshot()); return; }
  if (p === '/api/host') { json(res, { id: HOST.id, token: HOST.token }); return; }

  // estaticos
  let file = p === '/' ? 'host.html' : (p === '/p' ? 'play.html' : p.replace(/^\//, ''));
  const full = path.join(PUB, file);
  if (!full.startsWith(PUB) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404); res.end('No encontrado'); return;
  }
  const ext = path.extname(full);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache' });
  fs.createReadStream(full).pipe(res);
});

function json(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('');
    console.log('  El puerto ' + PORT + ' está ocupado.');
    console.log('  Cierra la otra ventana del juego o ejecuta:');
    console.log('    set PORT=3001 && node server.js');
    console.log('');
  } else {
    console.error(e);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  FLUJO LIBRE — servidor local');
  console.log('  ----------------------------------------');
  console.log('  Tablero (TV / portátil):  ' + LAN_URL);
  console.log('  Móviles:                  ' + LAN_URL + '/p');
  console.log('');
  console.log('  Todos deben estar en la misma Wi-Fi.');
  console.log('  Ctrl+C para detener.');
  console.log('');
});

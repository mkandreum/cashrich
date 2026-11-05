import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEngine, newGame, type Engine } from './game';

type Creds = { playerId: string; token: string };

function table(players = 2) {
  const engine = createEngine(newGame('TEST'));
  const creds: Record<string, Creds> = {};
  for (let i = 0; i < players; i++) {
    const out = engine.join(`J${i}`, '') as Creds;
    creds[out.playerId] = out;
  }
  expect(engine.act(creds[engine.state.players[0].id], 'start')).toEqual({});
  return { engine, creds };
}

/* Dado trucado: la siguiente tirada saca `value`. */
const rigDice = (value: number) => vi.spyOn(Math, 'random').mockReturnValue((value - 1) / 6 + 0.01);

/* Bot sencillo: compra lo que pueda pagar sin préstamo y remata el sueño. */
function playTurn(engine: Engine, creds: Record<string, Creds>) {
  const S = engine.state;
  const p = S.players[S.turn];
  const act = (type: string, payload?: unknown) => engine.act(creds[p.id], type, payload);
  if (!S.dice && !S.skipping && !p.bankrupt) expect(act('roll')).toEqual({});
  const pending = S.pending;
  const answerAuction = () => {
    const a = S.pending;
    if (a?.type !== 'auction') return;
    a.eligible.forEach((id, i) => engine.act(creds[id], 'bid', { amount: i === 0 ? a.card.down : 0 }));
  };
  if (pending?.type === 'deal') {
    act(p.cash >= pending.card.down ? 'buy' : 'pass');
    answerAuction();
    if (S.phase !== 'playing') return;
  }
  else if (pending?.type === 'dream') act(p.cash >= pending.card.cost ? 'dream' : 'pass');
  else if (pending?.type === 'sell' || pending?.type === 'rent') act('choose', { assetId: pending.options[0] });
  else if (pending) act('pass');
  if (S.phase === 'playing') expect(act('end')).toEqual({});
}

afterEach(() => vi.restoreAllMocks());

describe('Economía y operaciones', () => {
  const deal = { name: 'Piso', tag: 'VIVIENDA', cost: 100000, baseCost: 100000, down: 20000, flow: 1000 };

  it('quien pasa saca la oferta a subasta y cobra la prima', () => {
    const { engine, creds } = table(3);
    const S = engine.state;
    const [seller, a, b] = [S.players[S.turn], S.players[(S.turn + 1) % 3], S.players[(S.turn + 2) % 3]];
    a.cash = 50000; b.cash = 50000; seller.cash = 0;
    S.dice = 1;
    S.pending = { type: 'deal', deck: 'big', card: deal };
    engine.act(creds[seller.id], 'pass');
    expect(S.pending?.type).toBe('auction');
    expect(engine.act(creds[seller.id], 'end').error).toBeTruthy();
    engine.act(creds[a.id], 'bid', { amount: 30000 });
    engine.act(creds[b.id], 'bid', { amount: 25000 });
    expect(S.pending).toBeNull();
    expect(a.assets).toHaveLength(1);
    expect(a.cash).toBe(20000);
    expect(seller.cash).toBe(10000);
    expect(b.cash).toBe(50000);
  });

  it('la subasta se cierra sola al acabar el tiempo', () => {
    const { engine, creds } = table(2);
    const S = engine.state;
    const [seller, other] = [S.players[S.turn], S.players[(S.turn + 1) % 2]];
    other.cash = 50000;
    S.dice = 1;
    S.pending = { type: 'deal', deck: 'big', card: deal };
    engine.act(creds[seller.id], 'pass');
    expect(engine.tick()).toBe(false);
    (S.pending as unknown as { deadline: number }).deadline = 0;
    expect(engine.tick()).toBe(true);
    expect(S.pending).toBeNull();
  });

  it('vender descuenta la hipoteca: en crisis un activo apalancado puede dar pérdidas', () => {
    const { engine, creds } = table();
    const S = engine.state;
    const p = S.players[S.turn];
    p.cash = 50000;
    S.dice = 1;
    S.pending = { type: 'deal', deck: 'big', card: deal };
    engine.act(creds[p.id], 'buy');
    expect(p.cash).toBe(30000);
    S.economy.idx.property = 0.5;
    engine.act(creds[p.id], 'sell', { assetId: p.assets[0].id });
    expect(p.cash).toBe(30000 + 50000 - 80000);
    expect(p.assets).toHaveLength(0);
  });

  it('los precios siguen al sector, pero la renta no', () => {
    const { engine, creds } = table();
    const S = engine.state;
    const p = S.players[S.turn];
    S.economy.idx.property = 0.5;
    S.decks.big.unshift({ ...deal });
    p.pos = 5;
    rigDice(1); // la casilla 6 es Grande
    engine.act(creds[p.id], 'roll');
    const pending = S.pending as unknown as { card: { down: number; flow: number } };
    expect(pending.card.down).toBe(10000);
    expect(pending.card.flow).toBe(1000);
  });

  it('tres activos del mismo sector dan bono de renta y mejorar sube el flujo', () => {
    const { engine, creds } = table();
    const S = engine.state;
    const p = S.players[S.turn];
    p.cash = 500000;
    p.expenses = 1e7;
    S.dice = 1;
    for (let i = 0; i < 3; i++) {
      S.pending = { type: 'deal', deck: 'big', card: deal };
      engine.act(creds[p.id], 'buy');
    }
    S.economy.phase = 'expansion';
    engine.act(creds[p.id], 'upgrade', { assetId: p.assets[0].id });
    expect(p.passive).toBe(Math.round((1350 + 1000 + 1000) * 1.2));
  });

  it('el límite de rondas da la victoria al mayor patrimonio', () => {
    const { engine, creds } = table();
    const S = engine.state;
    S.settings.rounds = 1;
    const [a, b] = S.players;
    S.turn = 1;
    a.cash = 1000;
    b.cash = 900000;
    S.dice = 1;
    engine.act(creds[b.id], 'end');
    expect(S.phase).toBe('over');
    expect(S.winner).toBe(b.id);
  });

  it('el admin elige dificultad solo en la sala de espera', () => {
    const engine = createEngine(newGame('TEST'));
    const admin = engine.join('A', '') as Creds;
    engine.join('B', '');
    expect(engine.act(admin, 'settings', { difficulty: 'dificil', rounds: 20, mode: 'expres' })).toEqual({});
    expect(engine.state.settings).toEqual({ difficulty: 'dificil', rounds: 20, mode: 'expres' });
    engine.act(admin, 'start');
    expect(engine.act(admin, 'settings', { difficulty: 'facil' }).error).toBeTruthy();
    expect(engine.state.players[0].cash).toBeGreaterThan(0);
  });
});

describe('FLUJO LIBRE', () => {
  it('juega partidas completas y siempre termina', () => {
    const rounds: number[] = [];
    for (let i = 0; i < 200; i++) {
      const { engine, creds } = table(2 + (i % 5));
      for (let t = 0; t < 3000 && engine.state.phase === 'playing'; t++) playTurn(engine, creds);
      expect(engine.state.phase).toBe('over');
      expect(engine.state.winner).toBeTruthy();
      rounds.push(engine.state.round);
    }
    rounds.sort((a, b) => a - b);
    console.log('rondas p10/mediana/p90:', rounds[20], rounds[100], rounds[180]);
  });

  it('no filtra los tokens en el estado público', () => {
    const { engine } = table();
    const json = JSON.stringify(engine.snapshot());
        for (const p of engine.state.players) expect(json).not.toContain(p.token);
  });

  it('el primero en entrar es el admin y solo él maneja la mesa', () => {
    const { engine, creds } = table();
    const [admin, other] = engine.state.players;
    expect(engine.snapshot().adminId).toBe(admin.id);
    expect(engine.act(creds[other.id], 'reset').error).toBeTruthy();
    expect(engine.act({ playerId: admin.id, token: 'falso' }, 'reset').error).toBeTruthy();
    expect(engine.state.phase).toBe('playing');
    expect(engine.act(creds[admin.id], 'reset')).toEqual({});
    expect(engine.state.phase).toBe('lobby');
  });

  it('una carta de Gusto cobra el gasto en vez de regalarlo', () => {
    const { engine, creds } = table();
    const S = engine.state;
    const p = S.players[S.turn];
    S.decks.gusto.unshift({ name: 'Multa', amount: 6000, note: '', fixed: 0 });
    p.pos = 0;
    p.cash = 50000;
    rigDice(3); // la casilla 3 es Gusto
    expect(engine.act(creds[p.id], 'roll')).toEqual({});
    expect(p.pos).toBe(3);
    expect(p.cash).toBe(44000);
  });

  it('quien está en recesión no puede tirar y no se termina turno sin tirar', () => {
    const { engine, creds } = table();
    const S = engine.state;
    const p = S.players[S.turn];
    expect(engine.act(creds[p.id], 'end').error).toBeTruthy();
    S.skipping = true;
    expect(engine.act(creds[p.id], 'roll').error).toBeTruthy();
    expect(engine.act(creds[p.id], 'end')).toEqual({});
    expect(S.players[S.turn].id).not.toBe(p.id);
  });

  it('una compra imposible no deja un préstamo colgando', () => {
    const { engine, creds } = table();
    const S = engine.state;
    const p = S.players[S.turn];
    S.dice = 1;
    S.pending = { type: 'deal', deck: 'big', card: { name: 'Torre', tag: 'COMERCIAL', cost: 9e7, down: 9e7, flow: 1 } };
    const cash = p.cash;
    expect(engine.act(creds[p.id], 'buy').error).toBeTruthy();
    expect(p.debts).toEqual([]);
    expect(p.cash).toBe(cash);
  });

  it('pagar una deuda puede liberar de la ratonera', () => {
    const { engine, creds } = table();
    const S = engine.state;
    const p = S.players[S.turn];
    p.debts = [{ id: 'd', balance: 1000, payment: 5000, rate: 10 }];
    p.expenses = 6000;
    p.passive = 2000;
    p.cash = 5000;
    S.dice = 1;
    expect(engine.act(creds[p.id], 'repay', { debtId: 'd' })).toEqual({});
    expect(p.escaped).toBe(true);
  });

  it('el último jugador en pie gana', () => {
    const { engine, creds } = table();
    const S = engine.state;
    const [a, b] = S.players;
    S.turn = 0;
    a.pos = 0;
    a.cash = 0;
    a.salary = 0;
    S.decks.market.unshift({ name: 'Crisis', text: '', effect: { type: 'all_pay', amount: 1000 } });
    rigDice(2); // la casilla 2 es Mercado
    expect(engine.act(creds[a.id], 'roll')).toEqual({});
    expect(a.bankrupt).toBe(true);
    expect(S.phase).toBe('over');
    expect(S.winner).toBe(b.id);
  });
});

describe('Modos, tratos e informe', () => {
  const giveAsset = (engine: Engine, id: string) => {
    const p = engine.state.players.find((x) => x.id === id)!;
    p.assets.push({ id: 'A1', name: 'Piso', tag: 'VIVIENDA', cost: 100000, baseCost: 100000, down: 20000, mortgage: 80000, flow: 1000, kind: 'big', upgraded: false });
    p.ledger.push({ assetId: 'A1', name: 'Piso', round: 1, paid: 20000, received: 0, rent: 0, open: true });
    return p;
  };

  it('la partida nueva es Exprés de 12 rondas', () => {
    const { engine } = table(2);
    expect(engine.state.settings).toMatchObject({ mode: 'expres', rounds: 12 });
  });

  it('vender un activo a otro jugador mueve dinero, activo y rentas, fuera de turno', () => {
    const { engine, creds } = table(3);
    const S = engine.state;
    const seller = giveAsset(engine, S.players[(S.turn + 1) % 3].id);
    const buyer = S.players[(S.turn + 2) % 3];
    buyer.cash = 50000; seller.cash = 0;
    expect(engine.act(creds[seller.id], 'offer', { kind: 'sell', toId: buyer.id, assetId: 'A1', amount: 30000 })).toEqual({});
    expect(engine.act(creds[buyer.id], 'acceptOffer', { offerId: S.offers[0].id })).toEqual({});
    expect(seller.cash).toBe(30000);
    expect(buyer.cash).toBe(20000);
    expect(seller.assets).toHaveLength(0);
    expect(buyer.assets[0].mortgage).toBe(80000);
    expect(buyer.passive).toBeGreaterThan(0);
    expect(S.offers).toHaveLength(0);
  });

  it('no se puede aceptar una oferta ajena ni sin efectivo', () => {
    const { engine, creds } = table(3);
    const S = engine.state;
    const [a, b, c] = S.players;
    a.cash = 1000;
    expect(engine.act(creds[a.id], 'offer', { kind: 'lend', toId: b.id, amount: 5000, rate: 5 }).error).toBeTruthy();
    a.cash = 5000;
    engine.act(creds[a.id], 'offer', { kind: 'lend', toId: b.id, amount: 5000, rate: 5 });
    const id = S.offers[0].id;
    expect(engine.act(creds[c.id], 'acceptOffer', { offerId: id }).error).toBeTruthy();
    a.cash = 0;
    expect(engine.act(creds[b.id], 'acceptOffer', { offerId: id }).error).toBeTruthy();
    expect(S.offers).toHaveLength(0);
  });

  it('un préstamo entre jugadores cobra cuota cada mes y devuelve el capital al prestamista', () => {
    const { engine, creds } = table(2);
    const S = engine.state;
    const borrower = S.players[S.turn];
    const lender = S.players[(S.turn + 1) % 2];
    lender.cash = 10000; borrower.cash = 0;
    const before = borrower.expenses;
    engine.act(creds[lender.id], 'offer', { kind: 'lend', toId: borrower.id, amount: 10000, rate: 10 });
    engine.act(creds[borrower.id], 'acceptOffer', { offerId: S.offers[0].id });
    expect(borrower.expenses).toBe(before + 1000);
    const debt = borrower.debts[0];
    expect(debt.creditorId).toBe(lender.id);
    lender.cash = 0;
    borrower.cash = 10000;
    expect(engine.act(creds[borrower.id], 'repay', { debtId: debt.id })).toEqual({});
    expect(lender.cash).toBe(10000);
    expect(borrower.expenses).toBe(before);
  });

  it('el informe final da la mejor y la peor operación', () => {
    const { engine, creds } = table(2);
    const S = engine.state;
    const p = giveAsset(engine, S.players[0].id);
    p.ledger.push({ assetId: 'B', name: 'Mala', round: 2, paid: 9000, received: 1000, rent: 0, open: false });
    S.players[1].cash = -1;
    S.phase = 'over';
    const report = engine.snapshot().report!.find((r) => r.id === p.id)!;
    expect(report.worst?.name).toBe('Mala');
    expect(report.worst?.gain).toBe(-8000);
    expect(report.best?.name).toBe('Piso');
    expect(creds).toBeTruthy();
  });

  it('el reto da el mismo azar a todas las mesas, deja jugar solo y guarda la marca', () => {
    const added: unknown[] = [];
    const board = { top: () => [], add: (_w: string, e: unknown[]) => { added.push(...e); } };
    const seat = () => {
      const engine = createEngine(newGame('RETO'), board);
      const me = engine.join('Ana', '') as Creds;
      expect(engine.act(me, 'settings', { mode: 'reto' })).toEqual({});
      expect(engine.act(me, 'start')).toEqual({});
      return { engine, me };
    };
    const a = seat();
    const b = seat();
    expect(a.engine.state.players[0].profession).toBe(b.engine.state.players[0].profession);
    expect(a.engine.state.decks.small[0].name).toBe(b.engine.state.decks.small[0].name);
    a.engine.act(a.me, 'roll');
    b.engine.act(b.me, 'roll');
    expect(a.engine.state.dice).toBe(b.engine.state.dice);
    a.engine.state.settings.rounds = 1;
    a.engine.state.pending = null;
    a.engine.act(a.me, 'end');
    expect(a.engine.state.phase).toBe('over');
    expect(added).toHaveLength(1);
  });

  it('el reto no deja cambiar dificultad ni duración', () => {
    const engine = createEngine(newGame('RETO'));
    const me = engine.join('Ana', '') as Creds;
    engine.act(me, 'settings', { mode: 'reto' });
    engine.act(me, 'settings', { difficulty: 'facil', rounds: 30 });
    expect(engine.state.settings).toEqual({ mode: 'reto', difficulty: 'normal', rounds: 12 });
  });
});

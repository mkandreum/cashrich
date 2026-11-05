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
    expect(engine.act(admin, 'settings', { difficulty: 'dificil', rounds: 20 })).toEqual({});
    expect(engine.state.settings).toEqual({ difficulty: 'dificil', rounds: 20 });
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

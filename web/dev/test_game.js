/* Prueba automÃ¡tica del servidor: simula una partida de 2 jugadores. */
const BASE = 'http://127.0.0.1:3555';

async function j(path, body) {
  const r = await fetch(BASE + path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  } : undefined);
  return r.json();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const host = await j('/api/host');
  await j('/api/action', { playerId: host.id, token: host.token, type: 'reset' });
  const a = await j('/api/join', { name: 'Ana' });
  const b = await j('/api/join', { name: 'Beto' });
  if (a.error || b.error) throw new Error('join: ' + JSON.stringify([a, b]));
  console.log('unidos:', a.playerId ? 'ok' : a, b.playerId ? 'ok' : b);

  console.log('start:', await j('/api/action', { playerId: host.id, token: host.token, type: 'start' }));

  let st = await j('/api/state');
  console.log('fase:', st.phase, '| turno:', st.turnPlayer);
  st.players.forEach(p => console.log('  ', p.name, p.profession, 'sueldo', p.salary, 'gastos', p.expenses, 'caja', p.cash, 'flujo', p.flow));

  const cred = { [a.playerId]: a.token, [b.playerId]: b.token };

  for (let step = 0; step < 120; step++) {
    st = await j('/api/state');
    if (st.phase === 'over') { console.log('GANADOR:', st.winner, st.message); break; }
    const cur = st.players[st.turn];
    const t = cred[cur.id];

    if (st.pending) {
      const p = st.pending;
      if (p.type === 'deal') {
        const can = cur.cash + cur.salary * 10 >= p.card.down;
        const r = await j('/api/action', { playerId: cur.id, token: t, type: can ? 'buy' : 'pass' });
        if (r.error) console.log('  ! deal', r.error, cur.cash, p.card.down);
      } else if (p.type === 'sell' || p.type === 'rent') {
        const r = await j('/api/action', { playerId: cur.id, token: t, type: p.options.length ? 'choose' : 'pass', payload: { assetId: p.options[0] } });
        if (r.error) console.log('  ! market', r.error);
      } else if (p.type === 'dream') {
        await j('/api/action', { playerId: cur.id, token: t, type: cur.cash >= p.card.cost ? 'dream' : 'pass' });
      } else if (p.type === 'bank') {
        if (cur.turns % 5 === 0 && cur.debts.length === 0) {
          await j('/api/action', { playerId: cur.id, token: t, type: 'loan', payload: { amount: 50000 } });
        }
        await j('/api/action', { playerId: cur.id, token: t, type: 'pass' });
      }
      continue;
    }

    if (!st.dice) {
      await j('/api/action', { playerId: cur.id, token: t, type: 'roll' });
      continue;
    }
    await j('/api/action', { playerId: cur.id, token: t, type: 'end' });
  }

  st = await j('/api/state');
  console.log('\n--- estado final ---');
  console.log('ronda', st.round, 'fase', st.phase);
  st.players.forEach(p => console.log('  ', p.name, '| caja', p.cash, '| pasivo', p.passive, '| gastos', p.expenses,
    '| activos', p.assets.length, '| deudas', p.debts.length, p.escaped ? '| LIBRE' : '', p.bankrupt ? '| QUIEBRA' : ''));
  console.log('\nÃºltimos eventos:');
  st.log.slice(0, 12).forEach(l => console.log('  Â·', l.text));
})().catch(e => { console.error('FALLO:', e); process.exit(1); });


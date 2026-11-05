/* Siembra una partida de 4 jugadores y avanza unas rondas (para probar la interfaz). */
const BASE = 'http://127.0.0.1:3000';
const j = async (p, b) => (await fetch(BASE + p, b ? {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(b)} : undefined)).json();

(async () => {
  const host = await j('/api/host');
  await j('/api/action', {playerId: host.id, token: host.token, type: 'reset'});
  const names = ['Ana', 'Beto', 'Carla', 'Dani'];
  const ps = [];
  for (const n of names) ps.push({ ...(await j('/api/join', {name: n})), name: n });
  await j('/api/action', {playerId: host.id, token: host.token, type: 'start'});

  const cred = Object.fromEntries(ps.map(p => [p.playerId, p.token]));
  for (let step = 0; step < 34; step++) {
    const st = await j('/api/state');
    if (st.phase === 'over') break;
    const cur = st.players[st.turn];
    const t = cred[cur.id];
    if (st.pending) {
      const p = st.pending;
      if (p.type === 'deal') {
        const can = cur.cash + cur.salary * 10 >= p.card.down;
        await j('/api/action', {playerId: cur.id, token: t, type: can ? 'buy' : 'pass'});
      } else if (p.type === 'sell' || p.type === 'rent') {
        await j('/api/action', {playerId: cur.id, token: t, type: p.options.length ? 'choose' : 'pass',
          payload: {assetId: p.options[0]}});
      } else if (p.type === 'dream') {
        await j('/api/action', {playerId: cur.id, token: t, type: 'pass'});
      } else if (p.type === 'bank') {
        await j('/api/action', {playerId: cur.id, token: t, type: 'pass'});
      }
      continue;
    }
    if (!st.dice) { await j('/api/action', {playerId: cur.id, token: t, type: 'roll'}); continue; }
    await j('/api/action', {playerId: cur.id, token: t, type: 'end'});
  }
  const st = await j('/api/state');
  console.log('fase', st.phase, 'ronda', st.round, 'turno', st.turnPlayer);
  ps.forEach((p, i) => console.log(`${p.name}: http://127.0.0.1:3000/p?id=${p.playerId}&token=${p.token}&name=${p.name}`));
  console.log('estado:', st.players.map(x => `${x.name} ${x.cash}/${x.passive}`).join(' | '));
})();


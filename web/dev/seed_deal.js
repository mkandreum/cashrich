/* Deja la partida con una carta pendiente para revisar la interfaz del jugador. */
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

  for (let step = 0; step < 60; step++) {
    const st = await j('/api/state');
    if (st.pending && st.pending.type === 'deal') {
      const cur = st.players[st.turn];
      const who = ps.find(p => p.playerId === cur.id);
      console.log('PENDIENTE', st.pending.deck, 'de', cur.name);
      console.log('URL', `http://127.0.0.1:3000/p?id=${who.playerId}&token=${who.token}&name=${who.name}`);
      return;
    }
    const cur = st.players[st.turn];
    const t = cred[cur.id];
    if (st.pending) {
      const p = st.pending;
      if (p.type === 'sell' || p.type === 'rent') {
        await j('/api/action', {playerId: cur.id, token: t, type: 'pass'});
      } else { await j('/api/action', {playerId: cur.id, token: t, type: 'pass'}); }
      continue;
    }
    if (!st.dice) { await j('/api/action', {playerId: cur.id, token: t, type: 'roll'}); continue; }
    await j('/api/action', {playerId: cur.id, token: t, type: 'end'});
  }
  console.log('no se encontrÃ³ carta pendiente');
})();


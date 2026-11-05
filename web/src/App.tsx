import { useEffect, useState } from 'react';
import { createRoom } from './lib/api';
import { Game } from './screens/Game';
import { Landing } from './screens/Landing';

export function navigate(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  /* Pantalla compartida: la mesa se crea sola y los jugadores entran por QR */
  useEffect(() => {
    if (path !== '/tv') return;
    void createRoom(true).then(({ code }) => {
      window.history.replaceState(null, '', `/m/${code}?tv=1`);
      setPath(window.location.pathname);
    }).catch(() => navigate('/'));
  }, [path]);

  const match = path.match(/^\/m\/([A-Za-z]{4})\/?$/);
  if (match) {
    const code = match[1].toUpperCase();
    return <Game key={code} code={code} />;
  }
  if (path === '/tv') return null;
  return <Landing />;
}

import type { Snapshot } from '../../server/game';

export type { PlayerView, Snapshot, Pending, Asset } from '../../server/game';
export type Session = { playerId?: string; token?: string };

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Sin conexión con el servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Algo salió mal');
  return data;
}

export const createRoom = (tv = false) => post<{ code: string }>('/api/rooms', { tv });
export const joinRoom = (code: string, name: string, avatar: string) =>
  post<{ playerId: string; token: string }>(`/api/rooms/${code}/join`, { name, avatar });
export const sendAction = (code: string, session: Session, type: string, payload?: unknown) =>
  post(`/api/rooms/${code}/action`, { ...session, type, payload });

export async function fetchRoom(code: string): Promise<Snapshot | null> {
  const res = await fetch(`/api/rooms/${code}`).catch(() => null);
  return res?.ok ? res.json() : null;
}

const key = (code: string) => `flujo:${code}`;
export function loadSession(code: string): Session {
  try {
    return JSON.parse(localStorage.getItem(key(code)) || '{}');
  } catch {
    return {};
  }
}
export function saveSession(code: string, session: Session) {
  try {
    localStorage.setItem(key(code), JSON.stringify(session));
  } catch {
    /* navegación privada: la sesión dura lo que la pestaña */
  }
}

export const money = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-CO');
export const freedomPct = (p: { freedom: number }) => Math.min(100, Math.max(0, Math.round(p.freedom * 100)));

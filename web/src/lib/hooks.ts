import { useEffect, useRef, useState } from 'react';
import { fetchRoom, type Snapshot } from './api';
import { sfx } from './sound';

/* Estado en vivo de una mesa por SSE. EventSource reconecta solo. */
export function useRoom(code: string) {
  const [room, setRoom] = useState<Snapshot | null>(null);
  const [online, setOnline] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/rooms/${code}/events`);
    source.onmessage = (e) => {
      setRoom(JSON.parse(e.data));
      setOnline(true);
    };
    source.onerror = () => {
      setOnline(false);
      void fetchRoom(code).then((found) => {
        if (found) return;
        // Puede ser un corte de red: solo la respuesta 404 confirma que no existe.
        void fetch(`/api/rooms/${code}`).then((r) => {
          if (r.status === 404) {
            setMissing(true);
            source.close();
          }
        }).catch(() => {});
      });
    };
    return () => source.close();
  }, [code]);

  return { room, online, missing };
}

const ROLL_MS = 1050;
const HOP_MS = 300;

export type Motion = {
  playerId: string;
  lane: 'board' | 'via';
  from: number;
  step: number;
  value: number;
  /* Con formación se tiran dos dados: este es el que se descarta (0 si solo hay uno) */
  other: number;
  rolling: boolean;
};

/**
 * El servidor resuelve la tirada al instante. Aquí se retiene lo que se muestra
 * hasta que el dado cae y la ficha llega, para no destripar la carta ni el dinero.
 */
export function useStaged(latest: Snapshot | null) {
  const [shown, setShown] = useState(latest);
  const [motion, setMotion] = useState<Motion | null>(null);
  const refs = useRef({ latest, shown: latest, busy: false, timers: [] as number[] });
  refs.current.latest = latest;

  useEffect(() => {
    const r = refs.current;
    return () => {
      r.timers.forEach(clearTimeout);
      r.timers = [];
      r.busy = false;
    };
  }, []);

  useEffect(() => {
    const r = refs.current;
    if (!latest || r.busy) return;
    const prev = r.shown;
    const show = (s: Snapshot | null) => { r.shown = s; setShown(s); };

    if (!prev || !(latest.dice > 0 && prev.dice === 0 && prev.phase === 'playing' && prev.turn === latest.turn)) {
      show(latest);
      return;
    }
    const mover = prev.players[prev.turn];
    const lane = mover.escaped ? 'via' : 'board';
    const base = { playerId: mover.id, lane, from: lane === 'via' ? mover.vpos : mover.pos, value: latest.dice, other: latest.dice2 ?? 0 } as const;
    r.busy = true;
    sfx.roll();
    setMotion({ ...base, step: 0, rolling: true });
    for (let step = 0; step <= latest.dice; step++) {
      r.timers.push(window.setTimeout(() => {
        setMotion({ ...base, step, rolling: false });
        if (step > 0) sfx.hop();
      }, ROLL_MS + step * HOP_MS));
    }
    r.timers.push(window.setTimeout(() => {
      r.busy = false;
      setMotion(null);
      show(r.latest);
    }, ROLL_MS + latest.dice * HOP_MS + 260));
  }, [latest]);

  return { shown, motion };
}

export function useIsWide() {
  const query = '(min-width: 1080px)';
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const update = () => setWide(m.matches);
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);
  return wide;
}

/* Texto de la tirada: con dos dados se ve cuál vale */
export function rollText(m: { value: number; other: number; rolling: boolean }) {
  if (m.rolling) return m.other ? '¡Rodando los dados!' : '¡Rodando!';
  return m.other ? `¡${m.value} y ${m.other}! Vale el ${m.value}. Avanza…` : `¡Un ${m.value}! Avanza…`;
}

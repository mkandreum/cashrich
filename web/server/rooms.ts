/* Mesas en memoria, con copia en disco para sobrevivir a los redespliegues. */
import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import { createEngine, newGame, type Engine, type GameState } from './game';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_ROOMS = 500;
const IDLE_MS = 24 * 60 * 60 * 1000;

type Room = { engine: Engine; touched: number };

export function createRoomStore(dataDir: string) {
  const rooms = new Map<string, Room>();
  const file = path.join(dataDir, 'rooms.json');
  let saveTimer: NodeJS.Timeout | null = null;

  function saveNow() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      const dump = [...rooms.values()].map((r) => ({ state: r.engine.state, touched: r.touched }));
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(dump));
      fs.renameSync(`${file}.tmp`, file);
    } catch (e) {
      console.error('[mesas] no se pudo guardar:', e);
    }
  }
  const scheduleSave = () => { saveTimer ??= setTimeout(saveNow, 2000); };

  function load() {
    try {
      const dump: { state: GameState; touched: number }[] = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const { state, touched } of dump) rooms.set(state.code, { engine: createEngine(state), touched });
      console.log(`[mesas] ${rooms.size} recuperadas`);
    } catch (e: any) {
      if (e.code !== 'ENOENT') console.error('[mesas] copia ilegible, se ignora:', e);
    }
  }

  function sweep() {
    const limit = Date.now() - IDLE_MS;
    for (const [code, room] of rooms) if (room.touched < limit) rooms.delete(code);
  }

  load();
  sweep();
  setInterval(() => { sweep(); scheduleSave(); }, 60 * 60 * 1000).unref();

  return {
    create(tv: boolean) {
      sweep();
      if (rooms.size >= MAX_ROOMS) return null;
      let code = '';
      do code = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
      while (rooms.has(code));
      const engine = createEngine(newGame(code, tv));
      rooms.set(code, { engine, touched: Date.now() });
      scheduleSave();
      return engine;
    },
    get: (code: string) => rooms.get(code.toUpperCase())?.engine,
    touch(code: string) {
      const room = rooms.get(code);
      if (room) room.touched = Date.now();
      scheduleSave();
    },
    saveNow,
    all: () => [...rooms.values()].map((r) => r.engine),
    size: () => rooms.size,
  };
}

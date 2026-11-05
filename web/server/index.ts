/* FLUJO LIBRE - API, tiempo real (SSE) y estáticos. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import compression from 'compression';
import express, { type Response } from 'express';
import helmet from 'helmet';
import { createRoomStore } from './rooms';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
const IS_PROD = process.env.NODE_ENV === 'production';
const MAX_STREAMS_PER_ROOM = 40;

const store = createRoomStore(DATA_DIR);
const streams = new Map<string, Set<Response>>();

function broadcast(code: string) {
  const engine = store.get(code);
  const listeners = streams.get(code);
  if (!engine || !listeners) return;
  const payload = `data: ${JSON.stringify(engine.snapshot())}\n\n`;
  for (const res of listeners) res.write(payload);
}

/* Evita que un mismo cliente llene el servidor de mesas. */
const createdByIp = new Map<string, number[]>();
function allowCreate(ip: string) {
  const now = Date.now();
  const recent = (createdByIp.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 20) return false;
  recent.push(now);
  createdByIp.set(ip, recent);
  if (createdByIp.size > 5000) createdByIp.clear();
  return true;
}

function lanAddress() {
  const candidates = Object.values(os.networkInterfaces()).flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a!.address);
  const rank = (ip: string) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : ip.startsWith('172.') ? 2 : 3);
  return candidates.sort((a, b) => rank(a) - rank(b))[0];
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  // El TLS lo termina el proxy de Coolify; en la Wi-Fi local se sirve por http.
  strictTransportSecurity: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  contentSecurityPolicy: IS_PROD ? {
    directives: { imgSrc: ["'self'", 'data:', 'blob:'], workerSrc: ["'self'", 'blob:'], upgradeInsecureRequests: null },
  } : false,
}));
app.use(compression({ filter: (req, res) => !req.path.endsWith('/events') && compression.filter(req, res) }));
app.use(express.json({ limit: '4kb' }));

app.get('/health', (_req, res) => { res.json({ ok: true, rooms: store.size() }); });

/* Solo con el tablero abierto en localhost: el QR necesita la IP de la Wi-Fi. */
app.get('/api/lan', (req, res) => {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(req.hostname);
  const ip = local ? lanAddress() : undefined;
  res.json({ origin: ip ? `http://${ip}:${PORT}` : null });
});

app.post('/api/rooms', (req, res) => {
  if (!allowCreate(req.ip ?? '')) { res.status(429).json({ error: 'Demasiadas mesas nuevas. Espera unos minutos.' }); return; }
  const engine = store.create(req.body?.tv === true);
  if (!engine) { res.status(503).json({ error: 'El servidor está lleno. Inténtalo más tarde.' }); return; }
  res.json({ code: engine.state.code });
});

app.get('/api/rooms/:code', (req, res) => {
  const engine = store.get(req.params.code);
  if (!engine) { res.status(404).json({ error: 'No existe esa mesa' }); return; }
  res.json(engine.snapshot());
});

app.get('/api/rooms/:code/events', (req, res) => {
  const engine = store.get(req.params.code);
  if (!engine) { res.status(404).json({ error: 'No existe esa mesa' }); return; }
  const code = engine.state.code;
  const listeners = streams.get(code) ?? new Set<Response>();
  if (listeners.size >= MAX_STREAMS_PER_ROOM) { res.status(429).json({ error: 'Demasiadas conexiones' }); return; }
  streams.set(code, listeners);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
  });
  res.write(`retry: 2000\n\ndata: ${JSON.stringify(engine.snapshot())}\n\n`);
  listeners.add(res);
  req.on('close', () => {
    listeners.delete(res);
    if (!listeners.size) streams.delete(code);
  });
});

/* Mantiene viva la conexión a través del proxy inverso. */
setInterval(() => {
  for (const listeners of streams.values()) for (const res of listeners) res.write(': ping\n\n');
}, 25000).unref();

app.post('/api/rooms/:code/join', (req, res) => {
  const engine = store.get(req.params.code);
  if (!engine) { res.status(404).json({ error: 'No existe esa mesa' }); return; }
  const out = engine.join(String(req.body?.name ?? ''), String(req.body?.avatar ?? ''));
  if ('error' in out) { res.status(409).json(out); return; }
  store.touch(engine.state.code);
  broadcast(engine.state.code);
  res.json(out);
});

app.post('/api/rooms/:code/action', (req, res) => {
  const engine = store.get(req.params.code);
  if (!engine) { res.status(404).json({ error: 'No existe esa mesa' }); return; }
  const { playerId, token, type, payload } = req.body ?? {};
  const out = engine.act({ playerId, token }, String(type), payload);
  store.touch(engine.state.code);
  broadcast(engine.state.code);
  if (out.error) { res.status(409).json(out); return; }
  res.json({});
});

/* Las subastas se cierran solas al acabar el tiempo */
setInterval(() => {
  for (const engine of store.all()) {
    if (engine.tick()) {
      store.touch(engine.state.code);
      broadcast(engine.state.code);
    }
  }
}, 1000).unref();

app.use('/api', (_req, res) => { res.status(404).json({ error: 'No encontrado' }); });

async function main() {
  if (IS_PROD) {
    const client = path.join(__dirname, 'client');
    const shell = fs.readFileSync(path.join(client, 'index.html'));
    app.use('/assets', express.static(path.join(client, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(client, { index: false }));
    app.get(/.*/, (_req, res) => { res.type('html').set('Cache-Control', 'no-cache').send(shell); });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`CashRich escuchando en http://localhost:${PORT}`);
    const ip = lanAddress();
    if (ip && !IS_PROD) console.log(`En la Wi-Fi: http://${ip}:${PORT}`);
  });

  const shutdown = () => {
    store.saveNow();
    for (const listeners of streams.values()) for (const res of listeners) res.end();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();

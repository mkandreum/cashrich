import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Dices, LogOut, Music, Music2, FastForward, Maximize, Minimize, Tv, Users, Volume2, VolumeX, WalletCards, WifiOff } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { navigate } from '../App';
import { ActionPanel } from '../components/ActionPanel';
import { Board } from '../components/Board';
import { EconomyPanel } from '../components/Economy';
import { LogList, PlayerHud, PlayersList } from '../components/Hud';
import { JoinForm } from '../components/JoinForm';
import { Logo } from '../components/Logo';
import { Wallet } from '../components/Wallet';
import { joinRoom, loadSession, money, saveSession, sendAction, type PlayerView, type Session, type Snapshot } from '../lib/api';
import { useIsWide, useRoom, useStaged, type Motion } from '../lib/hooks';
import { enterFullscreen, useFullscreen, useKeepAwake } from '../lib/fullscreen';
import { isMuted, setMuted, sfx } from '../lib/sound';
import { music, musicEnabled, setMusicEnabled, type Mood } from '../lib/music';
import { Lobby } from './Lobby';
import { Avatar, Glyph } from '../components/Avatar';
import { LeaderboardPanel, Report } from '../components/Report';

const Board3D = lazy(() => import('../components/Board3D'));
const webgl = (() => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
})();

/* Tablero 3D; en dispositivos sin WebGL, y mientras carga, el tablero plano */
function GameBoard({ room, motion }: { room: Snapshot; motion: Motion | null }) {
  const flat = <Board room={room} motion={motion} />;
  if (!webgl) return flat;
  return <Suspense fallback={flat}><Board3D room={room} motion={motion} /></Suspense>;
}

/* La TV no se toca: todo debe caber a la vista, sin scroll */
function TvScreen({ room, motion, online, overlays }: { room: Snapshot; motion: Motion | null; online: boolean; overlays: ReactNode }) {
  return (
    <main className="grid h-dvh grid-cols-[minmax(0,1fr)_minmax(15rem,24%)] gap-3 overflow-hidden p-3">
      <div className="flex min-h-0 min-w-0 items-center justify-center"><GameBoard room={room} motion={motion} /></div>
      <aside className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <div className="flex flex-none items-center justify-between gap-2">
          <Logo className="text-2xl" />
          {!online && <WifiOff size={18} className="text-coral" aria-label="Reconectando" />}
          <span className="rounded-lg bg-black/25 px-2 py-0.5 font-display tracking-wider">{room.code}</span>
        </div>
        <div className="flex-none"><PlayersList room={room} compact /></div>
        <div className="flex-none"><EconomyPanel room={room} compact /></div>
        <section className="panel-dark min-h-0 flex-1 overflow-hidden p-2">
          <LogList room={room} />
        </section>
      </aside>
      {overlays}
    </main>
  );
}

const throwConfetti = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  void confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: ['#ffc83d', '#3ddc97', '#ff5a4e', '#2fb5f5', '#fff6df'] });
};

/* Música de fondo según la fase de la partida */
function useMusic(room: Snapshot | null) {
  const mood: Mood | null = !room ? null : room.phase === 'lobby' ? 'lobby' : room.players.some((p) => p.escaped && !p.bankrupt) ? 'fast' : 'game';
  useEffect(() => {
    music.play(mood);
    return () => music.play(null);
  }, [mood]);
}

type Banner = { key: number; emoji: string; title: string; text?: string };

/* Sonidos y celebraciones: comparan lo que se ve ahora con lo anterior */
function useGameFx(room: Snapshot | null, meId?: string) {
  const prev = useRef<Snapshot | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = room;
    if (!room || !before || before.code !== room.code) return;
    const show = (b: Omit<Banner, 'key'>) => setBanner({ ...b, key: Date.now() });

    const cardName = (s: Snapshot) => s.lastCard?.name;
    if (cardName(room) && cardName(room) !== cardName(before)) sfx.card();

    const mine = room.players.find((p) => p.id === meId);
    const mineBefore = before.players.find((p) => p.id === meId);
    if (mine && mineBefore && mine.cash !== mineBefore.cash) (mine.cash > mineBefore.cash ? sfx.coin : sfx.loss)();

    for (const p of room.players) {
      const was = before.players.find((x) => x.id === p.id);
      if (p.escaped && was && !was.escaped) {
        sfx.fanfare();
        throwConfetti();
        show({ emoji: 'unlock', title: `¡${p.name} escapó!`, text: 'Sus rentas ya pagan su vida. Rumbo a la Avenida del Legado.' });
      }
      if (p.bankrupt && was && !was.bankrupt) {
        sfx.loss();
        show({ emoji: 'skull', title: `${p.name} quebró`, text: 'Queda fuera de la partida.' });
      }
    }

    const turnMoved = before.turn !== room.turn || (before.phase !== 'playing' && room.phase === 'playing');
    if (turnMoved && room.phase === 'playing' && room.players[room.turn]?.id === meId) {
      sfx.turn();
      show({ emoji: mine?.avatar ?? 'dice', title: '¡Te toca!' });
    }
    if (before.round !== room.round && room.settings.rounds > 0 && room.round === room.settings.rounds && room.phase === 'playing') {
      sfx.turn();
      show({ emoji: 'dice', title: '¡Última ronda!', text: 'Vende, compra o negocia: al acabar se decide quién gana.' });
    }
    const newOffer = room.offers.find((o) => o.toId === meId && !before.offers.some((x) => x.id === o.id));
    if (newOffer) {
      sfx.card();
      show({ emoji: room.players.find((p) => p.id === newOffer.fromId)?.avatar ?? 'dice', title: '¡Te proponen un trato!', text: 'Míralo en tu cartera.' });
    }
    if (before.phase !== 'over' && room.phase === 'over') {
      sfx.fanfare();
      throwConfetti();
      setTimeout(throwConfetti, 500);
      setTimeout(throwConfetti, 1100);
    }
  }, [room, meId]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), banner.text ? 2600 : 1200);
    return () => clearTimeout(t);
  }, [banner]);

  return banner;
}

function BannerOverlay({ banner }: { banner: Banner | null }) {
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key={banner.key} role="status"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-black/35 p-4 text-center"
        >
          <motion.div initial={{ scale: 0.3, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 1.3 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
            <div className="text-7xl"><Glyph id={banner.emoji} size="1.1em" /></div>
            <p className="sticker mt-2 text-[clamp(2.6rem,9vw,5.5rem)] leading-none text-gold">{banner.title}</p>
            {banner.text && <p className="mt-2 text-xl font-semibold text-white [text-shadow:0_2px_0_#000]">{banner.text}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Victory({ room, isHost, tv, send, meId }: { room: Snapshot; isHost: boolean; tv: boolean; send: (type: string) => void; meId?: string }) {
  const byProgress = room.settings.mode !== 'clasico';
  const entry = room.report?.find((r) => r.id === meId);
  const winner = room.players.find((p) => p.id === room.winner);
  const ranking = [...room.players].sort((a, b) => Number(b.id === room.winner) - Number(a.id === room.winner) || (byProgress ? b.progress - a.progress : b.netWorth - a.netWorth));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`fixed inset-0 z-30 grid place-items-center bg-felt-950/85 p-4 ${tv ? 'overflow-hidden' : 'overflow-auto'}`}>
      <motion.div initial={{ scale: 0.6, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="w-full max-w-md text-center">
        <div className="text-7xl"><Glyph id={winner?.avatar ?? 'trophy'} size="1.1em" /></div>
        <p className="sticker mt-1 text-5xl leading-none text-gold">¡{winner?.name ?? 'Nadie'} gana!</p>
        <p className="mt-2 text-lg font-semibold text-cream">{room.message}</p>
        <ol className="panel mt-4 p-3 text-left">
          {ranking.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 border-b-2 border-cream-dark py-1.5 last:border-0">
              <span className="font-display w-6 text-center">{i + 1}</span>
              <span aria-hidden className="text-xl"><Avatar id={p.avatar} /></span>
              <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
              <span className="font-display text-mint-dark">{byProgress ? `${p.progress >= 0 ? '+' : ''}${p.progress} meses` : money(p.netWorth)}</span>
            </li>
          ))}
        </ol>
        {entry && !tv && <Report room={room} entry={entry} />}
        <LeaderboardPanel room={room} />
        {isHost
          ? <button className="btn btn-coral btn-giant mt-4" onClick={() => send('reset')}>Otra partida</button>
          : <p className="mt-4 font-semibold text-cream/85">El admin puede empezar otra partida.</p>}
        {!tv && <button className="mt-1 block w-full font-semibold underline underline-offset-4" onClick={() => navigate('/')}>Salir</button>}
      </motion.div>
    </motion.div>
  );
}

function TopBar({ room, online, isHost, canSkip, send, boardToggle }: { room: Snapshot; online: boolean; isHost: boolean; canSkip: boolean; send: (type: string) => void; boardToggle?: () => void }) {
  const [muted, setMute] = useState(isMuted());
  const [songOn, setSongOn] = useState(musicEnabled());
  const screen = useFullscreen();
  return (
    <div className="flex items-center gap-2">
      <Logo className="flex-1 text-2xl" />
      {!online && <span className="inline-flex items-center gap-1 rounded-full bg-coral px-2 py-1 text-xs font-semibold"><WifiOff size={14} aria-hidden /> Reconectando</span>}
      {room.settings.rounds > 0 && <span title="Ronda" className="rounded-lg bg-black/25 px-2 py-1 font-display">{Math.min(room.round, room.settings.rounds)}/{room.settings.rounds}</span>}
      <span className="rounded-lg bg-black/25 px-2 py-1 font-display tracking-wider">{room.code}</span>
      {isHost && canSkip && (
        <button
          aria-label="Saltar el turno de quien no responde" title="Saltar turno"
          onClick={() => { if (window.confirm(`¿Saltar el turno de ${room.players[room.turn]?.name}?`)) send('skipTurn'); }}
          className="grid size-9 cursor-pointer place-items-center rounded-lg bg-black/25 hover:bg-black/40"
        >
          <FastForward size={18} aria-hidden />
        </button>
      )}
      {boardToggle && (
        <button aria-label="Mostrar u ocultar el tablero" title="Tablero" onClick={boardToggle} className="grid size-9 cursor-pointer place-items-center rounded-lg bg-black/25 hover:bg-black/40">
          <Tv size={18} aria-hidden />
        </button>
      )}
      {screen.supported && (
        <button aria-label={screen.active ? 'Salir de pantalla completa' : 'Pantalla completa'} title="Pantalla completa" onClick={screen.toggle} className="grid size-9 cursor-pointer place-items-center rounded-lg bg-black/25 hover:bg-black/40">
          {screen.active ? <Minimize size={18} aria-hidden /> : <Maximize size={18} aria-hidden />}
        </button>
      )}
      <button
        aria-label="Salir de la partida" title="Salir" onClick={() => { if (window.confirm('¿Salir de la partida? Podrás volver a entrar con el código de la mesa.')) navigate('/'); }}
        className="grid size-9 cursor-pointer place-items-center rounded-lg bg-black/25 hover:bg-black/40"
      >
        <LogOut size={18} aria-hidden />
      </button>
      <button
        aria-label={songOn ? 'Quitar la música' : 'Poner música'} title="Música" onClick={() => { setMusicEnabled(!songOn); setSongOn(!songOn); }}
        className={`grid size-9 cursor-pointer place-items-center rounded-lg bg-black/25 hover:bg-black/40 ${songOn ? '' : 'opacity-60'}`}
      >
        {songOn ? <Music2 size={18} aria-hidden /> : <Music size={18} aria-hidden />}
      </button>
      <button
        aria-label={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => { setMuted(!muted); setMute(!muted); }}
        className="grid size-9 cursor-pointer place-items-center rounded-lg bg-black/25 hover:bg-black/40"
      >
        {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
      </button>
    </div>
  );
}

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon: ReactNode; alert?: boolean }[]; value: T; onChange: (v: T) => void }) {
  return (
    <nav className="flex gap-1 rounded-2xl border-2 border-white/15 bg-felt-950 p-1" aria-label="Secciones">
      {tabs.map((t) => (
        <button
          key={t.id} aria-current={value === t.id ? 'page' : undefined} onClick={() => onChange(t.id)}
          className={`relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 font-display transition-colors ${value === t.id ? 'bg-cream text-ink' : 'text-cream/85'}`}
        >
          {t.icon} {t.label}
          {t.alert && <span className="absolute right-2 top-1.5 size-2.5 rounded-full bg-coral" />}
        </button>
      ))}
    </nav>
  );
}

function SidePanels({ room, me }: { room: Snapshot; me?: PlayerView }) {
  return (
    <>
      <PlayersList room={room} meId={me?.id} />
      <div className="mt-3"><EconomyPanel room={room} /></div>
      <section className="panel-dark mt-3 p-3">
        <h3 className="mb-1.5 flex items-center gap-1.5 font-display text-lg"><BookOpen size={18} aria-hidden /> Lo que pasa</h3>
        <LogList room={room} />
      </section>
    </>
  );
}

function Toast({ text }: { text: string }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div role="alert" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-sm rounded-xl border-[3px] border-ink bg-coral px-4 py-2.5 text-center font-semibold text-white">
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Game({ code }: { code: string }) {
  const { room, online, missing } = useRoom(code);
  const { shown, motion: mv } = useStaged(room);
  const wide = useIsWide();
  const tv = new URLSearchParams(window.location.search).has('tv');
  const [session, setSession] = useState<Session>(() => (tv ? {} : loadSession(code)));
  const [tab, setTab] = useState<'play' | 'wallet' | 'table'>('play');
  const [sideTab, setSideTab] = useState<'wallet' | 'table'>('wallet');
  const [boardOnPhone, setBoardOnPhone] = useState<boolean | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  const me = shown?.players.find((p) => p.id === session.playerId);
  const isHost = !!me && me.id === shown?.adminId;
  const banner = useGameFx(shown, me?.id);
  useMusic(shown);
  useKeepAwake(!!shown);
  useEffect(() => {
    if (!tv) return;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, [tv]);
  const myTurn = !!me && shown?.phase === 'playing' && shown.players[shown.turn]?.id === me.id;

  const send = (type: string, payload?: unknown) => {
    sendAction(code, session, type, payload).catch((e: Error) => {
      setToast(e.message);
      clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(''), 2600);
    });
  };

  useEffect(() => { if (myTurn) setTab('play'); }, [myTurn]);

  const actionRef = useRef<HTMLDivElement>(null);
  const decisionKey = myTurn && !mv && (shown?.pending || shown?.lastCard) ? `${shown?.pending?.type}:${shown?.lastCard?.name}` : '';
  useEffect(() => {
    if (decisionKey && !wide) actionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [decisionKey, wide]);

  if (missing) {
    return (
      <main className="grid min-h-dvh place-items-center p-4 text-center">
        <div className="panel max-w-sm p-6">
          <p className="text-5xl">🕳️</p>
          <h1 className="mt-2 font-display text-3xl">Esta mesa ya no existe</h1>
          <p className="mt-1 text-ink/75">Las mesas se cierran tras 24 horas sin actividad.</p>
          <button className="btn btn-coral mt-4 w-full" onClick={() => navigate('/')}>Crear otra</button>
        </div>
      </main>
    );
  }
  if (!shown) {
    return <main className="grid min-h-dvh place-items-center"><Logo className="animate-pulse text-5xl" /></main>;
  }

  if (!tv && !me && shown.phase === 'lobby') {
    const taken = shown.players.map((p) => p.avatar);
    return (
      <main className="flex min-h-dvh flex-col items-center gap-5 p-4 pt-[6vh]">
        <Logo className="text-center text-[clamp(3rem,12vw,5.5rem)]" />
        <JoinForm
          title={`Entrar a la mesa ${shown.code}`} cta="¡Sentarme!" taken={taken}
          onSubmit={async (name, avatar) => {
            enterFullscreen();
            const seat = await joinRoom(code, name, avatar);
            const next = { ...session, ...seat };
            saveSession(code, next);
            setSession(next);
          }}
        />
      </main>
    );
  }

  if (shown.phase === 'lobby') return <Lobby room={shown} meId={me?.id} isHost={isHost} tv={tv} send={send} />;

  const canSkip = isHost && shown.phase === 'playing' && !myTurn;
  /* Con TV el tablero se mira allí, pero cualquiera puede sacarlo también en su móvil */
  const showBoard = boardOnPhone ?? !shown.tv;
  const topBar = <TopBar room={shown} online={online} isHost={isHost} canSkip={canSkip} send={send} boardToggle={shown.tv && me && !wide ? () => setBoardOnPhone(!showBoard) : undefined} />;
  const overlays = (
    <>
      <BannerOverlay banner={banner} />
      <Toast text={toast} />
      {shown.phase === 'over' && !mv && <Victory room={shown} isHost={isHost} tv={tv} send={send} meId={me?.id} />}
    </>
  );
  if (tv) return <TvScreen room={shown} motion={mv} online={online} overlays={overlays} />;

  const spectatorNote = !me && (
    <p className="panel-dark p-3 text-center font-semibold">{tv ? 'Modo tablero' : 'Estás de espectador: la partida ya empezó.'}</p>
  );

  if (wide) {
    return (
      <main className="grid h-dvh grid-cols-[minmax(0,1fr)_400px] gap-4 overflow-hidden p-4">
        <div className="flex min-w-0 items-center justify-center"><GameBoard room={shown} motion={mv} /></div>
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-2 pr-1 [scrollbar-width:thin]">
          {topBar}
          {spectatorNote}
          {me && <PlayerHud player={me} room={shown} />}
          {me && <ActionPanel room={shown} me={me} motion={mv} send={send} />}
          {me ? (
            <>
              <Tabs
                value={sideTab} onChange={setSideTab}
                tabs={[
                  { id: 'wallet', label: 'Cartera', icon: <WalletCards size={18} aria-hidden /> },
                  { id: 'table', label: 'Mesa', icon: <Users size={18} aria-hidden /> },
                ]}
              />
              {sideTab === 'wallet' ? <Wallet room={shown} me={me} send={send} /> : <div><SidePanels room={shown} me={me} /></div>}
            </>
          ) : <div><SidePanels room={shown} /></div>}
        </aside>
        {overlays}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {topBar}
      {spectatorNote}
      {me && <PlayerHud player={me} room={shown} />}
      <div className="flex-1 space-y-3">
        {(tab === 'play' || !me) && (showBoard || !me) && (
          <div className="pb-2.5"><GameBoard room={shown} motion={mv} /></div>
        )}
        {me && tab === 'play' && <div ref={actionRef} className="scroll-mb-24"><ActionPanel room={shown} me={me} motion={mv} send={send} /></div>}
        {me && tab === 'wallet' && <Wallet room={shown} me={me} send={send} />}
        {(tab === 'table' || !me) && <SidePanels room={shown} me={me} />}
      </div>
      {me && (
        <div className="sticky bottom-2 z-20">
          <Tabs
            value={tab} onChange={setTab}
            tabs={[
              { id: 'play', label: 'Jugar', icon: <Dices size={18} aria-hidden />, alert: myTurn && tab !== 'play' },
              { id: 'wallet', label: 'Cartera', icon: <WalletCards size={18} aria-hidden />, alert: tab !== 'wallet' && shown.offers.some((o) => o.toId === me.id) },
              { id: 'table', label: 'Mesa', icon: <Users size={18} aria-hidden /> },
            ]}
          />
        </div>
      )}
      {overlays}
    </main>
  );
}

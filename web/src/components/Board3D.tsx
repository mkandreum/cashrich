import { useEffect, useRef } from 'react';
import type { Snapshot } from '../lib/api';
import { rollText, type Motion } from '../lib/hooks';
import { BoardScene } from '../lib/scene3d';
import { PhaseChip } from './Economy';
import { GameCard } from './GameCard';
import { Avatar } from './Avatar';

/* three.js pesa: se carga aparte, solo cuando empieza la partida */
export default function Board3D({ room, motion }: { room: Snapshot; motion: Motion | null }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BoardScene | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Los rótulos de las casillas usan la fuente del juego: hay que esperarla.
    void document.fonts.load('40px "Lilita One"').finally(() => {
      if (cancelled || !host.current) return;
      scene.current = new BoardScene(host.current);
      scene.current.update(room, motion);
    });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
    // La escena se crea una sola vez; los cambios llegan por update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scene.current?.update(room, motion);
  }, [room, motion]);

  const current = room.players[room.turn];
  const card = !motion ? room.lastCard : null;
  return (
    <div className="board3d" data-phase={room.economy.phase}>
      <div ref={host} className="absolute inset-0" />
      <div className="board3d-hud">
        <p className="board3d-text font-display text-gold text-[clamp(0.95rem,2.6cqw,1.8rem)] leading-tight">
          {room.phase === 'over' ? 'Fin de la partida' : current ? <><Avatar id={current.avatar} /> Turno de {current.name}</> : ''}
        </p>
        <p className="board3d-text text-[clamp(0.75rem,1.7cqw,1.1rem)] font-semibold leading-snug text-cream">
          {motion ? rollText(motion) : room.message}
        </p>
        <div className="board3d-chip mt-1"><PhaseChip room={room} /></div>
      </div>
      {card && (
        <div className="board3d-card">
          <GameCard deck={card.kind} card={card} compact />
        </div>
      )}
    </div>
  );
}

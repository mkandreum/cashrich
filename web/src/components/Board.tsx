import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { board as BOARD, ratoneraPos as BOARD_POS, via as VIA, viaPos as VIA_POS } from '../../data.json';
import type { PlayerView, Snapshot } from '../lib/api';
import type { Motion } from '../lib/hooks';
import { LOOKS } from '../lib/theme';
import { Dice } from './Dice';
import { GameCard } from './GameCard';

const lookFor = (cell: { name: string; kind: string }, index: number, lane: 'board' | 'via') => {
  if (lane === 'board' && index === 0) return LOOKS.salida;
  if (lane === 'via' && cell.kind === 'banco') return LOOKS.auditoria;
  if (lane === 'via' && cell.kind === 'peq') return LOOKS.oportunidad;
  return LOOKS[cell.kind];
};

function Tile({ cell, index, lane, active, style }: {
  cell: { name: string; kind: string }; index: number; lane: 'board' | 'via'; active: boolean; style: CSSProperties;
}) {
  const look = lookFor(cell, index, lane);
  const Icon = look.icon;
  return (
    <div
      className={`tile ${active ? 'tile-active' : ''} ${cell.kind === 'sueno' ? 'shine' : ''}`}
      title={cell.name}
      style={{ ...style, '--tile': look.tile, '--tile-dark': look.dark, '--tile-ink': look.ink } as CSSProperties}
    >
      <Icon aria-hidden />
      <span className="tile-label">{look.label}</span>
    </div>
  );
}

/* Centro de una casilla, en % del tablero completo */
function spot(lane: 'board' | 'via', index: number) {
  const pad = 1.1; // igual que el inset de .board-grid, en cqw (el tablero mide 100cqw de ancho)
  const width = 100 - pad * 2;
  const [col, row] = lane === 'board' ? BOARD_POS[index] : VIA_POS[index];
  return {
    x: pad + ((col - 0.5) / 8) * width,
    // alto = 75cqw (4:3); se pasa a % de la altura del tablero
    y: (pad + ((row - 0.5) / 6) * (75 - pad * 2)) / 0.75,
  };
}

function Pawn({ player, index, siblings }: { player: PlayerView & { lane: 'board' | 'via'; at: number }; index: number; siblings: number }) {
  const { x, y } = spot(player.lane, player.at);
  const angle = (index / Math.max(1, siblings)) * Math.PI * 2;
  const spread = siblings > 1 ? 2.1 : 0;
  return (
    <motion.div
      className="pawn"
      initial={false}
      animate={{ left: `${x + Math.cos(angle) * spread}%`, top: `${y + Math.sin(angle) * spread * 1.3}%` }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      style={{ '--pawn': player.color } as CSSProperties}
    >
      <motion.div
        key={`${player.lane}:${player.at}`}
        className="pawn-face"
        initial={{ y: 0, scaleY: 1 }}
        animate={{ y: [0, -22, 0], scaleY: [1, 1.08, 0.86, 1] }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        title={player.name}
      >
        {player.avatar}
      </motion.div>
    </motion.div>
  );
}

export function Board({ room, motion: mv }: { room: Snapshot; motion: Motion | null }) {
  const current = room.players[room.turn];
  const pieces = room.players.filter((p) => !p.bankrupt).map((p) => {
    const lane: 'board' | 'via' = mv?.playerId === p.id ? mv.lane : p.escaped ? 'via' : 'board';
    const size = lane === 'via' ? 12 : 24;
    const at = mv?.playerId === p.id ? (mv.from + mv.step) % size : lane === 'via' ? p.vpos : p.pos;
    return { ...p, lane, at };
  });
  const siblingsOf = (p: (typeof pieces)[number]) => pieces.filter((o) => o.lane === p.lane && o.at === p.at);
  const activePiece = pieces.find((p) => p.id === (mv?.playerId ?? current?.id));
  const anyoneFree = room.players.some((p) => p.escaped);
  const diceValue = mv?.value ?? room.dice;
  const card = !mv ? room.lastCard : null;

  return (
    <div className="board" aria-label="Tablero">
      <div className="board-grid">
        {BOARD.map((cell, i) => (
          <Tile
            key={i} cell={cell} index={i} lane="board"
            active={activePiece?.lane === 'board' && activePiece.at === i}
            style={{ gridColumn: BOARD_POS[i][0], gridRow: BOARD_POS[i][1] }}
          />
        ))}

        <div className={`lane ${anyoneFree ? '' : 'lane-locked'}`}>
          {VIA.map((cell, i) => (
            <Tile
              key={i} cell={cell} index={i} lane="via"
              active={activePiece?.lane === 'via' && activePiece.at === i}
              style={{ gridColumn: VIA_POS[i][0] - 1, gridRow: VIA_POS[i][1] - 1 }}
            />
          ))}
        </div>

        <div className="center">
          <Dice value={diceValue || 6} rolling={!!mv?.rolling} idle={!diceValue} size="clamp(40px, 9.5cqw, 120px)" />
          <div className="center-msg">
            <p className="center-turn text-gold">
              {room.phase === 'over' ? 'Fin de la partida' : current ? `${current.avatar} Turno de ${current.name}` : ''}
            </p>
            <p className="mt-[0.5cqw] text-cream/90">{mv ? (mv.rolling ? 'Rodando el dado…' : `¡Saca un ${mv.value}!`) : room.message}</p>
          </div>
          {card && (
            <div className="center-card text-[1cqw]">
              <GameCard deck={card.kind} card={card} compact />
            </div>
          )}
        </div>
      </div>

      {pieces.map((p) => {
        const group = siblingsOf(p);
        return <Pawn key={p.id} player={p} index={group.findIndex((o) => o.id === p.id)} siblings={group.length} />;
      })}
    </div>
  );
}



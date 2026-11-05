import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { money } from '../lib/api';
import { CARD_LOOKS, tagIcon } from '../lib/theme';

type CardData = Record<string, any>;

/* Carta con giro de entrada. `deck` decide color e icono. */
export function GameCard({ deck, card, compact, children }: { deck: string; card: CardData; compact?: boolean; children?: ReactNode }) {
  const { look, title } = CARD_LOOKS[deck] ?? CARD_LOOKS.market;
  const Icon = deck === 'small' || deck === 'big' ? tagIcon(card.tag) : look.icon;
  const headline = deck === 'dream' ? card.cost : deck === 'gusto' ? Math.abs(card.amount) : card.down;

  return (
    <motion.article
      key={`${deck}:${card.name}`}
      initial={{ rotateY: 100, y: 26, scale: 0.86, opacity: 0 }}
      animate={{ rotateY: 0, y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 210, damping: 17 }}
      className="panel overflow-hidden"
      style={{ transformPerspective: 900 }}
    >
      <header className="flex items-center gap-2 border-b-[3px] border-ink px-3 py-1.5" style={{ background: look.tile, color: look.ink }}>
        <Icon size={compact ? 16 : 20} strokeWidth={2.6} aria-hidden />
        <span className={`font-display ${compact ? 'text-sm' : 'text-base'} leading-none`}>{card.tag || title}</span>
      </header>
      <div className={compact ? 'p-2.5' : 'p-4'}>
        <h3 className={`font-display ${compact ? 'text-base' : 'text-2xl'} leading-[1.05]`}>{card.name}</h3>
        {headline != null && (
          <p className={`font-display ${compact ? 'text-xl' : 'text-4xl'} mt-1 leading-none`} style={{ color: look.dark }}>
            {money(headline)}
          </p>
        )}
        {!compact && (card.flow != null) && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-sm font-semibold">
            <span className="rounded-full bg-mint/35 px-2.5 py-0.5">+{money(card.flow)}/mes</span>
            <span className="rounded-full bg-cream-dark px-2.5 py-0.5">Valor {money(card.cost)}</span>
          </div>
        )}
        {!compact && (card.note || card.text) && (
          <p className="mt-2.5 text-[0.95rem] leading-snug text-ink/75">{card.text || card.note}</p>
        )}
        {compact && card.flow != null && <p className="mt-1 text-sm font-semibold text-mint-dark">+{money(card.flow)}/mes</p>}
        {children}
      </div>
    </motion.article>
  );
}

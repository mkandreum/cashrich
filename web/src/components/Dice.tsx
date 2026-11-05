import { motion } from 'motion/react';
import { useRef, type CSSProperties } from 'react';

const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
const FACES: { value: number; transform: (half: string) => string; x: number; y: number }[] = [
  { value: 1, transform: (h) => `translateZ(${h})`, x: 0, y: 0 },
  { value: 6, transform: (h) => `rotateY(180deg) translateZ(${h})`, x: 0, y: 180 },
  { value: 3, transform: (h) => `rotateY(90deg) translateZ(${h})`, x: 0, y: -90 },
  { value: 4, transform: (h) => `rotateY(-90deg) translateZ(${h})`, x: 0, y: 90 },
  { value: 2, transform: (h) => `rotateX(90deg) translateZ(${h})`, x: -90, y: 0 },
  { value: 5, transform: (h) => `rotateX(-90deg) translateZ(${h})`, x: 90, y: 0 },
];

export function Dice({ value, rolling, idle, size }: { value: number; rolling: boolean; idle?: boolean; size: string }) {
  const spins = useRef(0);
  const wasRolling = useRef(false);
  if (rolling && !wasRolling.current) spins.current += 3;
  wasRolling.current = rolling;

  const face = FACES.find((f) => f.value === value) ?? FACES[0];
  const half = 'calc(var(--die) / 2)';
  return (
    <div className="die-wrap" style={{ '--die': size } as CSSProperties}>
      <div className={idle ? 'die-idle' : undefined} style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
        <motion.div
          className="die"
          initial={false}
          animate={{
            rotateX: face.x + spins.current * 360 - 18,
            rotateY: face.y + spins.current * 360 + 22,
            scale: rolling ? [1, 1.35, 1] : 1,
          }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.3, 1] }}
          role="img"
          aria-label={value ? `Dado: ${value}` : 'Dado'}
        >
          {FACES.map((f) => (
            <div key={f.value} className="die-face" style={{ transform: f.transform(half) }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} style={{ display: 'grid' }}>{PIPS[f.value].includes(i) && <span className="die-pip" />}</div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

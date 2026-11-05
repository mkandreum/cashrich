import { useEffect, useState } from 'react';

const canFullscreen = () => typeof document.documentElement.requestFullscreen === 'function' && document.fullscreenEnabled;

/* Debe llamarse desde un toque del jugador; en iPhone el navegador no lo permite. */
export function enterFullscreen() {
  if (canFullscreen() && !document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => {});
}

export function useFullscreen() {
  const [active, setActive] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const update = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const toggle = () => (document.fullscreenElement ? void document.exitFullscreen().catch(() => {}) : enterFullscreen());
  return { supported: canFullscreen(), active, toggle };
}

/* Que el móvil no se apague entre turno y turno */
export function useKeepAwake(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState === 'visible') void navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release().catch(() => {});
    };
  }, [enabled]);
}

import { useEffect, useRef } from 'react';

const IDLE_MS = 2 * 60 * 60 * 1000; // 2 horas

export function useIdleLogout(onLogout: () => void, active: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;

    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(onLogout, IDLE_MS);
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [active, onLogout]);
}

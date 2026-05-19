import { useState, useEffect } from 'react';

export function useCountUp(target: number, duration = 900, delay = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);
    const t = setTimeout(() => {
      const start = performance.now();
      const frame = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setValue(target * eased);
        if (p < 1) requestAnimationFrame(frame);
        else setValue(target);
      };
      requestAnimationFrame(frame);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay, duration]);

  return value;
}

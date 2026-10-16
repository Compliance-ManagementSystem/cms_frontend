import { useEffect, useRef, useState } from 'react';

/**
 * Eases from the number currently shown to `target`, starting from zero on first
 * mount. With `animate` off the target is shown at once, which is what a
 * background refresh and a reduced-motion setting both want.
 */
export const useAnimatedNumber = (target: number, animate: boolean, delay = 0, duration = 900): number => {
  const [value, setValue] = useState(animate ? 0 : target);
  const shown = useRef(value);

  useEffect(() => {
    const from = shown.current;
    if (!animate || from === target) {
      shown.current = target;
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      shown.current = from + (target - from) * eased;
      setValue(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, delay, duration]);

  return value;
};

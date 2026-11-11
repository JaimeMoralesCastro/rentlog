import { useEffect, useRef, useState } from 'react';

// Anima una cifra de 0 (o valor previo) al valor objetivo.
// Respeta prefers-reduced-motion: devuelve el valor final directo.
export function useCountUp(value, { duration = 700 } = {}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const reducedMotion = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion || value === fromRef.current) { setDisplay(value); fromRef.current = value; return; }
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-quart
      const e = 1 - Math.pow(1 - t, 4);
      setDisplay(from + (value - from) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reducedMotion]);

  return display;
}

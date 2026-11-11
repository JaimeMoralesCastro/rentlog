import { useEffect, useRef } from 'react';
import { initScrollFx } from '../lib/scrollFx.js';

// Aplica parallax + reveals sobre el subárbol del ref.
// `deps` reinicia los triggers al cambiar de vista (p.ej. la pestaña activa).
export function useScrollFx(deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const cleanup = initScrollFx(ref.current);
      ref.current._fxCleanup = cleanup;
    });
    return () => {
      cancelAnimationFrame(raf);
      ref.current?._fxCleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Toggle temporal de VALIDACIÓN: fuerza el movimiento ignorando prefers-reduced-motion
// solo bajo demanda. Activable por (1) window.__previewMotion=true, (2) ?previewMotion=1,
// o (3) clase .preview-motion en <html>. No altera el comportamiento por defecto.
export function motionPreviewOn() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.__previewMotion === true) return true;
    if (new URLSearchParams(window.location.search).has('previewMotion')) return true;
    if (document.documentElement.classList.contains('preview-motion')) return true;
  } catch { /* noop */ }
  return false;
}

// Motor de motion del dashboard. Todo vive dentro de un gsap.matchMedia:
// en prefers-reduced-motion no se aplica nada y el contenido queda visible
// (salvo que motionPreviewOn() lo fuerce, solo para validar en preview).
//
// Atributos soportados (data-*):
//   data-parallax="-190"  → desplazamiento vertical con el scroll (px, negativo = sube antes)
//   data-cursor="26"      → sigue al cursor (px de amplitud). Usa translate, no choca con parallax de scroll
//   data-tilt="8"         → inclinación 3D hacia el cursor al pasar por encima (grados) + depresión al click
//   data-reveal           → entra al 82% del viewport, una vez
export function initScrollFx(root) {
  if (!root) return () => {};

  const mm = gsap.matchMedia();
  const query = motionPreviewOn() ? 'all' : '(prefers-reduced-motion: no-preference)';

  mm.add(query, () => {
      const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const cleanups = [];

      const ctx = gsap.context(() => {
        // ---- Parallax de scroll (fuerte) ----
        // Anclado: en su posición natural al cargar (y:0) y deriva al hacer scroll.
        gsap.utils.toArray('[data-parallax]').forEach((el) => {
          const shift = parseFloat(el.dataset.parallax) || -120;
          gsap.fromTo(
            el,
            { y: 0 },
            {
              y: shift,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.5 },
            }
          );
        });

        // ---- Reveal al entrar ----
        gsap.utils.toArray('[data-reveal]').forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 16 },
            {
              opacity: 1, y: 0, duration: 0.72, ease: 'expo.out',
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            }
          );
        });

        ScrollTrigger.refresh();
      }, root);
      cleanups.push(() => ctx.revert());

      // ---- Parallax de cursor (todo se mueve al mover el ratón) ----
      if (fine) {
        const cursorEls = gsap.utils.toArray(root.querySelectorAll('[data-cursor]')).map((el) => ({
          xTo: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3' }),
          yTo: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3' }),
          depth: parseFloat(el.dataset.cursor) || 24,
        }));

        if (cursorEls.length) {
          const onMove = (e) => {
            const nx = e.clientX / window.innerWidth - 0.5;
            const ny = e.clientY / window.innerHeight - 0.5;
            cursorEls.forEach((c) => { c.xTo(nx * c.depth); c.yTo(ny * c.depth); });
          };
          window.addEventListener('pointermove', onMove, { passive: true });
          cleanups.push(() => window.removeEventListener('pointermove', onMove));
        }

        // ---- Tilt 3D al pasar por encima + depresión al click ----
        gsap.utils.toArray(root.querySelectorAll('[data-tilt]')).forEach((el) => {
          const max = parseFloat(el.dataset.tilt) || 4;
          gsap.set(el, { transformPerspective: 1200, transformOrigin: 'center' });
          const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power2' });
          const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power2' });
          const sc = gsap.quickTo(el, 'scale', { duration: 0.4, ease: 'power2' });

          const onMove = (e) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            ry(px * max);
            rx(-py * max);
          };
          const onEnter = () => { sc(1.008); el.style.zIndex = '5'; };
          const onLeave = () => { rx(0); ry(0); sc(1); el.style.zIndex = ''; };
          const onDown = () => sc(0.99);
          const onUp = () => sc(1.008);

          el.addEventListener('pointerenter', onEnter);
          el.addEventListener('pointermove', onMove);
          el.addEventListener('pointerleave', onLeave);
          el.addEventListener('pointerdown', onDown);
          el.addEventListener('pointerup', onUp);
          cleanups.push(() => {
            el.removeEventListener('pointerenter', onEnter);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerleave', onLeave);
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointerup', onUp);
          });
        });
      }

      return () => cleanups.forEach((fn) => fn());
    }
  );

  return () => mm.revert();
}

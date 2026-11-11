import { useState, useRef, useEffect } from 'react';

// Desplegable propio (nunca <select> nativo). Sin caja: etiqueta en grotesca
// mayúscula sobre una regla; el panel es un bloque plano con hairline.
export default function Select({ value, onChange, options = [], placeholder = 'Seleccionar', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const items = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const selected = items.find(i => i.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 bg-transparent border-0 border-b py-2 text-left label
          ${open ? 'border-ink-900' : 'border-hairline hover:border-ink-900'}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span
          aria-hidden
          className={`text-[10px] leading-none shrink-0 transition-transform duration-220 ease-out ${open ? 'rotate-180' : ''}`}
        >▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-40 mt-px w-full min-w-[180px] bg-white border border-hairline py-2 max-h-72 overflow-y-auto animate-fade-in"
        >
          {items.map(item => {
            const active = item.value === value;
            return (
              <li key={item.value ?? '__empty'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { onChange(item.value); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2 text-[14px] text-left hover:underline underline-offset-[3px]"
                >
                  <span className="truncate">{item.label}</span>
                  {active && <span aria-hidden className="shrink-0 text-[11px]">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';

// Reconoce el enlace iCal correcto de Airbnb / Booking y avisa cuando el
// cliente pega el enlace público del anuncio u otra cosa.
//
// platform: 'airbnb' | 'booking'
function validateIcalUrl(platform, url) {
  const v = (url ?? '').trim();
  if (!v) return { state: 'empty' };

  let u;
  try { u = new URL(v); } catch { return { state: 'invalid', reason: 'No parece una dirección web.' }; }

  const host = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();

  if (platform === 'airbnb') {
    if (!/airbnb\./.test(host)) return { state: 'invalid', reason: 'Este enlace no es de Airbnb.' };
    // Enlace público del anuncio
    if (path.includes('/rooms/') || path.includes('/h/') || path.includes('/users/'))
      return { state: 'wrong-link', reason: 'Has pegado el enlace público del anuncio. Necesitamos el enlace iCal del calendario (acaba en .ics).' };
    // Correcto: /calendar/ical/<id>.ics
    if (path.includes('/calendar/ical') && path.endsWith('.ics')) return { state: 'ok' };
    return { state: 'wrong-link', reason: 'Este enlace de Airbnb no es el de exportación de calendario. Debe contener «/calendar/ical/» y acabar en «.ics».' };
  }

  // Booking
  if (!/booking\./.test(host)) return { state: 'invalid', reason: 'Este enlace no es de Booking.' };
  if (path.endsWith('.ics') || u.search.includes('.ics') || /ical/i.test(v)) return { state: 'ok' };
  return { state: 'wrong-link', reason: 'No parece el enlace iCal de Booking. Debe acabar en «.ics» o incluir «ical».' };
}

const PLATFORM_META = {
  airbnb: {
    label: 'Airbnb',
    placeholder: 'https://www.airbnb.com/calendar/ical/12345.ics?s=...',
    steps: [
      'Entra en airbnb.com con tu cuenta de anfitrión.',
      'Arriba: Hosting → Calendario.',
      'Selecciona el anuncio del que quieras importar.',
      'En el panel derecho: Disponibilidad → Sincronizar calendarios.',
      'Pulsa Exportar calendario y copia el enlace que aparece.',
      'Pégalo aquí abajo.',
    ],
  },
  booking: {
    label: 'Booking',
    placeholder: 'https://admin.booking.com/hotel/...ical...',
    steps: [
      'Entra en el Extranet de Booking con tu usuario de anfitrión.',
      'Tarifas y disponibilidad → Sincronizar calendarios.',
      'Selecciona la habitación y pulsa Exportar calendario.',
      'Copia el enlace .ics y pégalo aquí.',
    ],
  },
};

// Estilo editorial (DESIGN.md): sin cajas ni rings ni tintes; campo con regla
// inferior, mensajes en tinta con un glifo, jerarquía por escala y vacío.
export default function IcalUrlInput({ platform, value, onChange }) {
  const [showHelp, setShowHelp] = useState(false);
  const meta = PLATFORM_META[platform];
  const result = useMemo(() => validateIcalUrl(platform, value), [platform, value]);
  const bad = result.state === 'wrong-link' || result.state === 'invalid';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className="label">URL iCal de {meta.label}</span>
        <button type="button" onClick={() => setShowHelp(s => !s)} className="action inline-flex items-center gap-1">
          ¿Dónde lo consigo?
          <span aria-hidden className={`text-[9px] leading-none transition-transform duration-220 ${showHelp ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {/* Pasos plegables */}
      {showHelp && (
        <div className="hair-top pt-3 animate-fade-in">
          <p className="text-[12px] font-medium text-ink-900 mb-2">Cómo conseguir tu enlace iCal en {meta.label}</p>
          <ol className="text-[13px] text-ink-500 leading-relaxed list-decimal pl-4 space-y-1">
            {meta.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <p className="text-[12px] text-ink-500 mt-3 leading-relaxed">
            El enlace correcto acaba en <span className="text-ink-900 tabular">.ics</span> y solo lo ves tú como anfitrión.
            <span className="text-ink-900"> No es el enlace que compartes con huéspedes.</span>
          </p>
        </div>
      )}

      {/* Campo */}
      <div className="relative">
        <input
          type="url"
          className="field pr-6"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={meta.placeholder}
          autoComplete="off"
          spellCheck="false"
        />
        {result.state === 'ok' && <span aria-hidden className="absolute right-0 top-1/2 -translate-y-1/2 text-[13px] leading-none">✓</span>}
        {bad && <span aria-hidden className="absolute right-0 top-1/2 -translate-y-1/2 text-[13px] leading-none font-bold">!</span>}
      </div>

      {/* Mensaje */}
      {result.state === 'wrong-link' && (
        <p className="text-[12.5px] text-ink-900 leading-snug">
          <span className="font-medium">Ese no es el enlace correcto.</span> {result.reason}{' '}
          <button type="button" onClick={() => setShowHelp(true)} className="sublink text-ink-900 underline">Ver pasos</button>.
        </p>
      )}
      {result.state === 'invalid' && <p className="text-[12.5px] text-ink-900">{result.reason}</p>}
      {result.state === 'ok' && <p className="text-[12.5px] text-ink-500">Enlace correcto detectado.</p>}
    </div>
  );
}

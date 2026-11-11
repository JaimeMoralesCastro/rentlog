import { useState } from 'react';
import Select from './Select.jsx';
import { analyzeReview, sentimentLabel } from '../finance/reviewSentiment.js';

// Detecta una valoración tipo "5★", "5/5", "5 estrellas" al inicio del bloque
function detectRating(text) {
  const m = text.match(/(\b[1-5])(?:\s*\/\s*5|\s*★|\s*estrellas?|\s*stars?)/i);
  return m ? Number(m[1]) : null;
}

// Separa un texto pegado en reseñas individuales (bloques por línea en blanco).
function splitReviews(raw) {
  return raw
    .split(/\n\s*\n+/)            // separa por líneas en blanco
    .map(s => s.trim())
    .filter(s => s.length > 10)   // descarta líneas sueltas/ruido
    .map(text => ({ text, rating: detectRating(text) }));
}

export default function ReviewImport({ properties = [], onImport, onClose }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '');
  const [source, setSource] = useState('Airbnb');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const parsed = splitReviews(raw);

  const readFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setRaw(prev => (prev ? prev + '\n\n' : '') + text);
  };

  const confirm = async () => {
    if (parsed.length === 0) return;
    setBusy(true);
    const rows = parsed.map(p => ({ ...p, property_id: propertyId || null, source }));
    const res = await onImport(rows);
    setBusy(false);
    setDone(res);
  };

  const field = 'w-full';

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas-card w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[92vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-canvas-card z-10">
          <h2 className="text-base font-semibold text-ink-900">Importar reseñas</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-400 hover:text-ink-900 text-[22px] leading-none w-8 h-8 -mr-1.5 flex items-center justify-center rounded-lg">×</button>
        </header>

        {done ? (
          <div className="px-5 py-10 flex flex-col items-center text-center gap-2">
            <span aria-hidden className="text-income text-[32px] leading-none">✓</span>
            <p className="text-sm font-semibold text-ink-900">{done.inserted} reseñas importadas y analizadas</p>
            <p className="text-xs text-ink-500">Ya tienes su sentimiento por aspecto en esta sección.</p>
            <button onClick={onClose} className="mt-3 px-5 py-2.5 rounded-xl bg-peach-500 hover:bg-peach-600 text-white text-sm font-semibold">Listo</button>
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-ink-700 mb-1 block">Propiedad</label>
                <Select className={field} value={propertyId} onChange={setPropertyId}
                  options={[{ value: '', label: 'Sin asignar' }, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-700 mb-1 block">Canal</label>
                <Select className={field} value={source} onChange={setSource} options={['Airbnb', 'Booking', 'Vrbo', 'Directo']} />
              </div>
            </div>

            {/* Las dos opciones para importar reseñas — sección plana con hairline */}
            <div className="border-t border-ink-100 pt-4">
              <p className="text-eyebrow mb-2">Tienes dos formas de traer tus reseñas</p>
              <div className="flex flex-col gap-1.5 text-[11px] text-ink-700 leading-relaxed">
                <p><strong className="text-ink-900">1. Cópialas y pégalas tú.</strong> Entra en tu listado de Airbnb o Booking, copia el texto de tus reseñas y pégalo abajo.</p>
                <p><strong className="text-ink-900">2. Sube el archivo.</strong> Pide tus datos a Airbnb en <strong>Cuenta → Privacidad → Solicitar tus datos</strong> (o descárgalas del <strong>Extranet → Reseñas</strong> de Booking) y súbelo abajo.</p>
              </div>
            </div>

            {/* Pegar / subir */}
            <div>
              <label className="text-xs font-medium text-ink-700 mb-1 block">Pega aquí todas tus reseñas (deja una línea en blanco entre cada una)</label>
              <textarea
                value={raw}
                onChange={e => setRaw(e.target.value)}
                rows={7}
                placeholder={'Apartamento muy limpio y céntrico. El anfitrión, atento. Repetiríamos.\n\nBuena ubicación pero se oía ruido de la calle por la noche.\n\n...'}
                className="w-full bg-canvas border border-ink-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-300 resize-none"
              />
              <label className="mt-2 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900 cursor-pointer sublink">
                o subir un archivo (.txt / .csv)
                <input type="file" accept=".txt,.csv,text/plain,text/csv" className="hidden" onChange={e => readFile(e.target.files?.[0])} />
              </label>
            </div>

            {/* Preview — bloque plano con hairline */}
            {parsed.length > 0 && (
              <div className="border-t border-ink-100 pt-3">
                <p className="text-xs font-medium text-ink-900 mb-2">{parsed.length} reseñas detectadas</p>
                <ul className="max-h-40 overflow-y-auto flex flex-col">
                  {parsed.slice(0, 6).map((p, i) => {
                    const a = analyzeReview(p.text, p.rating);
                    const label = sentimentLabel(a.sentiment);
                    const color = label === 'positivo' ? '#0F8F65' : label === 'negativo' ? '#C2410C' : '#8E8E96';
                    return (
                      <li key={i} className={`py-2 flex items-start gap-2 ${i > 0 ? 'hair-top' : ''}`}>
                        {p.rating && <span className="flex items-center gap-0.5 text-[11px] text-ink-900 shrink-0"><span aria-hidden className="text-ink-900">★</span>{p.rating}</span>}
                        <span className="text-[11px] text-ink-600 truncate flex-1">{p.text}</span>
                        <span className="text-[10px] font-medium shrink-0" style={{ color }}>{label}</span>
                      </li>
                    );
                  })}
                  {parsed.length > 6 && <li className="py-1.5 text-[11px] text-ink-500 text-center">y {parsed.length - 6} más…</li>}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-100 text-sm font-medium text-ink-700 hover:bg-ink-100/50">Cancelar</button>
              <button onClick={confirm} disabled={busy || parsed.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-peach-500 hover:bg-peach-600 text-white text-sm font-semibold disabled:opacity-50">
                {busy ? 'Analizando…' : `Importar ${parsed.length || ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

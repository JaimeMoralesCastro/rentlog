import { useState, useMemo, useEffect } from 'react';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import { buildRateCalendar } from '../finance/pricing.js';
import { loadRateOverrides, setRateOverride } from '../lib/rateStore.js';
import { formatDate } from '../finance/dateHelpers.js';

const WD = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// C2 — Smart Rate noche a noche (calendario, sustituye a PriceLabs).
// `propId`/`embedded`: cuando vive dentro de Predicciones, el piso lo controla
// el hub y no se pinta ni hero ni selector propios.
export default function SmartRateCalendar({ data, propId: propIdProp, embedded = false }) {
  const { properties, reservations } = data;
  const [propIdState, setPropId] = useState(properties[0]?.id ?? null);
  const propId = propIdProp !== undefined ? propIdProp : propIdState;
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [overrides, setOverrides] = useState({});
  const [selected, setSelected] = useState(null); // dateKey
  const [draft, setDraft] = useState('');

  const property = properties.find(p => p.id === propId) || null;

  useEffect(() => {
    setSelected(null);
    if (!propId) { setOverrides({}); return; }
    let cancelled = false;
    loadRateOverrides(propId).then(m => { if (!cancelled) setOverrides(m); });
    return () => { cancelled = true; };
  }, [propId]);

  const cal = useMemo(
    () => (property ? buildRateCalendar(property, reservations, { ...cursor, overrides }) : null),
    [property, reservations, cursor, overrides]
  );

  const priced = cal ? cal.days.filter(d => !d.booked && !d.isPast) : [];
  const avg = priced.length ? Math.round(priced.reduce((s, d) => s + d.price, 0) / priced.length) : 0;
  const editedCount = cal ? cal.days.filter(d => d.override != null).length : 0;

  const move = (delta) => {
    setSelected(null);
    setCursor(c => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const selectDay = (d) => {
    if (d.booked || d.isPast) return;
    setSelected(d.date);
    setDraft(d.override != null ? String(d.override) : '');
  };

  const applyOverride = async (dateKey, value) => {
    const next = await setRateOverride(propId, dateKey, value);
    setOverrides({ ...next });
  };

  const selDay = cal?.days.find(d => d.date === selected) || null;

  if (!property) {
    const body = (
      <div className="py-16">
        <p className="font-display text-h2 mb-2">Añade una propiedad primero</p>
        <p className="text-[15px] text-ink-500">El calendario sugiere un precio para cada noche según temporada, zona y ocupación.</p>
      </div>
    );
    if (embedded) return body;
    return (
      <div className="page pb-16">
        <PageHeader eyebrow="Precios" title="Tarifas inteligentes" />
        {body}
      </div>
    );
  }

  const subtitle = `${property.name} · ${cal.season} · precio medio sugerido ${avg} €/noche` + (editedCount ? ` · ${editedCount} ajustada${editedCount === 1 ? '' : 's'}` : '');

  return (
    <div className={embedded ? '' : 'page pb-16'}>
      {embedded ? (
        <header className="mb-10">
          <p className="label mb-2">Tarifas inteligentes</p>
          <h2 className="font-display text-[40px] leading-none tracking-tight">Precio por noche</h2>
          <p className="text-[15px] text-ink-500 mt-3">{subtitle}</p>
        </header>
      ) : (
        <PageHeader
          eyebrow="Precios"
          title="Tarifas inteligentes"
          subtitle={subtitle}
          actions={
            <Select className="w-full sm:w-44" value={propId} onChange={setPropId}
              options={properties.map(p => ({ value: p.id, label: p.name }))} />
          }
        />
      )}

      {/* Navegación de mes */}
      <div className="flex items-center justify-between mb-6" data-reveal>
        <button onClick={() => move(-1)} className="text-[22px] leading-none hover:opacity-60" aria-label="Mes anterior">‹</button>
        <h2 className="font-display text-h2">{MONTHS[cursor.month]} {cursor.year}</h2>
        <button onClick={() => move(1)} className="text-[22px] leading-none hover:opacity-60" aria-label="Mes siguiente">›</button>
      </div>

      {/* Cabecera de días */}
      <div className="grid grid-cols-7 mb-2">
        {WD.map(d => <div key={d} className="text-center text-[10px] uppercase tracking-[0.1em] font-medium text-ink-400 py-1">{d}</div>)}
      </div>

      {/* Rejilla: celdas separadas por hairlines (gap-px sobre fondo hairline). */}
      <div className="grid grid-cols-7 gap-px bg-hairline border border-hairline" data-reveal>
        {cal.days[0] && Array.from({ length: cal.days[0].leadingBlanks }).map((_, i) => <div key={`b${i}`} className="bg-white" />)}
        {cal.days.map(d => (
          <RateCell key={d.date} d={d} selected={selected === d.date} onClick={() => selectDay(d)} />
        ))}
      </div>

      {/* Detalle / edición de la noche seleccionada: bloque con regla, sin caja. */}
      {selDay && (
        <div className="mt-10 hair-top pt-8" data-reveal>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="label mb-2">{formatDate(selDay.date)} {selDay.isWeekend && <span className="text-ink-400">· fin de semana</span>}</p>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-[32px] leading-none tabular">{selDay.price} €</span>
                {selDay.override != null && <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-900">ajustado por ti</span>}
              </div>
              <p className="text-[13px] text-ink-500 mt-2">
                Sugerido {selDay.suggested} € · base {property.base_rate || '—'} €
                {selDay.deltaPct !== 0 && <span className="text-ink-900"> · {selDay.deltaPct > 0 ? '↑' : '↓'} {Math.abs(selDay.deltaPct)}%</span>}
              </p>
            </div>
            <div className="flex items-end gap-6">
              <label className="block">
                <span className="label block mb-1">Tu precio</span>
                <input
                  type="number" value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyOverride(selDay.date, draft); }}
                  placeholder={String(selDay.suggested)}
                  className="field w-28 tabular" />
              </label>
              <button onClick={() => applyOverride(selDay.date, draft)} className="cta">Fijar</button>
              {selDay.override != null && (
                <button onClick={() => { applyOverride(selDay.date, null); setDraft(''); }} className="action">Usar sugerido</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leyenda + nota */}
      <div className="flex items-center gap-6 mt-10 text-[12px] text-ink-500 flex-wrap">
        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#FAFAFA] border border-hairline" /> fin de semana</span>
        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#F2F2F2]" /> reservado</span>
        <span className="flex items-center gap-2"><span className="underline underline-offset-2 decoration-accent">99€</span> ajustado por ti</span>
      </div>
      <p className="text-[12px] text-ink-500 mt-4 max-w-[60ch]">
        Los precios se calculan con la estacionalidad real de la demanda (INE), tu zona y tu ocupación.
        Ajusta cualquier noche a mano. Empujar estos precios a Airbnb/Booking automáticamente llegará al
        conectar tu cuenta.
      </p>
    </div>
  );
}

function RateCell({ d, selected, onClick }) {
  const base = 'relative h-[62px] sm:h-[74px] p-2 text-left flex flex-col';
  if (d.booked) {
    return (
      <div className={`${base} bg-[#F2F2F2] cursor-default`} title={`Reservado · ${d.guest}`}>
        <span className="text-[11px] text-ink-400 tabular">{d.day}</span>
        <span className="mt-auto text-[10px] uppercase tracking-[0.08em] text-ink-400 truncate leading-tight">Reservado</span>
      </div>
    );
  }
  const tint = d.isWeekend ? 'bg-[#FAFAFA]' : 'bg-white';
  const sel = selected ? 'outline outline-2 -outline-offset-2 outline-ink-900 z-10' : '';
  const past = d.isPast ? 'opacity-40' : 'hover:bg-[#F7F7F7]';
  return (
    <button onClick={onClick} className={`${base} ${tint} ${sel} ${past}`}>
      <span className="text-[11px] text-ink-400 tabular">{d.day}</span>
      <span className={`mt-auto text-[14px] tabular ${d.override != null ? 'text-ink-900 underline underline-offset-[3px] decoration-accent' : 'text-ink-900'}`}>{d.price}€</span>
    </button>
  );
}

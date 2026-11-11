import { useState, useMemo, useEffect, useRef } from 'react';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import { emptyGuidebook, SECTIONS, REC_CATEGORIES, guidebookCompleteness, guidebookSlug } from '../finance/guidebook.js';
import { loadGuidebook, saveGuidebook } from '../lib/guidebookStore.js';
import { DEMO_GUIDEBOOKS } from '../lib/demoData.js';
import { isConfigured, keepaliveUpsert } from '../lib/supabase.js';

// C3 — Guidebook digital por piso (sustituye a Touch Stay).
// El anfitrión rellena la guía; el huésped la ve en una página limpia.
export default function Guidebook({ data }) {
  const { properties } = data;
  const [propId, setPropId] = useState(properties[0]?.id ?? null);
  const [view, setView] = useState('edit'); // 'edit' | 'preview'
  const [gb, setGb] = useState(emptyGuidebook());
  const [copied, setCopied] = useState('');

  const property = properties.find(p => p.id === propId) || null;

  // Carga la guía al cambiar de propiedad (guardada > demo > vacía)
  useEffect(() => {
    if (!propId) return;
    let cancelled = false;
    loadGuidebook(propId).then(saved => {
      if (cancelled) return;
      const demo = !isConfigured ? DEMO_GUIDEBOOKS[propId] : null;
      setGb({ ...emptyGuidebook(), ...(saved || demo || {}) });
    });
    return () => { cancelled = true; };
  }, [propId]);

  // Guardado con debounce: no lanzamos una escritura por cada tecla.
  const saveTimer = useRef(null);
  const pending = useRef(null); // { propId, gb } editado pero aún sin guardar
  const persist = (next) => {
    setGb(next);
    if (!propId) return;
    pending.current = { propId, gb: next };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveGuidebook(propId, next); pending.current = null; }, 500);
  };

  // No perder la última edición al refrescar/cerrar o cambiar de sección:
  // flush del pendiente con keepalive (o localStorage en demo).
  useEffect(() => {
    const flush = () => {
      if (!pending.current) return;
      clearTimeout(saveTimer.current);
      const { propId: pid, gb: g } = pending.current;
      pending.current = null;
      if (isConfigured) keepaliveUpsert('guidebooks', { property_id: pid, content: g, updated_at: new Date().toISOString() }, 'property_id');
      else saveGuidebook(pid, g);
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);
  const setField = (key, value) => persist({ ...gb, [key]: value });

  const completeness = useMemo(() => guidebookCompleteness(gb), [gb]);
  const slug = useMemo(() => (property ? guidebookSlug(property) : ''), [property]);
  const publicUrl = `rentlog.app/g/${slug}`;

  const copy = (text, tag) => {
    try { navigator.clipboard?.writeText(text); } catch { /* noop */ }
    setCopied(tag); setTimeout(() => setCopied(''), 1600);
  };

  if (!property) {
    return (
      <div className="page pb-16">
        <PageHeader eyebrow="Guía del huésped" title="Guía digital" />
        <div className="py-16 text-center">
          <p className="text-[16px] font-semibold text-ink-900 mb-1">Añade una propiedad primero</p>
          <p className="text-[13px] text-ink-500">La guía se crea por piso: bienvenida, wifi, normas y recomendaciones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Guía del huésped"
        title="Guía digital"
        subtitle={`${property.name} · ${completeness}% completada`}
        actions={
          <>
            <Select
              className="w-full sm:w-44" value={propId} onChange={setPropId}
              options={properties.map(p => ({ value: p.id, label: p.name }))}
            />
            <div className="flex items-center gap-5">
              <button onClick={() => setView('edit')} className={`action ${view === 'edit' ? 'underline' : ''}`}>Editar</button>
              <button onClick={() => setView('preview')} className={`action ${view === 'preview' ? 'underline' : ''}`}>Vista huésped</button>
            </div>
          </>
        }
      />

      {/* Completado (regla que se llena, único acento) + enlace público stub */}
      <div className="mb-16" data-reveal>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-0.5 bg-hairline relative">
            <div className="absolute left-0 top-0 h-0.5 bg-accent transition-all duration-500" style={{ width: `${completeness}%` }} />
          </div>
          <span className="label tabular shrink-0">{completeness}% completada</span>
        </div>
        <p className="text-[13px] text-ink-500">
          Enlace para el huésped: <span className="text-ink-900 tabular">{publicUrl}</span>
          <button onClick={() => copy(publicUrl, 'url')} className="action ml-3">{copied === 'url' ? 'copiado' : 'copiar'}</button>
          <span className="text-ink-300 mx-2">·</span>se activa al conectar tu cuenta
        </p>
      </div>

      {view === 'edit' ? (
        <Editor gb={gb} setField={setField} persist={persist} />
      ) : (
        <GuestPreview gb={gb} property={property} onCopyWifi={() => copy(gb.wifi_password, 'wifi')} copiedWifi={copied === 'wifi'} />
      )}
    </div>
  );
}

function Editor({ gb, setField, persist }) {
  return (
    <div className="flex flex-col gap-16" data-reveal>
      {SECTIONS.map(sec => (
        <section key={sec.id}>
          <div className="hair-bottom pb-3 mb-6">
            <h2 className="font-display text-[21px] leading-tight">{sec.title}</h2>
            <p className="text-[13px] text-ink-500 mt-1">{sec.hint}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {sec.fields.map(f => (
              <label key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2 block' : 'block'}>
                <span className="label block mb-2">{f.label}</span>
                {f.type === 'textarea' ? (
                  <textarea
                    value={gb[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder} rows={3}
                    className="w-full border border-hairline px-3 py-2.5 text-[15px] text-ink-900 bg-transparent resize-y focus:outline-none focus:border-ink-900"
                  />
                ) : (
                  <input
                    value={gb[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder} className="field"
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}

      <RecommendationsEditor gb={gb} persist={persist} />
    </div>
  );
}

function RecommendationsEditor({ gb, persist }) {
  const recs = gb.recommendations || [];
  const add = () => persist({ ...gb, recommendations: [...recs, { name: '', category: REC_CATEGORIES[0], note: '' }] });
  const update = (i, patch) => persist({ ...gb, recommendations: recs.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const remove = (i) => persist({ ...gb, recommendations: recs.filter((_, j) => j !== i) });

  return (
    <section>
      <div className="hair-bottom pb-3 mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[21px] leading-tight">Recomendaciones de la zona</h2>
          <p className="text-[13px] text-ink-500 mt-1">Tus sitios favoritos cerca del piso. Lo que más agradecen los huéspedes.</p>
        </div>
        <button onClick={add} className="action shrink-0">Añadir</button>
      </div>
      {recs.length === 0 ? (
        <p className="text-[14px] text-ink-500 py-4">Aún no has añadido recomendaciones.</p>
      ) : (
        <ul className="flex flex-col">
          {recs.map((r, i) => (
            <li key={i} className={`grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_2fr_auto] gap-x-6 gap-y-2 items-center py-4 ${i > 0 ? 'hair-top' : ''}`}>
              <input value={r.name} onChange={e => update(i, { name: e.target.value })} placeholder="Nombre" className="field" />
              <Select value={r.category} onChange={v => update(i, { category: v })} options={REC_CATEGORIES.map(c => ({ value: c, label: c }))} />
              <input value={r.note} onChange={e => update(i, { note: e.target.value })} placeholder="Por qué te gusta" className="field" />
              <button onClick={() => remove(i)} className="action justify-self-start sm:justify-self-end" aria-label="Eliminar">Quitar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Vista del huésped — página limpia, enmarcada como en un móvil.
function GuestPreview({ gb, property, onCopyWifi, copiedWifi }) {
  const has = v => v && String(v).trim();
  return (
    <div className="flex justify-center" data-reveal>
      <div className="w-full max-w-[420px] rounded-[28px] border border-ink-200 bg-surface shadow-pop overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 pt-8 pb-6 bg-accent text-ink-900">
          <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1.5">Guía del huésped</p>
          <h3 className="text-[24px] font-semibold tracking-tight leading-tight">{property.name}</h3>
          {has(property.city) && <p className="text-[13px] opacity-80 mt-1">{property.city}</p>}
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {has(gb.welcome) && <p className="text-[14px] text-ink-700 leading-relaxed">{gb.welcome}</p>}

          {(has(gb.checkin_time) || has(gb.checkout_time) || has(gb.access) || has(gb.parking)) && (
            <PreviewSection title="Llegada y salida">
              {(has(gb.checkin_time) || has(gb.checkout_time)) && (
                <div className="flex gap-6 mb-2">
                  {has(gb.checkin_time) && <div><p className="text-eyebrow mb-0.5">Entrada</p><p className="text-[13.5px] font-medium text-ink-900">{gb.checkin_time}</p></div>}
                  {has(gb.checkout_time) && <div><p className="text-eyebrow mb-0.5">Salida</p><p className="text-[13.5px] font-medium text-ink-900">{gb.checkout_time}</p></div>}
                </div>
              )}
              {has(gb.access) && <PreviewText label="Cómo acceder" value={gb.access} />}
              {has(gb.parking) && <PreviewText label="Aparcamiento" value={gb.parking} />}
            </PreviewSection>
          )}

          {(has(gb.wifi_network) || has(gb.wifi_password)) && (
            <PreviewSection title="WiFi">
              <div className="rounded-xl bg-ink-50 p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {has(gb.wifi_network) && <p className="text-[13.5px] font-semibold text-ink-900 truncate">{gb.wifi_network}</p>}
                  {has(gb.wifi_password) && <p className="text-[13px] text-ink-500 tabular truncate">{gb.wifi_password}</p>}
                </div>
                {has(gb.wifi_password) && (
                  <button onClick={onCopyWifi} className="shrink-0 h-8 px-3 rounded-lg bg-accent text-ink-900 text-[12px] font-medium">
                    {copiedWifi ? 'Copiado ✓' : 'Copiar'}
                  </button>
                )}
              </div>
            </PreviewSection>
          )}

          {has(gb.house) && <PreviewSection title="La casa"><PreviewText value={gb.house} /></PreviewSection>}
          {has(gb.rules) && <PreviewSection title="Normas"><PreviewText value={gb.rules} /></PreviewSection>}

          {gb.recommendations?.length > 0 && (
            <PreviewSection title="Recomendaciones">
              <ul className="flex flex-col gap-3">
                {gb.recommendations.filter(r => has(r.name)).map((r, i) => (
                  <li key={i} className={i > 0 ? 'hair-top pt-3' : ''}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13.5px] font-medium text-ink-900">{r.name}</p>
                      <span className="text-[10px] uppercase tracking-wider text-ink-400 shrink-0">{r.category}</span>
                    </div>
                    {has(r.note) && <p className="text-[12.5px] text-ink-500 mt-0.5">{r.note}</p>}
                  </li>
                ))}
              </ul>
            </PreviewSection>
          )}

          {(has(gb.host_phone) || has(gb.host_name) || has(gb.emergency)) && (
            <PreviewSection title="Contacto y emergencias">
              {(has(gb.host_name) || has(gb.host_phone)) && (
                <p className="text-[13.5px] text-ink-900 mb-1">
                  {has(gb.host_name) && <span className="font-medium">{gb.host_name}</span>}
                  {has(gb.host_phone) && <span className="text-ink-500">{has(gb.host_name) ? ' · ' : ''}{gb.host_phone}</span>}
                </p>
              )}
              {has(gb.emergency) && <PreviewText value={gb.emergency} />}
            </PreviewSection>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewSection({ title, children }) {
  return (
    <section>
      <h4 className="text-eyebrow mb-2.5">{title}</h4>
      {children}
    </section>
  );
}

function PreviewText({ label, value }) {
  return (
    <div className="mb-2 last:mb-0">
      {label && <p className="text-[11px] font-medium text-ink-400 mb-0.5">{label}</p>}
      <p className="text-[13px] text-ink-700 leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
}

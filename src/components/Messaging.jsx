import { useState, useMemo, useRef, useEffect } from 'react';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import { VARIABLES, buildContext, renderTemplate, missingVariables } from '../finance/messaging.js';
import { loadTemplates, saveTemplates } from '../lib/messagingStore.js';
import { loadGuidebook } from '../lib/guidebookStore.js';
import { DEMO_GUIDEBOOKS } from '../lib/demoData.js';
import { isConfigured, keepaliveUpsert } from '../lib/supabase.js';
import { formatDate } from '../finance/dateHelpers.js';

// C4 — Plantillas de mensajería. Edita plantillas con variables y genera el
// mensaje listo para una reserva concreta. El envío automático llegará con Premium.
// `embedded`: se renderiza como sección (sin hero) para vivir bajo la Guía.
export default function Messaging({ data, embedded = false }) {
  const { properties, reservations } = data;
  const [templates, setTemplates] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [resId, setResId] = useState(null);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef(null);

  const active = templates.find(t => t.id === activeId) || null;

  useEffect(() => {
    let cancelled = false;
    loadTemplates().then(list => {
      if (cancelled) return;
      setTemplates(list);
      setActiveId(prev => prev ?? list[0]?.id ?? null);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Guardado con debounce: no escribimos en cada tecla.
  const saveTimer = useRef(null);
  const pending = useRef(null); // lista editada aún sin guardar
  const persist = (next) => {
    setTemplates(next);
    pending.current = next;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveTemplates(next); pending.current = null; }, 500);
  };

  // No perder la última edición al refrescar/cerrar o cambiar de sección.
  useEffect(() => {
    const flush = () => {
      if (!pending.current) return;
      clearTimeout(saveTimer.current);
      const next = pending.current;
      pending.current = null;
      if (isConfigured) {
        keepaliveUpsert('message_templates',
          next.map((t, i) => ({ id: t.id, name: t.name || 'Sin nombre', moment: t.moment || null, body: t.body || '', sort_order: i })),
          'id');
      } else saveTemplates(next);
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);
  const updateActive = (patch) => persist(templates.map(t => (t.id === activeId ? { ...t, ...patch } : t)));

  const addTemplate = () => {
    const id = `tpl-${Date.now()}`;
    const next = [...templates, { id, name: 'Plantilla nueva', moment: '', body: 'Hola {{huesped}},\n\n' }];
    persist(next); setActiveId(id);
  };
  const removeTemplate = (id) => {
    const next = templates.filter(t => t.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const insertVar = (key) => {
    const ta = bodyRef.current;
    const token = `{{${key}}}`;
    if (!ta || !active) return;
    const start = ta.selectionStart ?? active.body.length;
    const end = ta.selectionEnd ?? start;
    const body = active.body.slice(0, start) + token + active.body.slice(end);
    updateActive({ body });
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + token.length; });
  };

  // Contexto para la vista previa a partir de la reserva elegida
  const reservation = reservations.find(r => r.id === resId) || null;
  const property = reservation ? properties.find(p => p.id === reservation.property_id) : null;
  const [guidebook, setGuidebook] = useState(null);
  useEffect(() => {
    if (!property) { setGuidebook(null); return; }
    let cancelled = false;
    loadGuidebook(property.id).then(g => {
      if (cancelled) return;
      setGuidebook(g || (!isConfigured ? DEMO_GUIDEBOOKS[property.id] : null));
    });
    return () => { cancelled = true; };
  }, [property?.id]);
  const context = useMemo(() => buildContext({ reservation, property, guidebook }), [reservation, property, guidebook]);

  const rendered = active ? renderTemplate(active.body, context) : '';
  const missing = active && reservation ? missingVariables(active.body, context) : [];

  const resOptions = useMemo(() => {
    const nameOf = id => properties.find(p => p.id === id)?.name ?? '';
    return [...reservations]
      .filter(r => r.status !== 'cancelled')
      .sort((a, b) => new Date(b.check_in) - new Date(a.check_in))
      .map(r => ({ value: r.id, label: `${r.guest_name || 'Reserva'} · ${nameOf(r.property_id)} · ${formatDate(r.check_in)}` }));
  }, [reservations, properties]);

  const copy = () => {
    try { navigator.clipboard?.writeText(rendered); } catch { /* noop */ }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={embedded ? '' : 'page pb-16'}>
      {embedded ? (
        <header className="hair-top pt-16 mb-12 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="label mb-2">Mensajería</p>
            <h2 className="font-display text-[40px] leading-none tracking-tight">Plantillas de mensajería</h2>
            <p className="text-[15px] text-ink-500 mt-3 max-w-[58ch]">Escribe una vez, envía siempre. Rellena las variables con los datos de cada reserva.</p>
          </div>
          <button onClick={addTemplate} className="action shrink-0">Nueva plantilla</button>
        </header>
      ) : (
        <PageHeader
          eyebrow="Mensajería"
          title="Plantillas"
          subtitle="Escribe una vez, envía siempre. Rellena las variables con los datos de cada reserva."
          actions={<button onClick={addTemplate} className="action">Nueva plantilla</button>}
        />
      )}

      <div className="grid lg:grid-cols-[260px_1fr] gap-16" data-reveal>
        {/* Lista de plantillas: filas tipográficas con reglas, sin cajas. */}
        <aside className="flex flex-col">
          <p className="label mb-4">Tus plantillas</p>
          <ul className="flex flex-col">
            {templates.map((t, i) => (
              <li key={t.id} className={i > 0 ? 'hair-top' : ''}>
                <button
                  onClick={() => setActiveId(t.id)}
                  className="w-full text-left py-3.5 flex items-baseline gap-2.5 group"
                >
                  <span aria-hidden className={`text-ink-900 shrink-0 transition-opacity ${t.id === activeId ? 'opacity-100' : 'opacity-0'}`}>—</span>
                  <span className="min-w-0">
                    <span className={`block text-[15px] truncate ${t.id === activeId ? 'text-ink-900' : 'text-ink-500 group-hover:underline underline-offset-[3px]'}`}>{t.name || 'Sin nombre'}</span>
                    {t.moment && <span className="block text-[12px] text-ink-500 mt-1 truncate">{t.moment}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Editor + vista previa */}
        {active ? (
          <div className="min-w-0 flex flex-col gap-8">
            <section>
              <div className="grid sm:grid-cols-2 gap-8 mb-8">
                <label className="block">
                  <span className="label block mb-2">Nombre</span>
                  <input value={active.name} onChange={e => updateActive({ name: e.target.value })} className="field" />
                </label>
                <label className="block">
                  <span className="label block mb-2">Cuándo enviarla</span>
                  <input value={active.moment} onChange={e => updateActive({ moment: e.target.value })} placeholder="p. ej. 1 día antes de la entrada" className="field" />
                </label>
              </div>

              <span className="label block mb-2">Mensaje</span>
              <textarea ref={bodyRef} value={active.body} onChange={e => updateActive({ body: e.target.value })} rows={8}
                className="w-full border border-hairline px-4 py-3 text-[15px] leading-relaxed text-ink-900 bg-transparent resize-y focus:outline-none focus:border-ink-900" />

              <div className="mt-4">
                <p className="label mb-3">Insertar variable</p>
                <div className="flex flex-wrap gap-2">
                  {VARIABLES.map(v => (
                    <button key={v.key} onClick={() => insertVar(v.key)} title={v.label}
                      className="border border-hairline hover:border-ink-900 px-2.5 py-1 text-[12px] tabular">
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <button onClick={() => removeTemplate(active.id)} className="action">Eliminar plantilla</button>
              </div>
            </section>

            {/* Vista previa con reserva */}
            <section className="hair-top pt-10">
              <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <h2 className="font-display text-h2">Vista previa</h2>
                  <p className="text-[13px] text-ink-500 mt-1">Elige una reserva y el mensaje se rellena solo.</p>
                </div>
                <Select className="w-full sm:w-72" value={resId} onChange={setResId} placeholder="Elige una reserva…"
                  options={resOptions} />
              </div>

              <div className="bg-[#F7F7F7] p-6">
                <p className="text-[15px] leading-relaxed whitespace-pre-line">{rendered}</p>
              </div>

              {missing.length > 0 && (
                <p className="text-[13px] text-ink-900 mt-4">
                  Faltan datos: {missing.map(k => VARIABLES.find(v => v.key === k)?.label.toLowerCase() || k).join(', ')}. Complétalos en la ficha del piso o en la guía.
                </p>
              )}

              <div className="flex items-center gap-8 mt-8 flex-wrap">
                <button onClick={copy} className="cta">{copied ? 'Copiado ✓' : 'Copiar mensaje'}</button>
                <span className="text-[13px] text-ink-500">Envío automático al huésped: <span className="text-ink-900">próximamente</span></span>
              </div>
            </section>
          </div>
        ) : !loaded ? (
          <div className="py-16"><p className="label">Cargando</p></div>
        ) : (
          <div className="py-16">
            <p className="font-display text-h2 mb-2">No hay plantillas</p>
            <p className="text-[15px] text-ink-500 mb-8">Crea tu primera plantilla de mensaje.</p>
            <button onClick={addTemplate} className="cta">Nueva plantilla</button>
          </div>
        )}
      </div>
    </div>
  );
}

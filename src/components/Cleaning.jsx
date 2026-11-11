import { useState, useMemo, useCallback, useEffect } from 'react';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import { buildCleaningTasks, mergeOverrides, dayGroupLabel, cleaningSummary, cleanersWorkload } from '../finance/cleaning.js';
import { loadOverrides, saveCleaningTask, loadCleaners, rememberCleaner, loadCleanerMeta, setCleanerStatus, markCleanerNotified } from '../lib/cleaningStore.js';
import { formatDate } from '../finance/dateHelpers.js';

// C1 — Calendario operativo de limpieza (sustituye a Turno).
// Agenda de rotaciones derivada de las reservas: asignar limpiador, marcar hecha
// y ver de un vistazo las rotaciones "mismo día" (las urgentes).
export default function Cleaning({ data }) {
  const { properties, reservations } = data;
  const [overrides, setOverrides] = useState({});
  const [cleaners, setCleaners] = useState(() => loadCleaners());
  const [propFilter, setPropFilter] = useState('all');
  const [showDone, setShowDone] = useState(false);
  const [editingCleaner, setEditingCleaner] = useState(null); // taskId cuya asignación se edita
  const [view, setView] = useState('agenda'); // 'agenda' | 'cleaners'
  const [meta, setMeta] = useState(() => loadCleanerMeta());
  const [justNotified, setJustNotified] = useState(null);

  const nameOf = id => properties.find(p => p.id === id)?.name ?? 'Sin asignar';

  const toggleStatus = (name) => {
    const next = meta[name]?.status === 'away' ? 'available' : 'away';
    setMeta({ ...setCleanerStatus(name, next) });
  };
  const notify = (c) => {
    const text = buildNotice(c.name, c.pending, nameOf);
    try { navigator.clipboard?.writeText(text); } catch { /* portapapeles no disponible */ }
    setMeta({ ...markCleanerNotified(c.name) });
    setJustNotified(c.name);
    setTimeout(() => setJustNotified(null), 1800);
  };

  useEffect(() => {
    let cancelled = false;
    loadOverrides().then(o => { if (!cancelled) setOverrides(o); });
    return () => { cancelled = true; };
  }, []);

  // Guarda el estado de una tarea (task aporta reservation_id/property_id).
  const update = useCallback((task, patch) => {
    setOverrides(prev => {
      const merged = { ...prev[task.id], ...patch };
      saveCleaningTask(task, merged);
      return { ...prev, [task.id]: merged };
    });
  }, []);

  const tasks = useMemo(() => {
    const base = mergeOverrides(buildCleaningTasks(reservations), overrides);
    let list = propFilter === 'all' ? base : base.filter(t => t.property_id === propFilter);
    if (!showDone) list = list.filter(t => t.status !== 'done');
    return list;
  }, [reservations, overrides, propFilter, showDone]);

  const summary = useMemo(
    () => cleaningSummary(mergeOverrides(buildCleaningTasks(reservations), overrides)
      .filter(t => propFilter === 'all' || t.property_id === propFilter)),
    [reservations, overrides, propFilter]
  );

  // Para la pestaña Limpiadores: todas las tareas (pendientes + hechas) del filtro.
  const workload = useMemo(() => {
    const base = mergeOverrides(buildCleaningTasks(reservations), overrides)
      .filter(t => propFilter === 'all' || t.property_id === propFilter);
    return cleanersWorkload(base, cleaners);
  }, [reservations, overrides, propFilter, cleaners]);

  // Agrupar por día
  const groups = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()];
  }, [tasks]);

  const assignCleaner = (task, name) => {
    update(task, { cleaner: name });
    if (name) setCleaners(rememberCleaner(name));
    setEditingCleaner(null);
  };

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Operativa"
        title="Limpiezas"
        subtitle={
          summary.pending === 0
            ? 'Todo al día — no hay limpiezas pendientes'
            : `${summary.pending} pendiente${summary.pending === 1 ? '' : 's'}` +
              (summary.sameDayPending ? ` · ${summary.sameDayPending} rotación${summary.sameDayPending === 1 ? '' : 'es'} mismo día` : '') +
              (summary.unassignedPending ? ` · ${summary.unassignedPending} sin asignar` : '')
        }
        actions={
          <>
            <div className="flex items-center gap-5">
              <button onClick={() => setView('agenda')} className={`action ${view === 'agenda' ? 'underline' : ''}`}>Agenda</button>
              <button onClick={() => setView('cleaners')} className={`action ${view === 'cleaners' ? 'underline' : ''}`}>Limpiadores</button>
            </div>
            <Select
              className="w-full sm:w-44"
              value={propFilter}
              onChange={setPropFilter}
              options={[{ value: 'all', label: 'Todas las propiedades' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
            />
            {view === 'agenda' && (
              <button onClick={() => setShowDone(v => !v)} className={`action ${showDone ? 'underline' : ''}`}>
                {showDone ? 'Ocultar hechas' : 'Ver hechas'}
              </button>
            )}
          </>
        }
      />

      {view === 'agenda' ? (
        <>
      {/* Resumen operativo — cifras separadas por vacío y reglas, sin caja.
          "Mismo día" es la cifra clave: único dato en acento de la vista. */}
      <section className="grid grid-cols-3 gap-8 hair-top hair-bottom py-8 mb-20" data-reveal>
        <Metric label="Pendientes" value={summary.pending} />
        <Metric label="Mismo día" value={summary.sameDayPending} accent={summary.sameDayPending > 0} />
        <Metric label="Hechas" value={summary.done} />
      </section>

      {tasks.length === 0 ? (
        <div className="py-16 text-center" data-reveal>
          <p className="text-eyebrow mb-2">Vacío</p>
          <p className="text-[16px] font-semibold text-ink-900 mb-1">
            {showDone ? 'Sin limpiezas registradas' : 'No hay limpiezas pendientes'}
          </p>
          <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
            Las limpiezas se generan solas a partir de tus reservas: cada salida de huésped crea una
            rotación. Importa o sincroniza tus reservas para verlas aquí.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-16" data-reveal>
          {groups.map(([date, list]) => {
            const g = dayGroupLabel(date);
            const anySameDay = list.some(t => t.sameDay && t.status !== 'done');
            return (
              <section key={date}>
                <div className="flex items-baseline gap-3 mb-2 hair-bottom pb-3">
                  <h2 className="font-display text-h2">{g.primary}</h2>
                  <span className="text-[13px] text-ink-500">{g.secondary}</span>
                  {anySameDay && (
                    <span className="label ml-auto">Rotación exprés</span>
                  )}
                </div>
                <ul className="flex flex-col">
                  {list.map((t, i) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      propertyName={nameOf(t.property_id)}
                      first={i === 0}
                      cleaners={cleaners}
                      editing={editingCleaner === t.id}
                      onEdit={() => setEditingCleaner(t.id)}
                      onCancelEdit={() => setEditingCleaner(null)}
                      onAssign={(name) => assignCleaner(t, name)}
                      onToggle={() => update(t, { status: t.status === 'done' ? 'pending' : 'done' })}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-[13px] text-ink-500 mt-16 max-w-[60ch]">
        Las rotaciones se calculan automáticamente desde tus reservas. Marca una limpieza como hecha o
        asigna un limpiador y se guarda en este dispositivo. Cuando conectes tu cuenta, el equipo de
        limpieza podrá verlas y confirmarlas desde su propio acceso.
      </p>
        </>
      ) : (
        <CleanersView
          workload={workload}
          meta={meta}
          nameOf={nameOf}
          justNotified={justNotified}
          onToggleStatus={toggleStatus}
          onNotify={notify}
        />
      )}
    </div>
  );
}

function Metric({ label, value, accent = false }) {
  return (
    <div>
      <p className="label mb-3">{label}</p>
      <p className={`font-display text-[40px] leading-none tabular ${accent ? 'text-accent' : ''}`}>{value}</p>
    </div>
  );
}

function TaskRow({ task, propertyName, first, cleaners, editing, onEdit, onCancelEdit, onAssign, onToggle }) {
  const done = task.status === 'done';
  const [draft, setDraft] = useState(task.cleaner || '');

  return (
    <li className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 ${first ? '' : 'hair-top'}`}>
      {/* Check */}
      <button
        onClick={onToggle}
        aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecha'}
        className={`w-6 h-6 rounded-full border flex items-center justify-center text-[13px] font-bold
          ${done ? 'bg-ink-900 border-ink-900 text-white' : 'border-ink-300 text-transparent hover:border-ink-900'}`}
      >
        ✓
      </button>

      {/* Detalle */}
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`text-[15px] truncate ${done ? 'text-ink-300 line-through' : 'text-ink-900'}`}>
            {propertyName}
          </span>
          {task.sameDay && !done && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-900">Mismo día</span>
          )}
        </div>
        <p className={`text-[13px] mt-1 truncate ${done ? 'text-ink-300' : 'text-ink-500'}`}>
          Sale {task.guestOut}
          {task.nextGuest
            ? <> · entra {task.nextGuest} {task.sameDay ? 'hoy mismo' : task.gapDays === 1 ? 'al día siguiente' : `en ${task.gapDays} días`}</>
            : <> · sin próxima reserva</>}
        </p>
      </div>

      {/* Asignación de limpiador */}
      <div className="justify-self-end">
        {editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onAssign(draft.trim()); }}
            className="flex items-center gap-1.5"
          >
            <input
              autoFocus
              list="rentlog-cleaners"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onAssign(draft.trim())}
              placeholder="Nombre del limpiador"
              className="field w-44 text-[14px]"
            />
            <datalist id="rentlog-cleaners">
              {cleaners.map(c => <option key={c} value={c} />)}
            </datalist>
          </form>
        ) : task.cleaner ? (
          <button onClick={onEdit} className="flex items-center gap-2 group/c">
            <span className="w-5 h-5 rounded-full bg-ink-900 text-white text-[10px] font-semibold flex items-center justify-center uppercase">
              {task.cleaner.slice(0, 1)}
            </span>
            <span className="text-[13px] text-ink-700 group-hover/c:underline underline-offset-[3px]">{task.cleaner}</span>
          </button>
        ) : (
          <button onClick={onEdit} className="action">Asignar</button>
        )}
      </div>
    </li>
  );
}

// Mensaje de aviso para un limpiador (stub: se copia para enviarlo por WhatsApp/SMS).
function buildNotice(name, pending, nameOf) {
  const lines = pending.map(t => `- ${nameOf(t.property_id)} · ${formatDate(t.date)}${t.sameDay ? ' (rotación mismo día)' : ''}`);
  return `Hola ${name}, estas son tus limpiezas asignadas:\n${lines.join('\n')}\n\nAvísame si hay cualquier problema. ¡Gracias!`;
}

// Pestaña Limpiadores: disponibilidad + carga de trabajo + aviso por limpiador.
function CleanersView({ workload, meta, nameOf, justNotified, onToggleStatus, onNotify }) {
  const { byCleaner, unassigned } = workload;

  if (byCleaner.length === 0 && unassigned.length === 0) {
    return (
      <div className="py-16 max-w-[60ch]" data-reveal>
        <p className="label mb-2">Sin limpiadores</p>
        <p className="font-display text-h2 mb-2">Aún no has asignado a nadie</p>
        <p className="text-[15px] text-ink-500">Asigna un limpiador a una limpieza en la Agenda y aparecerá aquí con su carga de trabajo y su disponibilidad.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" data-reveal>
      {byCleaner.map((c, i) => (
        <CleanerRow
          key={c.name} c={c} meta={meta[c.name]} nameOf={nameOf}
          notified={justNotified === c.name} first={i === 0}
          onToggleStatus={() => onToggleStatus(c.name)} onNotify={() => onNotify(c)}
        />
      ))}

      {unassigned.length > 0 && (
        <article className={`py-8 ${byCleaner.length ? 'hair-top' : ''}`}>
          <h3 className="font-display text-[24px] leading-none">Sin asignar</h3>
          <p className="text-[13px] text-ink-500 mt-2">{unassigned.length} limpieza{unassigned.length === 1 ? '' : 's'} sin limpiador. Asígnalas en la Agenda.</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {unassigned.map(t => (
              <li key={t.id} className="flex items-center gap-3 text-[13px]">
                <span className="text-ink-400 tabular w-24 shrink-0">{formatDate(t.date)}</span>
                <span className="text-ink-900 min-w-0 truncate">{nameOf(t.property_id)}</span>
                {t.sameDay && <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-ink-900 shrink-0">mismo día</span>}
              </li>
            ))}
          </ul>
        </article>
      )}

      <p className="text-[13px] text-ink-500 mt-16 max-w-[60ch]">
        «Avisar» copia un mensaje con las limpiezas del limpiador para que se lo envíes (WhatsApp, SMS…).
        El envío automático a su móvil llegará cuando conectes tu cuenta.
      </p>
    </div>
  );
}

function CleanerRow({ c, meta, nameOf, notified, first, onToggleStatus, onNotify }) {
  const away = meta?.status === 'away';
  const notifiedAt = meta?.notifiedAt;
  return (
    <article className={`py-8 ${first ? '' : 'hair-top'}`}>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          <span className="w-10 h-10 rounded-full bg-ink-900 text-white flex items-center justify-center text-[15px] font-semibold uppercase shrink-0">
            {c.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-display text-[24px] leading-none">{c.name}</h3>
              <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] font-semibold ${away ? 'text-ink-400' : 'text-ink-900'}`}>
                <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${away ? 'bg-ink-300' : 'bg-ink-900'}`} />
                {away ? 'No disponible' : 'Disponible'}
              </span>
            </div>
            <p className="text-[13px] text-ink-500 mt-2">
              {c.pendingCount} pendiente{c.pendingCount === 1 ? '' : 's'}
              {c.sameDayCount ? ` · ${c.sameDayCount} mismo día` : ''}
              {c.nextDate ? ` · próxima ${formatDate(c.nextDate)}` : ' · sin pendientes'}
            </p>
            {notifiedAt && <p className="text-[12px] text-ink-400 mt-1">Avisado el {formatDate(notifiedAt)}</p>}
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <button onClick={onToggleStatus} className="action">{away ? 'Marcar disponible' : 'Marcar no disponible'}</button>
          <button onClick={onNotify} disabled={c.pendingCount === 0} className="action disabled:opacity-40">
            {notified ? 'Aviso copiado ✓' : 'Avisar'}
          </button>
        </div>
      </div>

      {c.pending.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2.5">
          {c.pending.map(t => (
            <li key={t.id} className="flex items-center gap-3 text-[13px]">
              <span className="text-ink-400 tabular w-24 shrink-0">{formatDate(t.date)}</span>
              <span className="text-ink-900 min-w-0 truncate">{nameOf(t.property_id)}</span>
              {t.sameDay && <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-ink-900 shrink-0">mismo día</span>}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// ============================================================================
//  Calendario operativo de limpieza (C1 — sustituye a Turno).
//  Deriva las limpiezas de las reservas: cada check-out genera una rotación
//  (hay que dejar el piso listo antes del siguiente huésped). Detecta las
//  rotaciones "mismo día" (sale y entra huésped el mismo día), que son las
//  críticas para un anfitrión. Lógica pura, sin dependencias de red.
// ============================================================================

function ymd(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function daysBetween(a, b) {
  return Math.round((new Date(ymd(b)) - new Date(ymd(a))) / 86400000);
}

// Construye la lista de limpiezas a partir de las reservas.
// Una limpieza por cada check-out (el día que sale un huésped hay que limpiar).
// Se cruza con la siguiente entrada en la misma propiedad para calcular la
// holgura: si el siguiente check-in es el mismo día → rotación urgente.
export function buildCleaningTasks(reservations = [], { includePast = false, today = new Date() } = {}) {
  const active = reservations.filter(r => r.status !== 'cancelled' && r.check_out);
  const byProp = new Map();
  for (const r of active) {
    if (!byProp.has(r.property_id)) byProp.set(r.property_id, []);
    byProp.get(r.property_id).push(r);
  }
  for (const list of byProp.values()) list.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

  const todayYmd = ymd(today);
  const tasks = [];
  for (const [propertyId, list] of byProp.entries()) {
    for (const r of list) {
      const date = ymd(r.check_out);
      // Siguiente reserva de la misma propiedad que entra en/después del check-out
      const next = list.find(n => n !== r && daysBetween(r.check_out, n.check_in) >= 0);
      const gapDays = next ? daysBetween(r.check_out, next.check_in) : null;
      const sameDay = gapDays === 0;
      tasks.push({
        id: `clean-${r.id}`,
        reservation_id: r.id,
        property_id: propertyId,
        date,
        isPast: date < todayYmd,
        isToday: date === todayYmd,
        guestOut: r.guest_name || 'Huésped',
        nextGuest: next ? (next.guest_name || 'Huésped') : null,
        nextCheckIn: next ? ymd(next.check_in) : null,
        gapDays,
        sameDay,
        source: r.source || null,
      });
    }
  }

  const filtered = includePast ? tasks : tasks.filter(t => !t.isPast);
  return filtered.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 :
    // dentro del mismo día, las de rotación mismo-día primero
    (b.sameDay - a.sameDay)
  );
}

// Fusiona el estado guardado (localStorage / BBDD) con las tareas derivadas.
// override = { [taskId]: { status: 'done'|'pending', cleaner: string, notes: string } }
export function mergeOverrides(tasks, overrides = {}) {
  return tasks.map(t => {
    const o = overrides[t.id] || {};
    return { ...t, status: o.status || 'pending', cleaner: o.cleaner || '', notes: o.notes || '' };
  });
}

// Etiqueta de agrupación por día: Hoy / Mañana / día de la semana + fecha corta.
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function dayGroupLabel(dateYmd, today = new Date()) {
  const d = new Date(dateYmd + 'T00:00:00');
  const diff = daysBetween(today, d);
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (diff === 0) return { primary: 'Hoy', secondary: base };
  if (diff === 1) return { primary: 'Mañana', secondary: base };
  return { primary: base, secondary: diff > 0 ? `en ${diff} días` : `hace ${-diff} días` };
}

// Resumen para la cabecera y el resumen operativo.
export function cleaningSummary(mergedTasks) {
  const pending = mergedTasks.filter(t => t.status !== 'done');
  return {
    total: mergedTasks.length,
    pending: pending.length,
    done: mergedTasks.length - pending.length,
    sameDayPending: pending.filter(t => t.sameDay).length,
    todayPending: pending.filter(t => t.isToday).length,
    unassignedPending: pending.filter(t => !t.cleaner).length,
  };
}

// Carga de trabajo por limpiador, para la pestaña "Limpiadores".
// `knownCleaners` incluye limpiadores sin tareas asignadas (para ver/gestionar
// su disponibilidad aunque no tengan limpiezas ahora mismo).
export function cleanersWorkload(mergedTasks, knownCleaners = []) {
  const map = new Map();
  const ensure = (name) => { if (!map.has(name)) map.set(name, []); return map.get(name); };
  for (const name of knownCleaners) ensure(name);

  const unassigned = [];
  for (const t of mergedTasks) {
    if (!t.cleaner) { if (t.status !== 'done') unassigned.push(t); continue; }
    ensure(t.cleaner).push(t);
  }

  const byCleaner = [...map.entries()].map(([name, list]) => {
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const pending = sorted.filter(t => t.status !== 'done');
    return {
      name,
      tasks: sorted,
      pending,
      pendingCount: pending.length,
      doneCount: sorted.length - pending.length,
      sameDayCount: pending.filter(t => t.sameDay).length,
      nextDate: pending.length ? pending[0].date : null,
    };
  }).sort((a, b) => b.pendingCount - a.pendingCount || a.name.localeCompare(b.name));

  return { byCleaner, unassigned };
}

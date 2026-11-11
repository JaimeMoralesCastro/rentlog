// Persistencia de las limpiezas. Las tareas se DERIVAN de las reservas
// (finance/cleaning.js); aquí solo se guarda lo que el anfitrión edita:
// estado (hecha/pendiente), limpiador asignado y notas.
// Con sesión vive en la tabla `cleaning_tasks` (clave por reservation_id);
// en demo, en localStorage. Overrides indexados por task.id ("clean-<resId>").
//
// La lista de limpiadores y su disponibilidad (meta) se guardan siempre en
// localStorage: son ayudas locales de la interfaz, no datos operativos críticos.
import { supabase, isConfigured, currentUserId } from './supabase.js';

const KEY = 'rentlog_cleaning_overrides';
const CLEANERS_KEY = 'rentlog_cleaners';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function saveLocal(overrides) {
  try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch { /* almacenamiento no disponible */ }
}

export async function loadOverrides() {
  if (!isConfigured) return loadLocal();
  const { data, error } = await supabase
    .from('cleaning_tasks').select('reservation_id, status, cleaner, notes');
  if (error) return {};
  const map = {};
  for (const t of data || []) {
    if (!t.reservation_id) continue;
    map[`clean-${t.reservation_id}`] = { status: t.status || 'pending', cleaner: t.cleaner || '', notes: t.notes || '' };
  }
  return map;
}

// Guarda el estado de UNA tarea. `task` aporta id/reservation_id/property_id;
// `override` es el estado fusionado { status, cleaner, notes }.
export async function saveCleaningTask(task, override) {
  if (!isConfigured) {
    const all = loadLocal();
    all[task.id] = { ...(all[task.id] || {}), ...override };
    saveLocal(all);
    return;
  }
  const user_id = await currentUserId();
  if (!user_id || !task.reservation_id) return;
  const status = override.status || 'pending';
  await supabase.from('cleaning_tasks').upsert(
    {
      user_id,
      reservation_id: task.reservation_id,
      property_id: task.property_id ?? null,
      status,
      cleaner: override.cleaner || null,
      notes: override.notes || null,
      done_at: status === 'done' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,reservation_id' },
  );
}

// ── Limpiadores y disponibilidad (siempre localStorage) ────────────────────
export function loadCleaners() {
  try { return JSON.parse(localStorage.getItem(CLEANERS_KEY) || '[]'); } catch { return []; }
}

export function rememberCleaner(name) {
  const clean = (name || '').trim();
  if (!clean) return loadCleaners();
  const list = loadCleaners();
  if (!list.some(c => c.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
    try { localStorage.setItem(CLEANERS_KEY, JSON.stringify(list)); } catch { /* noop */ }
  }
  return list;
}

const META_KEY = 'rentlog_cleaner_meta';

export function loadCleanerMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; }
}

function saveCleanerMeta(meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* noop */ }
}

export function setCleanerStatus(name, status) {
  const meta = loadCleanerMeta();
  meta[name] = { ...(meta[name] || {}), status };
  saveCleanerMeta(meta);
  return meta;
}

export function markCleanerNotified(name, iso = new Date().toISOString()) {
  const meta = loadCleanerMeta();
  meta[name] = { ...(meta[name] || {}), notifiedAt: iso };
  saveCleanerMeta(meta);
  return meta;
}

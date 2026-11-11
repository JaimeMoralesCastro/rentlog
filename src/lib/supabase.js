import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si no hay credenciales, la app arranca en MODO DEMO (datos de ejemplo,
// sin login real) para poder verla sin configurar Supabase todavía.
export const isConfigured = Boolean(url && key);

export const supabase = isConfigured ? createClient(url, key) : null;

export function displayName(user) {
  return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Anfitrión';
}

// Id del usuario autenticado (para escrituras con RLS). Null en modo demo.
export async function currentUserId() {
  if (!isConfigured) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// Sesión cacheada en memoria (para poder escribir de forma síncrona en
// `pagehide`, donde no da tiempo a un await).
let cachedSession = null;
if (isConfigured) {
  supabase.auth.getSession().then(({ data }) => { cachedSession = data.session; });
  supabase.auth.onAuthStateChange((_e, s) => { cachedSession = s; });
}
export function getCachedSession() { return cachedSession; }

// Upsert "a prueba de cierre de página": fetch con keepalive, que el navegador
// completa aunque la pestaña se esté recargando/cerrando. Se usa para no perder
// la última edición al refrescar (los guardados normales van con debounce).
export function keepaliveUpsert(table, rowOrRows, onConflict) {
  if (!isConfigured || !cachedSession) return;
  const uid = cachedSession.user?.id;
  const body = Array.isArray(rowOrRows)
    ? rowOrRows.map(r => ({ ...r, user_id: uid }))
    : { ...rowOrRows, user_id: uid };
  const params = onConflict ? `?on_conflict=${onConflict}` : '';
  try {
    fetch(`${url}/rest/v1/${table}${params}`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: key,
        Authorization: `Bearer ${cachedSession.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch { /* noop */ }
}

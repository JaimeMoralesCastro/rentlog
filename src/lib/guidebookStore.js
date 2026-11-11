// Persistencia de las guías del huésped, una por propiedad.
// Con sesión (isConfigured) vive en la tabla `guidebooks` de Supabase;
// en modo demo, en localStorage. La API es asíncrona en ambos casos.
import { supabase, isConfigured, currentUserId } from './supabase.js';

const KEY = 'rentlog_guidebooks';

function loadAllLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export async function loadGuidebook(propertyId) {
  if (!propertyId) return null;
  if (!isConfigured) return loadAllLocal()[propertyId] || null;
  const { data, error } = await supabase
    .from('guidebooks').select('content').eq('property_id', propertyId).maybeSingle();
  if (error) return null;
  return data?.content || null;
}

export async function saveGuidebook(propertyId, gb) {
  if (!propertyId) return;
  if (!isConfigured) {
    const all = loadAllLocal();
    all[propertyId] = gb;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* almacenamiento no disponible */ }
    return;
  }
  const user_id = await currentUserId();
  if (!user_id) return;
  await supabase.from('guidebooks').upsert(
    { property_id: propertyId, user_id, content: gb, updated_at: new Date().toISOString() },
    { onConflict: 'property_id' },
  );
}

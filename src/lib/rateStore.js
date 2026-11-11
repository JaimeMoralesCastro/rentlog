// Overrides de tarifa por noche, por propiedad. { 'YYYY-MM-DD': precio }.
// Con sesión vive en la tabla `nightly_rates`; en demo, en localStorage.
import { supabase, isConfigured, currentUserId } from './supabase.js';

const KEY = 'rentlog_rate_overrides';

function loadAllLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export async function loadRateOverrides(propertyId) {
  if (!propertyId) return {};
  if (!isConfigured) return loadAllLocal()[propertyId] || {};
  const { data, error } = await supabase
    .from('nightly_rates').select('night, price').eq('property_id', propertyId);
  if (error) return {};
  const map = {};
  for (const r of data || []) map[r.night] = Math.round(Number(r.price));
  return map;
}

export async function setRateOverride(propertyId, dateKey, price) {
  const clear = price == null || price === '';
  if (!isConfigured) {
    const all = loadAllLocal();
    const forProp = { ...(all[propertyId] || {}) };
    if (clear) delete forProp[dateKey];
    else forProp[dateKey] = Math.round(Number(price));
    all[propertyId] = forProp;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* noop */ }
    return forProp;
  }
  const user_id = await currentUserId();
  if (!user_id) return loadRateOverrides(propertyId);
  if (clear) {
    await supabase.from('nightly_rates').delete().eq('property_id', propertyId).eq('night', dateKey);
  } else {
    await supabase.from('nightly_rates').upsert(
      { user_id, property_id: propertyId, night: dateKey, price: Math.round(Number(price)), source: 'manual', updated_at: new Date().toISOString() },
      { onConflict: 'property_id,night' },
    );
  }
  return loadRateOverrides(propertyId);
}

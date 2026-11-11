// Persistencia de las plantillas de mensajería.
// Con sesión vive en la tabla `message_templates`; en demo, en localStorage.
// Los ids se generan en cliente (uuid) para que sean estables entre guardados
// y válidos como PK de la tabla.
import { supabase, isConfigured, currentUserId } from './supabase.js';
import { DEFAULT_TEMPLATES } from '../finance/messaging.js';

const KEY = 'rentlog_message_templates';

function withIds(list) {
  return list.map(t => ({ ...t, id: t.id && /[0-9a-f-]{36}/i.test(t.id) ? t.id : crypto.randomUUID() }));
}

export async function loadTemplates() {
  if (!isConfigured) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch { /* noop */ }
    return withIds(DEFAULT_TEMPLATES.map(t => ({ ...t })));
  }

  const { data, error } = await supabase
    .from('message_templates').select('id, name, moment, body, sort_order').order('sort_order');
  if (error) return withIds(DEFAULT_TEMPLATES.map(t => ({ ...t })));
  if (data && data.length) {
    return data.map(({ id, name, moment, body }) => ({ id, name, moment: moment || '', body }));
  }
  // Primera vez: sembramos las plantillas de fábrica en la cuenta.
  const seeded = withIds(DEFAULT_TEMPLATES.map(t => ({ ...t })));
  await saveTemplates(seeded);
  return seeded;
}

export async function saveTemplates(templates) {
  if (!isConfigured) {
    try { localStorage.setItem(KEY, JSON.stringify(templates)); } catch { /* almacenamiento no disponible */ }
    return;
  }
  const user_id = await currentUserId();
  if (!user_id) return;
  const rows = templates.map((t, i) => ({
    id: t.id, user_id, name: t.name || 'Sin nombre', moment: t.moment || null, body: t.body || '', sort_order: i,
  }));
  if (rows.length) {
    await supabase.from('message_templates').upsert(rows, { onConflict: 'id' });
    await supabase.from('message_templates').delete().eq('user_id', user_id)
      .not('id', 'in', `(${rows.map(r => r.id).join(',')})`);
  } else {
    await supabase.from('message_templates').delete().eq('user_id', user_id);
  }
}

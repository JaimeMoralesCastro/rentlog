// ============================================================================
//  Supabase Edge Function · sync-ical
//  Sincroniza las reservas de una propiedad desde sus calendarios iCal
//  (Airbnb / Booking). El navegador no puede descargar esas URLs por CORS,
//  por eso el fetch se hace aquí (servidor). Hace upsert con dedupe por
//  (user_id, external_uid) para no duplicar al re-sincronizar.
//
//  Desplegar:  supabase functions deploy sync-ical
//  Invocar:    supabase.functions.invoke('sync-ical', { body: { property_id } })
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Parser iCal (mismo criterio que src/finance/icalParser.js) ──────────────
function unfold(t: string) { return t.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, ''); }
function icalDate(raw: string) {
  const m = raw.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
function prop(body: string, key: string) {
  const m = body.match(new RegExp(`(?:^|\\n)${key}(?:;[^:\\n]*)?:([^\\n]*)`, 'i'));
  return m ? m[1].trim() : null;
}
function isBlock(s: string) {
  const x = (s || '').toLowerCase();
  return x.includes('not available') || x.includes('no disponible') || x.includes('blocked') || x.includes('closed');
}
function cleanGuest(s: string) {
  if (!s) return '';
  if (/^reserved$/i.test(s.trim()) || /^reservado$/i.test(s.trim()) || /not available/i.test(s)) return '';
  return s.replace(/^closed\s*-\s*/i, '').trim();
}
function parseIcal(text: string, source: string, propertyId: string) {
  const t = unfold(text);
  const blocks = t.split(/BEGIN:VEVENT/i).slice(1);
  const out: any[] = [];
  for (const b of blocks) {
    const body = b.split(/END:VEVENT/i)[0];
    const ds = prop(body, 'DTSTART'); const de = prop(body, 'DTEND');
    if (!ds || !de) continue;
    const ci = icalDate(ds); const co = icalDate(de);
    if (!ci || !co) continue;
    const summary = prop(body, 'SUMMARY') || '';
    if (isBlock(summary)) continue;
    out.push({
      external_uid: prop(body, 'UID') || `${source}-${ci}-${co}`,
      property_id: propertyId,
      source,
      guest_name: cleanGuest(summary) || `Reserva ${source}`,
      check_in: ci, check_out: co,
      gross_income: 0, channel_fee: 0, status: 'confirmed',
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { property_id } = await req.json();
    const authHeader = req.headers.get('Authorization')!;

    // Cliente con el JWT del usuario → respeta RLS (solo ve sus datos)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'No autorizado' }, 401);

    const { data: property, error: pErr } = await supabase
      .from('properties').select('*').eq('id', property_id).single();
    if (pErr || !property) return json({ error: 'Propiedad no encontrada' }, 404);

    // Descargar y parsear cada calendario conectado
    const sources: Array<[string, string]> = [];
    if (property.ical_airbnb_url) sources.push(['Airbnb', property.ical_airbnb_url]);
    if (property.ical_booking_url) sources.push(['Booking', property.ical_booking_url]);
    if (sources.length === 0) return json({ inserted: 0, error: 'Sin calendarios conectados' });

    let rows: any[] = [];
    for (const [source, url] of sources) {
      try {
        const res = await fetch(url);
        if (res.ok) rows = rows.concat(parseIcal(await res.text(), source, property_id));
      } catch (_) { /* ignora un calendario caído, sigue con el otro */ }
    }

    // Dedupe por (user_id, external_uid). El índice único es PARCIAL
    // (where external_uid is not null), así que ON CONFLICT no lo puede inferir:
    // filtramos en código contra lo existente + dedupe intra-lote, e insertamos.
    const payload = rows.map(r => ({ ...r, user_id: user.id }));
    const before = await supabase.from('reservations').select('external_uid').eq('property_id', property_id);
    const known = new Set((before.data ?? []).map((r: any) => r.external_uid));
    const seen = new Set<string>();
    const nuevas = payload.filter(r => {
      if (known.has(r.external_uid) || seen.has(r.external_uid)) return false;
      seen.add(r.external_uid);
      return true;
    });

    if (nuevas.length) {
      const { error } = await supabase.from('reservations').insert(nuevas);
      if (error) return json({ error: error.message }, 500);
    }

    await supabase.from('properties').update({ last_sync_at: new Date().toISOString() }).eq('id', property_id);
    return json({ inserted: nuevas.length, error: null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

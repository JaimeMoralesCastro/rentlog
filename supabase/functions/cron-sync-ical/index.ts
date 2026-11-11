// ============================================================================
//  Supabase Edge Function · cron-sync-ical
//  Sincroniza los calendarios iCal de TODAS las propiedades (de todos los
//  usuarios) que tengan URL de Airbnb/Booking. Pensada para ejecutarse por
//  pg_cron cada pocas horas — no la invoca un usuario, así que:
//    · verify_jwt = false (se despliega con --no-verify-jwt)
//    · se protege con un secreto en la cabecera `x-cron-secret`
//    · usa la SERVICE_ROLE key para leer/escribir saltándose RLS (job de confianza)
//
//  Desplegar:  supabase functions deploy cron-sync-ical --no-verify-jwt
//  Secreto:    supabase secrets set CRON_SECRET=<valor>
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Parser iCal (idéntico criterio que sync-ical / icalParser.js) ───────────
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
  // Solo el cron (o quien tenga el secreto) puede dispararla.
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return json({ error: 'forbidden' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: props, error } = await supabase
    .from('properties')
    .select('id, user_id, ical_airbnb_url, ical_booking_url')
    .or('ical_airbnb_url.not.is.null,ical_booking_url.not.is.null');
  if (error) return json({ error: error.message }, 500);

  let synced = 0, inserted = 0;
  for (const p of props ?? []) {
    const sources: Array<[string, string]> = [];
    if (p.ical_airbnb_url) sources.push(['Airbnb', p.ical_airbnb_url]);
    if (p.ical_booking_url) sources.push(['Booking', p.ical_booking_url]);

    let rows: any[] = [];
    for (const [source, url] of sources) {
      try {
        const res = await fetch(url);
        if (res.ok) rows = rows.concat(parseIcal(await res.text(), source, p.id));
      } catch (_) { /* un calendario caído no frena el resto */ }
    }
    if (!rows.length) continue;

    const before = await supabase.from('reservations').select('external_uid').eq('property_id', p.id);
    const known = new Set((before.data ?? []).map((r: any) => r.external_uid));
    const seen = new Set<string>();
    const nuevas = rows
      .filter(r => { if (known.has(r.external_uid) || seen.has(r.external_uid)) return false; seen.add(r.external_uid); return true; })
      .map(r => ({ ...r, user_id: p.user_id }));

    if (nuevas.length) {
      const { error: insErr } = await supabase.from('reservations').insert(nuevas);
      if (!insErr) inserted += nuevas.length;
    }
    await supabase.from('properties').update({ last_sync_at: new Date().toISOString() }).eq('id', p.id);
    synced++;
  }

  return json({ properties: props?.length ?? 0, synced, inserted });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

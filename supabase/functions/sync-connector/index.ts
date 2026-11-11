// ============================================================================
//  Supabase Edge Function · sync-connector
//  Fase B — connector de channel manager (Beds24 API v2). Sigue el patrón de
//  sync-ical: JWT del usuario para RLS + dedupe por (user_id, external_uid).
//
//  Acciones (body.action):
//   · 'store' — recibe el refresh token recién canjeado y lo guarda CIFRADO
//     (pgp_sym_encrypt con el secret CONNECTOR_ENC_KEY). El token no vuelve
//     a salir del servidor.
//   · 'sync' — descifra el token, pide access token a Beds24, trae bookings
//     (+importes/comisiones) y hace upsert con dedupe.
//
//  Secrets necesarios:  supabase secrets set CONNECTOR_ENC_KEY=<clave larga>
//  Desplegar:           supabase functions deploy sync-connector
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const B24 = 'https://api.beds24.com/v2';
const CHANNEL: Record<string, string> = { airbnb: 'Airbnb', bookingcom: 'Booking', booking: 'Booking', vrbo: 'Vrbo' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { action, provider = 'beds24', refresh_token } = await req.json();
    const authHeader = req.headers.get('Authorization')!;

    // Cliente con JWT del usuario (RLS) para identificar y escribir datos suyos
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'No autorizado' }, 401);

    // Cliente service-role SOLO para la tabla de tokens cifrados
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const encKey = Deno.env.get('CONNECTOR_ENC_KEY')!;

    if (action === 'store') {
      if (!refresh_token) return json({ error: 'Falta refresh_token' }, 400);
      const { error } = await admin.rpc('connector_store_token', {
        p_user_id: user.id, p_provider: provider, p_token: refresh_token, p_key: encKey,
      });
      // Sin fallback en claro: si la rpc de cifrado no existe, error explícito.
      if (error) return json({ error: `connector_store_token: ${error.message}. Crea las funciones SQL del pie de este archivo.` }, 500);
      return json({ stored: true });
    }

    if (action === 'sync') {
      // 1. Descifrar refresh token
      const { data: acct, error: aErr } = await admin.rpc('connector_read_token', {
        p_user_id: user.id, p_key: encKey,
      });
      if (aErr || !acct) return json({ error: 'No hay cuenta conectada' }, 404);

      // 2. Access token de Beds24 (24h)
      const tokRes = await fetch(`${B24}/authentication/token`, { headers: { refreshToken: acct.token } });
      if (!tokRes.ok) return json({ error: `Beds24 auth → HTTP ${tokRes.status}` }, 502);
      const { token: accessToken } = await tokRes.json();

      // 3. Bookings con importes
      const bkRes = await fetch(`${B24}/bookings?includeInvoiceItems=true`, { headers: { token: accessToken } });
      if (!bkRes.ok) return json({ error: `Beds24 bookings → HTTP ${bkRes.status}` }, 502);
      const bookings = (await bkRes.json()).data ?? [];

      // 4. Mapear a reservas Rentlog (propiedades por external_property_id)
      const { data: props } = await supabase.from('properties')
        .select('id, external_property_id').not('external_property_id', 'is', null);
      const propByExt: Record<string, string> = {};
      for (const p of props ?? []) propByExt[p.external_property_id] = p.id;

      const rows = bookings
        .map((b: any) => ({
          external_uid: `${provider}-${b.id}`,
          property_id: propByExt[`${provider}-${b.propertyId}`] ?? null,
          guest_name: [b.firstName, b.lastName].filter(Boolean).join(' ').trim(),
          source: CHANNEL[(b.channel ?? '').toLowerCase()] ?? 'Directo',
          check_in: b.arrival, check_out: b.departure,
          gross_income: Number(b.price) || 0,
          channel_fee: Number(b.commission) || 0,
          status: b.status === 'cancelled' ? 'cancelled' : 'confirmed',
          user_id: user.id,
        }))
        .filter((r: any) => r.property_id);

      // 5. Upsert con dedupe (mismo criterio que sync-ical)
      const { error: upErr } = await supabase.from('reservations')
        .upsert(rows, { onConflict: 'user_id,external_uid', ignoreDuplicates: true });
      if (upErr) return json({ error: upErr.message }, 500);

      await admin.from('connector_accounts').update({ last_sync_at: new Date().toISOString() }).eq('user_id', user.id);
      return json({ synced: rows.length, error: null });
    }

    return json({ error: `Acción desconocida: ${action}` }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/* SQL de apoyo (crear junto a schema-connector.sql):
create or replace function connector_store_token(p_user_id uuid, p_provider text, p_token text, p_key text)
returns void language sql security definer as $$
  insert into public.connector_accounts (user_id, provider, refresh_token_enc)
  values (p_user_id, p_provider, pgp_sym_encrypt(p_token, p_key))
  on conflict (user_id) do update set provider = excluded.provider, refresh_token_enc = excluded.refresh_token_enc;
$$;
create or replace function connector_read_token(p_user_id uuid, p_key text)
returns table(provider text, token text) language sql security definer as $$
  select provider, pgp_sym_decrypt(refresh_token_enc, p_key) from public.connector_accounts where user_id = p_user_id;
$$;
*/

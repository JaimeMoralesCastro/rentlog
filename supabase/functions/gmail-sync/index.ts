// ============================================================================
//  Supabase Edge Function · gmail-sync
//  Con la cuenta de Gmail conectada, busca los correos de anfitrión de Airbnb /
//  Booking y devuelve { from, subject, text } por cada uno. El PARSER y el
//  orquestador viven en el frontend (src/email/*): esta función solo baja los
//  correos y los normaliza a texto. Así el criterio de parseo está en un sitio.
//
//  Desplegar:  supabase functions deploy gmail-sync
//  Invocar:    supabase.functions.invoke('gmail-sync')
//  Secrets:    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_ENC_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// base64url (como lo entrega Gmail) → texto UTF-8
function b64urlDecode(data: string) {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<\/(p|div|tr|td|li|h[1-6]|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&euro;/gi, '€')
    .replace(/&#8364;/g, '€').replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

// Recorre el árbol MIME buscando el cuerpo: prioriza text/plain; si no, text/html.
function extractText(payload: any): string {
  if (!payload) return '';
  const mt = payload.mimeType || '';
  if (mt === 'text/plain' && payload.body?.data) return b64urlDecode(payload.body.data);
  if (payload.parts) {
    for (const p of payload.parts) {
      if (p.mimeType === 'text/plain' && p.body?.data) return b64urlDecode(p.body.data);
    }
    for (const p of payload.parts) {
      const t = extractText(p);
      if (t) return t;
    }
  }
  if (mt === 'text/html' && payload.body?.data) return htmlToText(b64urlDecode(payload.body.data));
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'No autorizado' }, 401);

    // Refresh token (cifrado) vía RPC con service role
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: tokRows } = await admin.rpc('gmail_read_token', {
      p_user_id: user.id,
      p_key: Deno.env.get('GMAIL_ENC_KEY')!,
    });
    const refresh = tokRows?.[0]?.token;
    if (!refresh) return json({ error: 'No hay ninguna cuenta de correo conectada.' }, 400);

    // Renovar access token
    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: refresh,
        grant_type: 'refresh_token',
      }),
    });
    const tk = await tr.json();
    if (!tk.access_token) return json({ error: 'No se pudo renovar el acceso a Gmail. Vuelve a conectar tu correo.' }, 400);
    const at = tk.access_token;

    // Buscar correos de anfitrión del último año
    const q = encodeURIComponent('(from:airbnb.com OR from:booking.com) newer_than:1y');
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=50`,
      { headers: { Authorization: `Bearer ${at}` } },
    );
    const list = await listRes.json();
    const ids: string[] = (list.messages ?? []).map((m: any) => m.id);

    const emails: any[] = [];
    for (const id of ids) {
      const mRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${at}` } },
      );
      if (!mRes.ok) continue;
      const m = await mRes.json();
      const headers = m.payload?.headers ?? [];
      const h = (n: string) => headers.find((x: any) => x.name.toLowerCase() === n)?.value ?? '';
      emails.push({
        from: h('from'),
        subject: h('subject'),
        text: extractText(m.payload) || m.snippet || '',
      });
    }

    await admin.from('gmail_accounts')
      .update({ last_sync_at: new Date().toISOString() }).eq('user_id', user.id);

    return json({ emails, count: emails.length, error: null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

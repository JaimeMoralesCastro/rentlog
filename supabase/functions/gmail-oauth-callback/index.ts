// ============================================================================
//  Supabase Edge Function · gmail-oauth-callback
//  Recibe el redirect de Google tras el consentimiento (?code&state), canjea el
//  código por tokens (usa el client_secret, que NUNCA sale del servidor), guarda
//  el refresh_token CIFRADO y avisa a la app por postMessage.
//
//  Desplegar:  supabase functions deploy gmail-oauth-callback --no-verify-jwt
//    (lo invoca el navegador de Google, sin JWT de Supabase)
//  Secrets:    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_ENC_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function page(msg: string, ok: boolean) {
  const body = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;padding:48px 24px;text-align:center;color:#0A0A0A">
<p style="font-size:15px;line-height:1.5">${msg}</p>
<script>
  try { window.opener && window.opener.postMessage({ source: 'rentlog-gmail', ok: ${ok} }, '*'); } catch (e) {}
  setTimeout(function(){ window.close(); }, 900);
</script></body></html>`;
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');

  if (oauthErr) return page('Conexión cancelada. Puedes cerrar esta ventana.', false);
  if (!code || !state) return page('Falta el código de autorización.', false);

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // state → usuario (y validez de la sesión de conexión)
    const { data: st } = await admin
      .from('gmail_oauth_states').select('user_id').eq('state', state).single();
    if (!st) return page('Sesión de conexión no válida o caducada. Vuelve a intentarlo.', false);

    // Canje del código por tokens
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-oauth-callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tok = await tokenRes.json();

    if (!tok.refresh_token) {
      // Sin refresh_token: Google no lo reemite si ya diste permiso antes sin
      // revocarlo. Hay que revocar el acceso en la cuenta de Google y reintentar.
      return page('No se recibió acceso permanente. Revoca Rentlog en tu cuenta de Google (Seguridad → Accesos de terceros) y vuelve a conectar.', false);
    }

    // Correo del buzón conectado (para mostrarlo en la app)
    let email: string | null = null;
    try {
      const prof = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (prof.ok) email = (await prof.json()).emailAddress ?? null;
    } catch { /* no bloqueante */ }

    await admin.rpc('gmail_store_token', {
      p_user_id: st.user_id,
      p_email: email,
      p_token: tok.refresh_token,
      p_key: Deno.env.get('GMAIL_ENC_KEY')!,
    });
    await admin.from('gmail_oauth_states').delete().eq('state', state);

    return page('¡Correo conectado! Ya puedes cerrar esta ventana.', true);
  } catch (e) {
    return page('Error al conectar: ' + String(e), false);
  }
});

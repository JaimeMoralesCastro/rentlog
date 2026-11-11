// ============================================================================
//  Conexión con Gmail (OAuth read-only) para el puente "Conecta tu correo".
//  - startGmailConnect(): abre el consentimiento de Google en un popup y resuelve
//    cuando la Edge Function de callback avisa por postMessage.
//  - getGmailAccount(): ¿hay cuenta conectada? (para decidir qué mostrar).
//  - fetchHostEmails(): trae los correos de anfitrión (real vía Edge Function;
//    en modo demo, la bandeja simulada). El parseo lo hace scanInbox aparte.
//  El refresh token vive cifrado en el servidor; aquí nunca se ve.
// ============================================================================
import { supabase, isConfigured, currentUserId } from '../lib/supabase.js';
import { MOCK_HOST_EMAILS } from './mockInbox.js';

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

// ¿Está lista la conexión real? (Supabase + client_id de Google configurados)
export function gmailConfigured() {
  return isConfigured && Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

// Estado de la conexión para este usuario.
export async function getGmailAccount() {
  if (!isConfigured) return { demo: true };
  const { data } = await supabase.from('gmail_accounts').select('email, last_sync_at').maybeSingle();
  return data ? { connected: true, email: data.email, last_sync_at: data.last_sync_at } : { connected: false };
}

// Abre el consentimiento de Google en un popup. Resuelve al conectar.
export async function startGmailConnect() {
  const userId = await currentUserId();
  const state = crypto.randomUUID();
  const { error } = await supabase.from('gmail_oauth_states').insert({ state, user_id: userId });
  if (error) throw new Error(error.message);

  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth-callback`;
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',   // pide refresh_token
    prompt: 'consent',        // fuerza a reemitir el refresh_token
    include_granted_scopes: 'true',
    state,
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  return new Promise((resolve, reject) => {
    const w = 480, h = 660;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(authUrl, 'rentlog-gmail', `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) { reject(new Error('El navegador bloqueó la ventana. Permite las ventanas emergentes e inténtalo de nuevo.')); return; }

    let done = false;
    const onMsg = (ev) => {
      if (ev.data?.source !== 'rentlog-gmail') return;
      done = true;
      cleanup();
      try { popup.close(); } catch { /* noop */ }
      ev.data.ok ? resolve(true) : reject(new Error('No se completó la conexión.'));
    };
    const poll = setInterval(() => {
      if (popup.closed && !done) { cleanup(); reject(new Error('Ventana cerrada antes de terminar.')); }
    }, 500);
    function cleanup() { clearInterval(poll); window.removeEventListener('message', onMsg); }
    window.addEventListener('message', onMsg);
  });
}

// Trae los correos de anfitrión. Demo → bandeja simulada; real → Edge Function.
export async function fetchHostEmails() {
  if (!isConfigured) return MOCK_HOST_EMAILS;
  const { data, error } = await supabase.functions.invoke('gmail-sync', { body: {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.emails ?? [];
}

export async function disconnectGmail() {
  if (!isConfigured) return;
  const userId = await currentUserId();
  await supabase.from('gmail_accounts').delete().eq('user_id', userId);
}

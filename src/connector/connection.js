// ============================================================================
//  Connector · Conexión y tokens
//
//  Modo demo (sin Supabase): la conexión vive en localStorage. El refreshToken
//  mock no es un secreto real, así que es aceptable para desarrollo.
//
//  Modo producción (Supabase configurado): el refreshToken NUNCA se guarda en
//  el cliente. setup() se canjea en el navegador una única vez y el token se
//  envía a la Edge Function `sync-connector` (acción 'store'), que lo cifra
//  con pgp_sym_encrypt y lo persiste en `connector_accounts` (ver
//  supabase/schema-connector.sql). Aquí solo guardamos metadatos visibles.
// ============================================================================
import { supabase, isConfigured } from '../lib/supabase.js';
import { getProvider } from './provider.js';

const LS_KEY = 'rentlog_connector';

export function getConnection() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocal(conn) {
  localStorage.setItem(LS_KEY, JSON.stringify(conn));
}

export function disconnect() {
  localStorage.removeItem(LS_KEY);
}

// Conecta la cuenta del host canjeando su invite code.
// Devuelve { provider, label, connectedAt } y deja los tokens donde toque.
export async function connect(inviteCode, providerName) {
  const provider = getProvider(providerName);
  const { refreshToken } = await provider.setup(inviteCode);

  if (isConfigured) {
    // Producción: el token viaja UNA vez a la Edge Function, que lo cifra y guarda.
    const { error } = await supabase.functions.invoke('sync-connector', {
      body: { action: 'store', provider: provider.id, refresh_token: refreshToken },
    });
    if (error) throw new Error(error.message);
  }

  const conn = {
    provider: provider.id,
    label: provider.label,
    connectedAt: new Date().toISOString(),
    // Solo en demo: el mock necesita el token en el cliente para simular llamadas.
    ...(isConfigured ? {} : { refreshToken }),
  };
  saveLocal(conn);
  return conn;
}

// Access token de sesión para el proveedor activo (solo modo demo/mock;
// en producción los tokens viven en la Edge Function).
export async function getAccessToken() {
  const conn = getConnection();
  if (!conn) throw new Error('No hay ninguna cuenta conectada.');
  const provider = getProvider(conn.provider);
  const { accessToken } = await provider.getToken(conn.refreshToken);
  return { provider, accessToken };
}

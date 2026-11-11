// ============================================================================
//  Connector · Beds24Provider (esqueleto para producción)
//  Misma interfaz que mockProvider, contra la API v2 real de Beds24.
//  Docs: https://wiki.beds24.com/index.php/Category:API_V2 (Swagger en api.beds24.com)
//
//  Auth real (2 pasos):
//   1. El host genera un invite code en Beds24 (Settings → Apps & Integrations →
//      API) con scopes: bookings-personal/read, bookings-financial/read, properties/read.
//   2. setup() lo canjea por un refreshToken de larga vida; getToken() emite
//      accessTokens de 24h a partir de él.
//
//  IMPORTANTE (producción): estas llamadas deben hacerse desde la Edge Function
//  `sync-connector` (server-side) — el refreshToken nunca viaja al navegador.
//  Este módulo también se importa allí (Deno soporta fetch idéntico).
// ============================================================================

const BASE = 'https://api.beds24.com/v2';

async function call(path, { token, headers = {}, ...init } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { token } : {}), ...headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Beds24 ${path} → HTTP ${res.status}${body ? ` · ${body.slice(0, 200)}` : ''}`);
  }
  return res.json();
}

export const beds24Provider = {
  id: 'beds24',
  label: 'Beds24',

  async setup(inviteCode) {
    const data = await call('/authentication/setup', { headers: { code: inviteCode } });
    // Respuesta real: { token, expiresIn, refreshToken }
    return { refreshToken: data.refreshToken };
  },

  async getToken(refreshToken) {
    const data = await call('/authentication/token', { headers: { refreshToken } });
    return { accessToken: data.token, expiresIn: data.expiresIn };
  },

  async getProperties(accessToken) {
    const data = await call('/properties?includeAllRooms=true', { token: accessToken });
    // Normaliza al contrato del Provider (misma forma que el mock)
    return (data.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city ?? '',
      address: p.address ?? '',
      bedrooms: p.roomTypes?.length ?? 1,
      capacity: p.roomTypes?.reduce((s, r) => s + (r.maxPeople ?? 2), 0) || 2,
      channels: p.channels ?? [],
    }));
  },

  async getBookings(accessToken, { modifiedSince } = {}) {
    const qs = new URLSearchParams({ includeInvoiceItems: 'true' });
    if (modifiedSince) qs.set('modifiedFrom', modifiedSince);
    const data = await call(`/bookings?${qs}`, { token: accessToken });
    return (data.data ?? []).map((b) => ({
      id: b.id,
      propertyId: b.propertyId,
      arrival: b.arrival,
      departure: b.departure,
      firstName: b.firstName ?? '',
      lastName: b.lastName ?? '',
      channel: b.channel ?? b.referer ?? 'direct',
      price: Number(b.price) || 0,
      commission: Number(b.commission) || 0,
      status: b.status === 'cancelled' ? 'cancelled' : 'confirmed',
      bookingTime: b.bookingTime,
    }));
  },
};

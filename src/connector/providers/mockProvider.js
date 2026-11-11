// ============================================================================
//  Connector · MockProvider
//  Simula la API v2 de Beds24 con formas de respuesta realistas (calcadas de
//  GET /properties?includeAllRooms=true y GET /bookings?includeInvoiceItems=true)
//  y latencia artificial, para construir y probar todo el flujo sin cuenta real.
//
//  Invite code de demo aceptado: cualquier código que empiece por "DEMO"
//  (p.ej. DEMO-1234). Cualquier otro → error de código no válido, como haría
//  la API real con un invite code caducado.
// ============================================================================

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Dataset estilo Beds24: dos propiedades con reservas de Airbnb y Booking,
// con importes y comisiones reales por reserva.
const MOCK_PROPERTIES = [
  {
    id: 41277, name: 'Loft Malasaña', city: 'Madrid', address: 'C/ del Pez 21',
    bedrooms: 1, capacity: 3, channels: ['airbnb', 'bookingcom'],
  },
  {
    id: 41278, name: 'Ático Ruzafa', city: 'Valencia', address: 'C/ Cuba 45',
    bedrooms: 2, capacity: 5, channels: ['airbnb', 'bookingcom'],
  },
];

const MOCK_BOOKINGS = [
  // Loft Malasaña
  { id: 9120001, propertyId: 41277, arrival: '2026-06-05', departure: '2026-06-09', firstName: 'Claire', lastName: 'Dubois',  channel: 'airbnb',     price: 512.00, commission: 76.80, status: 'confirmed', bookingTime: '2026-04-18T10:22:00Z' },
  { id: 9120002, propertyId: 41277, arrival: '2026-06-14', departure: '2026-06-18', firstName: 'Marco',  lastName: 'Rossi',   channel: 'bookingcom', price: 468.00, commission: 70.20, status: 'confirmed', bookingTime: '2026-05-02T08:11:00Z' },
  { id: 9120003, propertyId: 41277, arrival: '2026-07-10', departure: '2026-07-15', firstName: 'Emma',   lastName: 'Larsen',  channel: 'airbnb',     price: 690.00, commission: 103.50, status: 'confirmed', bookingTime: '2026-05-27T19:40:00Z' },
  { id: 9120004, propertyId: 41277, arrival: '2026-07-22', departure: '2026-07-25', firstName: 'Tom',    lastName: 'Becker',  channel: 'bookingcom', price: 342.00, commission: 51.30, status: 'cancelled', bookingTime: '2026-06-01T12:05:00Z' },
  // Ático Ruzafa
  { id: 9120005, propertyId: 41278, arrival: '2026-06-20', departure: '2026-06-27', firstName: 'Sophie', lastName: 'Martin',  channel: 'airbnb',     price: 1120.00, commission: 168.00, status: 'confirmed', bookingTime: '2026-04-30T16:55:00Z' },
  { id: 9120006, propertyId: 41278, arrival: '2026-07-03', departure: '2026-07-08', firstName: 'Jan',    lastName: 'de Vries', channel: 'bookingcom', price: 815.00, commission: 122.25, status: 'confirmed', bookingTime: '2026-05-15T09:30:00Z' },
  { id: 9120007, propertyId: 41278, arrival: '2026-08-01', departure: '2026-08-08', firstName: 'Laura',  lastName: 'García',  channel: 'airbnb',     price: 1290.00, commission: 193.50, status: 'confirmed', bookingTime: '2026-06-12T21:14:00Z' },
];

export const mockProvider = {
  id: 'mock',
  label: 'Beds24 (demo)',

  // POST /authentication/setup con header inviteCode → { token, refreshToken }
  async setup(inviteCode) {
    await delay(700);
    const code = (inviteCode || '').trim().toUpperCase();
    if (!code.startsWith('DEMO')) {
      throw new Error('Código de invitación no válido o caducado. Usa un código DEMO-… para probar.');
    }
    return { refreshToken: `mock-refresh-${crypto.randomUUID()}` };
  },

  // GET /authentication/token con header refreshToken → { token, expiresIn }
  async getToken(refreshToken) {
    await delay(300);
    if (!refreshToken?.startsWith('mock-refresh-')) throw new Error('Sesión del connector caducada. Vuelve a conectar.');
    return { accessToken: `mock-access-${Date.now()}`, expiresIn: 86400 };
  },

  // GET /properties?includeAllRooms=true
  async getProperties(accessToken) {
    await delay(600);
    if (!accessToken) throw new Error('Token no válido.');
    return MOCK_PROPERTIES;
  },

  // GET /bookings?includeInvoiceItems=true[&modifiedSince=...]
  async getBookings(accessToken, { modifiedSince } = {}) {
    await delay(800);
    if (!accessToken) throw new Error('Token no válido.');
    if (!modifiedSince) return MOCK_BOOKINGS;
    return MOCK_BOOKINGS.filter((b) => b.bookingTime > modifiedSince);
  },
};

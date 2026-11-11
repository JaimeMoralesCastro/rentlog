// ============================================================================
//  Connector · Mapper proveedor → modelos Rentlog
//  Convierte las formas del Provider (calcadas de Beds24 v2) a las filas que
//  esperan `properties` y `reservations`. Dedupe con el MISMO patrón que
//  sync-ical: external_uid único por (user_id, external_uid).
// ============================================================================

// Canal del proveedor → etiqueta de canal Rentlog
const CHANNEL_LABEL = {
  airbnb: 'Airbnb',
  bookingcom: 'Booking',
  booking: 'Booking',
  vrbo: 'Vrbo',
  direct: 'Directo',
};

export function channelLabel(ch) {
  return CHANNEL_LABEL[(ch || '').toLowerCase()] ?? 'Directo';
}

// Propiedad del proveedor → fila de `properties`.
// `connected_via` alimenta el badge "Conectado vía X" y marca el origen.
export function mapProperty(p, providerId, providerLabel) {
  return {
    name: p.name,
    city: p.city || '',
    address: p.address || '',
    bedrooms: p.bedrooms || 1,
    capacity: p.capacity || 2,
    platform: channelLabel(p.channels?.[0]),
    connected_via: providerLabel,
    external_property_id: `${providerId}-${p.id}`,
  };
}

// Reserva del proveedor → fila de `reservations`.
// propertyIdByExternal: mapa external_property_id → uuid Rentlog (tras crear las propiedades).
export function mapBooking(b, providerId, propertyIdByExternal) {
  return {
    external_uid: `${providerId}-${b.id}`,
    property_id: propertyIdByExternal[`${providerId}-${b.propertyId}`] ?? null,
    guest_name: [b.firstName, b.lastName].filter(Boolean).join(' ').trim(),
    source: channelLabel(b.channel),
    check_in: b.arrival,
    check_out: b.departure,
    gross_income: Number(b.price) || 0,
    channel_fee: Number(b.commission) || 0,
    status: b.status === 'cancelled' ? 'cancelled' : 'confirmed',
  };
}

// Filtra reservas ya importadas (mismo criterio que sync-ical: Set de external_uid).
export function dedupeBookings(mapped, existingReservations) {
  const known = new Set((existingReservations ?? []).map((r) => r.external_uid).filter(Boolean));
  return mapped.filter((r) => !known.has(r.external_uid));
}

// ============================================================================
//  Connector · Importación del negocio del host
//  Orquesta el flujo completo tras conectar: trae propiedades y reservas del
//  proveedor, las mapea a modelos Rentlog y las persiste REUTILIZANDO las
//  funciones del hook de datos (saveProperty / importReservations) — así el
//  connector funciona igual en demo (memoria) y producción (Supabase+RLS).
//
//  Dedupe:
//   · Propiedades: por external_property_id (no re-crea al reimportar).
//   · Reservas: por external_uid (patrón sync-ical).
// ============================================================================
import { getAccessToken } from './connection.js';
import { mapProperty, mapBooking, dedupeBookings } from './mapper.js';

// data: objeto devuelto por useRentlogData (properties, reservations, saveProperty, importReservations)
// onProgress: callback opcional (etapa: 'auth' | 'properties' | 'bookings' | 'saving')
export async function importBusiness(data, onProgress = () => {}) {
  onProgress('auth');
  const { provider, accessToken } = await getAccessToken();

  onProgress('properties');
  const remoteProps = await provider.getProperties(accessToken);

  // Crea solo las propiedades que aún no existen (dedupe por external_property_id)
  const existingByExternal = {};
  for (const p of data.properties) {
    if (p.external_property_id) existingByExternal[p.external_property_id] = p.id;
  }

  const propertyIdByExternal = { ...existingByExternal };
  let propertiesCreated = 0;
  for (const rp of remoteProps) {
    const row = mapProperty(rp, provider.id, provider.label);
    if (propertyIdByExternal[row.external_property_id]) continue;
    const created = await data.saveProperty(row);
    if (created?.id) {
      propertyIdByExternal[row.external_property_id] = created.id;
      propertiesCreated++;
    }
  }

  onProgress('bookings');
  const remoteBookings = await provider.getBookings(accessToken);
  const mapped = remoteBookings.map((b) => mapBooking(b, provider.id, propertyIdByExternal));
  const nuevas = dedupeBookings(mapped, data.reservations);

  onProgress('saving');
  let inserted = 0;
  if (nuevas.length) {
    const res = await data.importReservations(nuevas);
    inserted = res?.inserted ?? 0;
  }

  const grossTotal = nuevas.reduce((s, r) => s + r.gross_income, 0);
  return {
    provider: provider.label,
    propertiesFound: remoteProps.length,
    propertiesCreated,
    reservationsFound: remoteBookings.length,
    reservationsImported: inserted,
    duplicatesSkipped: mapped.length - nuevas.length,
    grossTotal,
  };
}

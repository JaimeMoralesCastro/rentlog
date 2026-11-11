// ============================================================================
//  Connector · Abstracción de proveedor (channel manager)
//
//  Contrato que toda implementación debe cumplir. El resto de la app SOLO
//  habla con esta interfaz — nunca con Beds24/Channex directamente — para
//  poder cambiar de proveedor (mock hoy, Beds24 mañana, Channex a escala)
//  sin tocar UI, mapper ni sync.
//
//  interface Provider {
//    id: string                  // 'mock' | 'beds24' | ...
//    label: string               // nombre mostrado en el badge "Conectado vía X"
//    setup(inviteCode)           // → { refreshToken } | throws Error(mensaje legible)
//    getToken(refreshToken)      // → { accessToken, expiresIn }
//    getProperties(accessToken)  // → [{ id, name, city, address, bedrooms, capacity, channels }]
//    getBookings(accessToken, { modifiedSince? })
//                                // → [{ id, propertyId, arrival, departure, firstName, lastName,
//                                //      channel, price, commission, status, bookingTime }]
//  }
//
//  Las formas de respuesta calcan la API v2 de Beds24 (GET /properties,
//  GET /bookings?includeInvoiceItems=true) para que el mock sea realista y el
//  salto a producción sea solo de transporte, no de mapeo.
// ============================================================================
import { mockProvider } from './providers/mockProvider.js';
import { beds24Provider } from './providers/beds24Provider.js';

const REGISTRY = {
  mock: mockProvider,
  beds24: beds24Provider,
};

// Proveedor activo: por env (VITE_CONNECTOR_PROVIDER) o mock por defecto.
export function getProvider(name) {
  const id = name || import.meta.env.VITE_CONNECTOR_PROVIDER || 'mock';
  const p = REGISTRY[id];
  if (!p) throw new Error(`Proveedor de connector desconocido: ${id}`);
  return p;
}

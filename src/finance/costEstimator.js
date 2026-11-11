// ============================================================================
//  ESTIMADOR DE COSTES
//  Estima los costes operativos recurrentes de una propiedad a partir de:
//    • TAMAÑO del piso (nº de habitaciones y capacidad) → tarifas unitarias.
//    • USO real (reservas: nº de estancias y noches del periodo).
//
//  Cuatro partidas:
//    - Limpieza      → por estancia (cada salida = una limpieza). Escala con tamaño.
//    - Conservación  → desgaste por noche ocupada. Más uso = más mantenimiento.
//    - Consumibles   → amenities por estancia (escala con capacidad).
//    - Suministros   → luz/agua/gas por noche ocupada.
//
//  El cliente puede SOBREESCRIBIR cualquier tarifa unitaria (campos
//  est_* en la propiedad). Si no la toca, se usa la estimación automática.
// ============================================================================

function round(n) { return Math.round(n); }
function round2(n) { return Math.round(n * 100) / 100; }
function numOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && value !== '' && value !== null && value !== undefined ? n : fallback;
}

// Índice de coste por zona (mano de obra y suministros): islas y grandes
// ciudades más caras; medios rurales más baratos. Basado en diferencias
// reales de coste de vida y servicios en España.
export const ZONE_COST_INDEX = { Playa: 1.05, Ciudad: 1.12, Montaña: 1.00, Rural: 0.90 };

// Tarifas unitarias por defecto, según TAMAÑO del piso y ZONA, partiendo de
// precios medios de referencia en España (limpieza ~30-55€/turno, suministros
// unos pocos € por noche, etc.).
export function defaultRates(property = {}) {
  const bd = Math.max(Number(property.bedrooms) || 1, 1);
  const cap = Math.max(Number(property.capacity) || 2, 1);
  const z = ZONE_COST_INDEX[property.zone_type] ?? 1;
  return {
    cleaningPerStay:     round((22 + 12 * bd) * z),    // limpieza por reserva
    maintenancePerNight: round2((0.8 + 0.3 * bd) * z), // conservación/desgaste por noche
    consumablesPerStay:  round2(3 + 1.5 * cap),        // amenities por reserva
    utilitiesPerNight:   round2((2.5 + 1.2 * bd) * z), // suministros por noche
  };
}

// Tarifas efectivas: usa el override del cliente si existe; si no, la automática.
export function effectiveRates(property = {}) {
  const d = defaultRates(property);
  return {
    cleaningPerStay:     numOr(property.est_cleaning_per_stay, d.cleaningPerStay),
    maintenancePerNight: numOr(property.est_maintenance_per_night, d.maintenancePerNight),
    consumablesPerStay:  numOr(property.est_consumables_per_stay, d.consumablesPerStay),
    utilitiesPerNight:   numOr(property.est_utilities_per_night, d.utilitiesPerNight),
  };
}

// Indica si una partida está sobreescrita manualmente por el cliente.
export function overriddenFlags(property = {}) {
  const has = v => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));
  return {
    cleaningPerStay:     has(property.est_cleaning_per_stay),
    maintenancePerNight: has(property.est_maintenance_per_night),
    consumablesPerStay:  has(property.est_consumables_per_stay),
    utilitiesPerNight:   has(property.est_utilities_per_night),
  };
}

// Noches de una reserva que caen dentro de [from, to]
function nightsInRange(r, from, to) {
  const ci = new Date(r.check_in), co = new Date(r.check_out);
  const start = ci > from ? ci : from;
  const end = co < to ? co : to;
  return Math.max(Math.round((end - start) / 86400000), 0);
}

// Uso (estancias + noches) de un conjunto de reservas dentro de [from, to].
// Una "estancia" cuenta si la reserva tiene alguna noche en el periodo.
export function usageInRange(reservations = [], from, to) {
  let stays = 0, nights = 0;
  for (const r of reservations) {
    if (r.status === 'cancelled') continue;
    const n = nightsInRange(r, from, to);
    if (n > 0) { stays += 1; nights += n; }
  }
  return { stays, nights };
}

/**
 * Estima los costes de una propiedad para un periodo.
 * @param property      la propiedad (tamaño + posibles overrides)
 * @param reservations  reservas de esa propiedad
 * @param range         { from, to } del periodo (Date)
 */
export function estimateCosts(property, reservations = [], range) {
  const from = range?.from ?? startOfThisMonth();
  const to = range?.to ?? endOfThisMonth();
  const rates = effectiveRates(property);
  const overridden = overriddenFlags(property);
  const { stays, nights } = usageInRange(reservations, from, to);

  const cleaning     = rates.cleaningPerStay * stays;
  const maintenance  = rates.maintenancePerNight * nights;
  const consumables  = rates.consumablesPerStay * stays;
  const utilities    = rates.utilitiesPerNight * nights;
  const total = cleaning + maintenance + consumables + utilities;

  return {
    stays, nights, rates, overridden,
    items: [
      { key: 'cleaning',    label: 'Limpieza',     value: round2(cleaning),    detail: `${stays} estancias × ${rates.cleaningPerStay}€` },
      { key: 'maintenance', label: 'Conservación', value: round2(maintenance), detail: `${nights} noches × ${rates.maintenancePerNight}€` },
      { key: 'consumables', label: 'Consumibles',  value: round2(consumables), detail: `${stays} estancias × ${rates.consumablesPerStay}€` },
      { key: 'utilities',   label: 'Suministros',  value: round2(utilities),   detail: `${nights} noches × ${rates.utilitiesPerNight}€` },
    ],
    total: round2(total),
  };
}

function startOfThisMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfThisMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59); }

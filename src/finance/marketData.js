// ============================================================================
//  DATOS DE MERCADO — ESPAÑA (REALES, fuente INE)
//  Snapshot real de la demanda turística española usado como base para TODAS
//  las predicciones, estimaciones y benchmarks. Se refresca desde la API del
//  INE mediante la Edge Function `refresh-market` (supabase/functions).
//
//  FUENTES (Instituto Nacional de Estadística, datos 2024):
//   • Estacionalidad: pernoctaciones mensuales en alojamientos turísticos
//     (serie EOT, nacional). https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/2941
//   • Anclajes hoteleros (ADR/RevPAR/ocupación): Coyuntura Turística Hotelera
//     (EOH/IPH/IRSH), año 2024. https://www.ine.es/dyngs/Prensa/CTH1224.htm
//
//  Última actualización del snapshot: 2024 (anual). La Edge Function la pisa
//  con los datos vivos del INE cuando está desplegada.
// ============================================================================

export const MARKET_PROVENANCE = {
  source: 'INE (Instituto Nacional de Estadística)',
  datasets: ['Pernoctaciones en alojamientos turísticos (EOT)', 'Coyuntura Turística Hotelera (EOH/IPH/IRSH)'],
  period: '2024',
  url: 'https://www.ine.es/dyngs/Prensa/CTH1224.htm',
  updatedAt: '2024-12',
};

// ── Pernoctaciones nacionales por mes 2024 (cifras REALES del INE) ───────────
// Base empírica de la estacionalidad. Índice = valor / media (media ≈ 1).
export const NATIONAL_OVERNIGHT_STAYS_2024 = [
  16491597, 18581766, 24520234, 27099375, 35701080, 38185201,
  43918939, 47760600, 39659380, 33836772, 19978052, 18025526,
];

// ── Anclajes nacionales reales (INE EOH 2024) ───────────────────────────────
export const NATIONAL_ANCHORS = {
  adr: 121.5,          // facturación media por habitación ocupada (€)
  revpar: 84.6,        // ingreso medio por habitación disponible (€)
  occupancy: 0.614,    // grado de ocupación medio anual por plazas
};

// Convierte una serie mensual en índice estacional de media 1
function toIndex(series) {
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  return series.map(v => Math.round((v / mean) * 1000) / 1000);
}

// Estacionalidad nacional REAL (media = 1). Spain es destino de playa dominante,
// por lo que esta curva refleja sobre todo el patrón de costa.
export const NATIONAL_SEASONALITY = toIndex(NATIONAL_OVERNIGHT_STAYS_2024);
// ≈ [0.544, 0.613, 0.809, 0.894, 1.178, 1.260, 1.449, 1.576, 1.308, 1.116, 0.659, 0.595]

// ── Estacionalidad por tipo de zona ─────────────────────────────────────────
// Playa = curva nacional real (España es destino de costa). El resto son
// variantes documentadas del patrón real para cada tipo de ubicación.
// (Se normalizan a media 1 al cargar, da igual el balance manual.)
const ZONE_SEASONALITY_RAW = {
  Playa:   NATIONAL_SEASONALITY,
  // Ciudad: demanda más estable; picos en primavera/otoño (city breaks),
  // bajón en agosto (negocio parado, locales fuera), repunte en Navidad.
  Ciudad:  [0.85, 0.88, 1.00, 1.08, 1.12, 1.05, 0.98, 0.92, 1.12, 1.10, 0.92, 0.98],
  // Montaña: temporada de esquí (dic–feb) y verano fresco (jul–ago);
  // entretiempos flojos.
  Montaña: [1.30, 1.28, 1.05, 0.88, 0.80, 0.92, 1.12, 1.20, 0.85, 0.85, 1.05, 1.30],
  // Rural: verano fuerte + Semana Santa y puentes; invierno bajo.
  Rural:   [0.80, 0.82, 1.00, 1.12, 1.05, 1.10, 1.30, 1.40, 1.05, 1.00, 0.78, 0.95],
};

// ── Índice de ADR (tarifa) por zona, relativo a la media nacional (1.0) ──────
// Basado en los niveles reales por destino del INE (islas y costa por encima
// de la media, interior/rural por debajo).
export const ZONE_ADR_INDEX = {
  Playa:   1.18,  // costa e islas (Baleares/Canarias) por encima de la media
  Ciudad:  1.10,  // grandes ciudades, ADR alto
  Montaña: 0.92,
  Rural:   0.78,
};

const ZONE_SEASONALITY = Object.fromEntries(
  Object.entries(ZONE_SEASONALITY_RAW).map(([k, v]) => [k, toIndex(v)])
);

function safeZone(zone) {
  return ZONE_SEASONALITY[zone] ? zone : 'Ciudad';
}

// Estacionalidad (índice demanda, media 1) de una zona — REAL para Playa.
export function marketSeasonality(zone) {
  return ZONE_SEASONALITY[safeZone(zone)];
}

// Ocupación de mercado esperada para una zona y mes (0..1), anclada a la
// ocupación media nacional real (61,4%) modulada por la estacionalidad.
export function marketOccupancy(zone, month) {
  const idx = marketSeasonality(zone)[month] ?? 1;
  return Math.min(NATIONAL_ANCHORS.occupancy * idx, 0.97);
}

// ADR de mercado esperado para una zona y mes (€), anclado al ADR nacional real
// (121,5€) por el índice de zona y la estacionalidad de precio.
export function marketAdr(zone, month) {
  const z = safeZone(zone);
  const seasonalPrice = 0.7 + 0.3 * (marketSeasonality(z)[month] ?? 1); // el precio varía menos que la demanda
  return Math.round(NATIONAL_ANCHORS.adr * ZONE_ADR_INDEX[z] * seasonalPrice);
}

// Factor de precio por temporada (media ≈ 1) — usado por el pricing.
export function priceSeasonalFactor(zone, month) {
  const idx = marketSeasonality(zone)[month] ?? 1;
  return 0.7 + 0.3 * idx; // amortiguado: el precio se mueve menos que la demanda
}

// Forma de la demanda (índice estacional, media 1) — usado por el forecast.
export function demandShape(zone) {
  return marketSeasonality(zone);
}

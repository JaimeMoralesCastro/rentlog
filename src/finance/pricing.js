// ============================================================================
//  MOTOR DE PRICING — Smart Rate
//  Sugiere tarifa por noche ponderando TRES señales:
//    1. Estacionalidad REAL de la demanda (datos INE, vía marketData.js).
//    2. Ubicación / tipo de zona (Playa, Ciudad, Montaña, Rural).
//    3. Ocupación actual — su efecto a la baja se amortigua en temporada alta
//       (aunque haya huecos, en plena temporada NO conviene malvender).
//  Toda la estacionalidad procede ahora de datos reales del INE.
// ============================================================================
import { marketSeasonality, priceSeasonalFactor } from './marketData.js';

export const ZONE_TYPES = ['Playa', 'Ciudad', 'Montaña', 'Rural'];

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function seasonLabel(demandIdx) {
  if (demandIdx >= 1.30) return 'temporada alta';
  if (demandIdx >= 1.05) return 'temporada media-alta';
  if (demandIdx >= 0.90) return 'temporada media';
  return 'temporada baja';
}

/**
 * Sugiere tarifa para una propiedad.
 * @returns { baseRate, suggested, deltaPct, season, occupancy, zone, reason }
 */
export function suggestRate(property = {}, kpis = {}, refDate = new Date()) {
  const base = Number(property.base_rate) || Number(kpis.adr) || 90;
  const zone = ZONE_TYPES.includes(property.zone_type) ? property.zone_type : 'Ciudad';
  const month = refDate.getMonth();
  const demandIdx = marketSeasonality(zone)[month];        // índice real INE (media 1)
  const seasonal = priceSeasonalFactor(zone, month);        // factor de precio amortiguado
  const occ = Number(kpis.occupancy) || 0;

  // Ajuste por ocupación respecto a un objetivo neutro (~65%)
  let occAdj = 0;
  if (occ > 0.85) occAdj = 0.12;
  else if (occ > 0.65) occAdj = 0.05;
  else if (occ < 0.35) occAdj = -0.12;
  else if (occ < 0.50) occAdj = -0.05;

  // En temporada alta amortiguamos la bajada (no malvender con huecos)
  let damped = false;
  if (occAdj < 0 && demandIdx >= 1.30) { occAdj *= 0.25; damped = true; }
  else if (occAdj < 0 && demandIdx >= 1.05) { occAdj *= 0.6; damped = true; }

  const factor = seasonal * (1 + occAdj);
  const suggested = Math.round(base * factor);
  const deltaPct = Math.round((factor - 1) * 100);
  const season = seasonLabel(demandIdx);
  const reason = buildReason({ zone, month, season, occ, deltaPct });

  return { baseRate: Math.round(base), suggested, deltaPct, season, occupancy: occ, zone, reason, damped };
}

function buildReason({ zone, month, season, occ, deltaPct }) {
  const mes = MONTH_NAMES[month];
  const occPct = Math.round(occ * 100);
  const zonaTxt = { Playa: 'costa', Ciudad: 'ciudad', Montaña: 'montaña', Rural: 'entorno rural' }[zone];
  const lowOcc = occ < 0.45;

  if (lowOcc && deltaPct >= 0) {
    return `${capitalize(season)} en ${zonaTxt} (${mes}): aunque tengas huecos (${occPct}% ocupación), no bajes la tarifa — la demanda real de la temporada la sostiene.`;
  }
  if (occ > 0.80) {
    return `Ocupación muy alta (${occPct}%) en ${season} de ${zonaTxt}: hay margen para subir el precio.`;
  }
  if (deltaPct <= -1) {
    return `${capitalize(season)} en ${zonaTxt} (${mes}) con ${occPct}% de ocupación: una bajada moderada ayuda a llenar huecos.`;
  }
  if (deltaPct >= 1) {
    return `${capitalize(season)} en ${zonaTxt} (${mes}): conviene subir la tarifa, es buena época.`;
  }
  return `Demanda estable en ${zonaTxt} (${mes}): mantén tu tarifa.`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ============================================================================
//  C2 — Smart Rate noche a noche (calendario, sustituye a PriceLabs).
//  Extiende el motor mensual a resolución diaria: añade el recargo de fin de
//  semana sobre el factor estacional (INE) del mes y el ajuste por ocupación.
// ============================================================================

function occAdjustment(occ, demandIdx) {
  let adj = 0;
  if (occ > 0.85) adj = 0.12;
  else if (occ > 0.65) adj = 0.05;
  else if (occ < 0.35) adj = -0.12;
  else if (occ < 0.50) adj = -0.05;
  if (adj < 0 && demandIdx >= 1.30) adj *= 0.25;
  else if (adj < 0 && demandIdx >= 1.05) adj *= 0.6;
  return adj;
}

// Recargo por día de la semana: viernes y sábado se pagan más.
function weekendFactor(dow) {
  if (dow === 5 || dow === 6) return 0.10; // viernes, sábado
  if (dow === 4) return 0.03;              // jueves, ligera subida
  if (dow === 0) return -0.02;             // domingo, ligera bajada
  return 0;
}

// Precio sugerido para UNA noche concreta.
export function nightlyRate(property = {}, date = new Date(), { occupancy = 0 } = {}) {
  const base = Number(property.base_rate) || 90;
  const zone = ZONE_TYPES.includes(property.zone_type) ? property.zone_type : 'Ciudad';
  const month = date.getMonth();
  const demandIdx = marketSeasonality(zone)[month];
  const seasonal = priceSeasonalFactor(zone, month);
  const occAdj = occAdjustment(occupancy, demandIdx);
  const dow = date.getDay();
  const factor = seasonal * (1 + weekendFactor(dow)) * (1 + occAdj);
  const floor = Number(property.min_rate) || Math.round(base * 0.55);
  const price = Math.max(Math.round(base * factor), floor);
  return {
    price, base: Math.round(base), floor,
    deltaPct: Math.round((price / base - 1) * 100),
    isWeekend: dow === 5 || dow === 6,
    season: seasonLabel(demandIdx),
  };
}

// Construye el calendario de tarifas de un mes para una propiedad.
// Marca las noches ya reservadas (no se tarifican) y aplica overrides del anfitrión.
export function buildRateCalendar(property, reservations = [], { year, month, overrides = {}, today = new Date() } = {}) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Noches ocupadas de esta propiedad (una reserva ocupa [check_in, check_out))
  const booked = new Map(); // 'YYYY-MM-DD' -> guest
  for (const r of reservations) {
    if (r.property_id !== property.id || r.status === 'cancelled') continue;
    const ci = new Date(r.check_in), co = new Date(r.check_out);
    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      booked.set(ymdLocal(d), r.guest_name || 'Reservado');
    }
  }

  // Ocupación del mes (para el ajuste de precio)
  let bookedThisMonth = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    if (booked.has(ymdLocal(new Date(year, month, day)))) bookedThisMonth++;
  }
  const occupancy = bookedThisMonth / daysInMonth;

  const todayYmd = ymdLocal(today);
  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = ymdLocal(date);
    const rate = nightlyRate(property, date, { occupancy });
    const override = overrides[key];
    const guest = booked.get(key) || null;
    days.push({
      date: key,
      day,
      dow: date.getDay(),
      suggested: rate.price,
      price: override != null ? override : rate.price,
      override: override != null ? override : null,
      deltaPct: rate.deltaPct,
      isWeekend: rate.isWeekend,
      booked: !!guest,
      guest,
      isPast: key < todayYmd,
      leadingBlanks: day === 1 ? (first.getDay() + 6) % 7 : 0, // lunes primero
    });
  }
  return { days, occupancy, daysInMonth, season: days[0] ? nightlyRate(property, new Date(year, month, 1), { occupancy }).season : '' };
}

function ymdLocal(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

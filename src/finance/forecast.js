// ============================================================================
//  MOTOR DE PREDICCIÓN (forecast)
//  Proyecta ocupación e ingresos de los próximos meses combinando:
//    • El NIVEL de demanda real de la propiedad (su histórico desestacionalizado).
//    • La FORMA estacional de su zona (demandShape) → reparte la demanda por mes.
//    • El precio por temporada (priceSeasonalFactor) para proyectar ingresos.
//  Es un modelo nivel × estacionalidad: simple, explicable y sin API externa.
// ============================================================================
import { demandShape, priceSeasonalFactor } from './marketData.js';

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function ym(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

// Noches de una reserva dentro de [from, to]
function nightsInRange(r, from, to) {
  const ci = new Date(r.check_in), co = new Date(r.check_out);
  const start = ci > from ? ci : from;
  const end = co < to ? co : to;
  return Math.max(Math.round((end - start) / 86400000), 0);
}

// Histórico mensual (noches reservadas + ingreso prorrateado) de una propiedad
function monthlyHistory(reservations, monthsBack, now) {
  const out = [];
  for (let i = monthsBack; i >= 1; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
    let nights = 0, revenue = 0;
    for (const r of reservations) {
      if (r.status === 'cancelled') continue;
      const n = nightsInRange(r, from, to);
      if (n <= 0) continue;
      const total = Math.max(r.nights || nightsInRange(r, new Date(r.check_in), new Date(r.check_out)), 1);
      nights += n;
      revenue += (Number(r.gross_income) || 0) * (n / total);
    }
    out.push({ month: ref.getMonth(), year: ref.getFullYear(), nights, revenue, days: daysInMonth(ref.getFullYear(), ref.getMonth()) });
  }
  return out;
}

// Nivel de demanda desestacionalizado: media de (ocupación / formaEstacional)
function demandLevel(history, shape) {
  const ratios = [];
  for (const h of history) {
    if (h.nights <= 0) continue;
    const occ = h.nights / h.days;
    const s = shape[h.month] || 1;
    ratios.push(occ / s);
  }
  if (ratios.length === 0) return 0.45; // sin histórico: nivel medio por defecto
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

// ADR de referencia (histórico real o tarifa base)
function referenceAdr(history, property) {
  let nights = 0, revenue = 0;
  for (const h of history) { nights += h.nights; revenue += h.revenue; }
  if (nights > 0 && revenue > 0) return revenue / nights;
  return Number(property.base_rate) || 80;
}

/**
 * Construye la predicción agregada de una cartera de propiedades.
 * @returns {
 *   series: [{ key, label, occ, revenue, isForecast }],   // pasado + futuro
 *   insights: { nextMonthOcc, next90Revenue, bestMonth, worstMonth, trendPct, confidence }
 * }
 */
export function buildForecast(properties = [], reservations = [], { monthsBack = 6, monthsAhead = 6 } = {}) {
  const now = new Date();
  const units = Math.max(properties.length, 1);

  // Pre-cálculo por propiedad: histórico, nivel y ADR
  const perProp = properties.map(p => {
    const res = reservations.filter(r => r.property_id === p.id);
    const hist = monthlyHistory(res, monthsBack, now);
    const shape = demandShape(p.zone_type);
    return { p, hist, shape, level: demandLevel(hist, shape), adr: referenceAdr(hist, p) };
  });

  const series = [];

  // ── Pasado (histórico real agregado) ──
  for (let i = monthsBack; i >= 1; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const days = daysInMonth(ref.getFullYear(), ref.getMonth());
    let nights = 0, revenue = 0;
    for (const pp of perProp) {
      const h = pp.hist.find(x => x.year === ref.getFullYear() && x.month === ref.getMonth());
      if (h) { nights += h.nights; revenue += h.revenue; }
    }
    series.push({
      key: ym(ref), label: MONTHS_SHORT[ref.getMonth()],
      occ: units * days > 0 ? nights / (units * days) : 0,
      revenue: Math.round(revenue),
      isForecast: false,
    });
  }

  // ── Futuro (predicción) ──
  const futureMonths = [];
  for (let i = 0; i < monthsAhead; i++) {
    const ref = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const m = ref.getMonth();
    const days = daysInMonth(ref.getFullYear(), m);
    let nights = 0, revenue = 0, occWeighted = 0;
    for (const pp of perProp) {
      const occ = Math.min(Math.max(pp.level * (pp.shape[m] || 1), 0), 0.97);
      const n = occ * days;
      // ADR proyectado: histórico modulado por el precio de temporada (media ≈ 1)
      const adr = pp.adr * priceSeasonalFactor(pp.p.zone_type, m);
      nights += n;
      revenue += n * adr;
      occWeighted += occ;
    }
    const occ = units * days > 0 ? nights / (units * days) : 0;
    const point = {
      key: ym(ref), label: MONTHS_SHORT[m], monthIdx: m,
      occ, revenue: Math.round(revenue), isForecast: true,
    };
    series.push(point);
    futureMonths.push(point);
  }

  // ── Insights ──
  const next = futureMonths[0];
  const next90 = futureMonths.slice(0, 3).reduce((s, p) => s + p.revenue, 0);
  const sortedByOcc = [...futureMonths].sort((a, b) => b.occ - a.occ);
  const best = sortedByOcc[0];
  const worst = sortedByOcc[sortedByOcc.length - 1];

  // Tendencia: media de ingresos pasados vs futuros próximos
  const pastRev = series.filter(s => !s.isForecast).slice(-3).map(s => s.revenue);
  const futRev = futureMonths.slice(0, 3).map(s => s.revenue);
  const pastAvg = avg(pastRev), futAvg = avg(futRev);
  const trendPct = pastAvg > 0 ? Math.round((futAvg - pastAvg) / pastAvg * 100) : 0;

  // Confianza: cuántos meses de histórico con datos tenemos
  const histMonthsWithData = series.filter(s => !s.isForecast && s.revenue > 0).length;
  const confidence = histMonthsWithData >= 4 ? 'alta' : histMonthsWithData >= 2 ? 'media' : 'baja';

  return {
    series,
    insights: {
      nextMonthOcc: next?.occ ?? 0,
      nextMonthLabel: next ? MONTHS_LONG[next.monthIdx] : '',
      next90Revenue: Math.round(next90),
      bestMonth: best ? MONTHS_LONG[best.monthIdx] : '',
      bestMonthOcc: best?.occ ?? 0,
      worstMonth: worst ? MONTHS_LONG[worst.monthIdx] : '',
      worstMonthOcc: worst?.occ ?? 0,
      trendPct,
      confidence,
    },
  };
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

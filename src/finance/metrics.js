// ============================================================================
//  Motor de métricas — KPIs hoteleros aplicados al pequeño anfitrión.
//  Ocupación · ADR · RevPAR · Beneficio neto (P&L) · Break-even occupancy.
//  Puro: recibe arrays de reservas/gastos, no toca la BBDD.
// ============================================================================
import { startOfMonth, endOfMonth, daysInMonth } from './dateHelpers.js';

// Noches reservadas que caen dentro de [from, to] (prorratea estancias a caballo del mes)
function nightsInRange(reservation, from, to) {
  const ci = new Date(reservation.check_in);
  const co = new Date(reservation.check_out);
  const start = ci > from ? ci : from;
  const end = co < to ? co : to;
  const ms = end - start;
  return ms > 0 ? Math.round(ms / 86400000) : 0;
}

/**
 * Calcula los KPIs de un periodo (por defecto, el mes de `ref`).
 * @param reservations filas de la tabla reservations (status != cancelled)
 * @param expenses     filas de la tabla expenses
 * @param opts.fixedMonthlyCost coste fijo mensual agregado de las propiedades
 * @param opts.unitsAvailable   nº de propiedades disponibles (para nights disponibles)
 */
export function computeKpis(reservations = [], expenses = [], opts = {}) {
  const ref = opts.ref ? new Date(opts.ref) : new Date();
  const from = startOfMonth(ref);
  const to = endOfMonth(ref);
  const monthDays = daysInMonth(ref);
  const units = opts.unitsAvailable ?? 1;
  const fixedCost = opts.fixedMonthlyCost ?? 0;

  const active = reservations.filter(r => r.status !== 'cancelled');

  let bookedNights = 0;
  let grossIncome = 0;
  let channelFees = 0;

  for (const r of active) {
    const n = nightsInRange(r, from, to);
    if (n <= 0) continue;
    bookedNights += n;
    const rNights = Math.max(r.nights || nightsInRange(r, new Date(r.check_in), new Date(r.check_out)), 1);
    const ratio = n / rNights; // prorrateo de ingreso al tramo dentro del mes
    grossIncome += (Number(r.gross_income) || 0) * ratio;
    channelFees += (Number(r.channel_fee) || 0) * ratio;
  }

  const availableNights = units * monthDays;
  const occupancy = availableNights > 0 ? bookedNights / availableNights : 0;
  const adr = bookedNights > 0 ? grossIncome / bookedNights : 0;       // Average Daily Rate
  const revpar = availableNights > 0 ? grossIncome / availableNights : 0; // Revenue per available night

  const monthExpenses = expenses
    .filter(e => { const d = new Date(e.date); return d >= from && d <= to; })
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const totalCosts = monthExpenses + channelFees + fixedCost;
  const netProfit = grossIncome - totalCosts;
  const margin = grossIncome > 0 ? netProfit / grossIncome : 0;

  // Ocupación mínima para cubrir costes fijos+variables al ADR actual
  const breakEvenOccupancy = (adr > 0 && availableNights > 0)
    ? Math.min((fixedCost + channelFees) / (adr * availableNights), 1)
    : 0;

  return {
    occupancy,            // 0..1
    adr,                  // €
    revpar,               // €
    grossIncome,          // €
    netProfit,            // €
    margin,               // 0..1
    bookedNights,
    availableNights,
    monthExpenses,        // gastos operativos del mes (sin comisión ni fijo)
    channelFees,
    fixedCost,
    breakEvenOccupancy,   // 0..1
  };
}

// Serie ingresos vs gastos por mes (últimos n meses) para la gráfica principal
export function monthlySeries(reservations = [], expenses = [], months = 6) {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = computeKpis(reservations, expenses, { ref });
    out.push({
      month: ref.toLocaleDateString('es-ES', { month: 'short' }),
      ingresos: Math.round(k.grossIncome),
      gastos: Math.round(k.monthExpenses + k.channelFees + k.fixedCost),
      beneficio: Math.round(k.netProfit),
    });
  }
  return out;
}

// Reparto de gastos por categoría (para el donut) en el mes de referencia
export function expenseBreakdown(expenses = [], ref = new Date()) {
  const from = startOfMonth(ref), to = endOfMonth(ref);
  const map = new Map();
  for (const e of expenses) {
    const d = new Date(e.date);
    if (d < from || d > to) continue;
    map.set(e.category, (map.get(e.category) || 0) + (Number(e.amount) || 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}

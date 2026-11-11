// ============================================================================
//  MOTOR FISCAL — ESPAÑA · Alquiler turístico / vacacional
//  Rendimientos del capital inmobiliario (IRPF, art. 22-23 Ley 35/2006 y
//  art. 13-14 RIRPF). Pensado para anfitriones que alquilan por temporada
//  SIN prestar servicios propios de la hostelería (si los prestan, sería
//  actividad económica y este módulo no aplica).
//
//  Tratamientos contemplados:
//   • 'corriente'    Gasto deducible íntegro en el ejercicio (suministros,
//                    limpieza, comisiones, IBI, comunidad, seguros, tasas...).
//   • 'reparacion'   Conservación y reparación. Deducible, PERO junto con los
//                    intereses de financiación NO puede superar los ingresos
//                    íntegros; el exceso se deduce en los 4 ejercicios
//                    siguientes (art. 23.1 LIRPF).
//   • 'amortizable'  Mobiliario y enseres: deducible al 10% anual (vida útil
//                    máx. tablas). La compra NO se deduce de golpe.
//   • 'no_deducible' No deducible (p. ej. mejoras —se amortizan al 3% como el
//                    inmueble— o gastos no afectos al alquiler).
//
//  Notas clave aplicadas:
//   - Los gastos solo son deducibles en proporción al tiempo que el inmueble
//     está destinado al alquiler (parámetro `dedicacion`, 0..1).
//   - El alquiler turístico NO da derecho a la reducción del 60% del art. 23.2
//     (esa reducción es solo para arrendamiento de vivienda habitual).
//   - La amortización del inmueble (3% s/ mayor de valor catastral de
//     construcción o coste de adquisición, sin suelo) se introduce aparte.
// ============================================================================

export const AMORT_RATE_MUEBLES = 0.10; // 10% anual mobiliario/enseres

export const TREATMENTS = {
  corriente:    { key: 'corriente',    label: 'Deducible',        color: '#0A0A0A' },
  reparacion:   { key: 'reparacion',   label: 'Conservación/reparación', color: '#5C5C5C' },
  amortizable:  { key: 'amortizable',  label: 'Amortizable 10%/año', color: '#9B9B9B' },
  no_deducible: { key: 'no_deducible', label: 'No deducible',      color: '#BDBDBD' },
};

// Tratamiento por categoría/subcategoría. Clave "Categoria/Subcategoria",
// con respaldo a nivel de categoría "Categoria/*".
const MAP = {
  // Limpieza — gasto corriente del alquiler
  'Limpieza/*': 'corriente',

  // Comisiones de plataforma y gestión — deducibles
  'Comisiones/*': 'corriente',

  // Suministros (si los paga el anfitrión) — deducibles
  'Suministros/*': 'corriente',

  // Mantenimiento: reparación/conservación vs. compra de bienes
  'Mantenimiento/Fontanería': 'reparacion',
  'Mantenimiento/Electricidad': 'reparacion',
  'Mantenimiento/Reparaciones': 'reparacion',
  'Mantenimiento/Electrodomésticos': 'amortizable', // comprar un electrodoméstico = mueble amortizable

  // Amenities: consumibles vs. mobiliario duradero
  'Amenities/Acogida': 'corriente',       // gel, papel, café... consumibles
  'Amenities/Menaje': 'amortizable',      // vajilla, sábanas, toallas... enseres
  'Amenities/Decoración': 'amortizable',  // cuadros, lámparas, alfombras...

  // Impuestos y similares — deducibles
  'Impuestos/IBI': 'corriente',
  'Impuestos/Comunidad': 'corriente',
  'Impuestos/Tasa turística': 'corriente',
  'Impuestos/Seguro': 'corriente',

  // Otros — por defecto no deducible (requiere justificación)
  'Otros/*': 'no_deducible',
};

// Devuelve el tratamiento fiscal de un gasto.
export function treatmentFor(category, subcategory) {
  return (
    MAP[`${category}/${subcategory}`] ??
    MAP[`${category}/*`] ??
    'no_deducible'
  );
}

export function isDeductible(category, subcategory) {
  return treatmentFor(category, subcategory) !== 'no_deducible';
}

// Ingresos íntegros del ejercicio (reservas con entrada en el año, no canceladas).
function grossIncomeForYear(reservations, year) {
  return reservations
    .filter(r => r.status !== 'cancelled' && new Date(r.check_in).getFullYear() === year)
    .reduce((s, r) => s + (Number(r.gross_income) || 0), 0);
}

/**
 * Calcula el informe fiscal de un ejercicio.
 * @param reservations  reservas (para ingresos íntegros)
 * @param expenses      gastos del periodo
 * @param opts.year         ejercicio (p. ej. 2026)
 * @param opts.dedicacion   proporción de afectación al alquiler 0..1 (default 1)
 * @param opts.interesesFinanciacion  intereses de hipoteca/préstamo del año (default 0)
 * @param opts.amortizacionInmueble   amortización 3% del inmueble (default 0)
 */
export function computeFiscalReport(reservations = [], expenses = [], opts = {}) {
  const year = opts.year ?? new Date().getFullYear();
  const dedicacion = Math.min(Math.max(opts.dedicacion ?? 1, 0), 1);
  const intereses = Number(opts.interesesFinanciacion) || 0;
  const amortInmueble = Number(opts.amortizacionInmueble) || 0;

  const ingresosIntegros = grossIncomeForYear(reservations, year);

  const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === year);

  // Agrupar por tratamiento (importe BRUTO antes de prorratear)
  const bruto = { corriente: 0, reparacion: 0, amortizable: 0, no_deducible: 0 };
  const byCategory = {}; // para desglose en UI
  for (const e of yearExpenses) {
    const t = treatmentFor(e.category, e.subcategory);
    const amount = Number(e.amount) || 0;
    bruto[t] += amount;
    byCategory[e.category] = (byCategory[e.category] || 0) + amount;
  }

  // Aplicar % de dedicación al alquiler
  const corriente = bruto.corriente * dedicacion;
  const reparacionBruta = bruto.reparacion * dedicacion;
  // Amortización mobiliario: 10% anual sobre el valor de los enseres adquiridos
  const amortMuebles = bruto.amortizable * dedicacion * AMORT_RATE_MUEBLES;
  const amortizacion = amortMuebles + amortInmueble * dedicacion;

  // Límite art. 23.1: (intereses + reparación) ≤ ingresos íntegros.
  // El exceso es deducible en los 4 ejercicios siguientes. Los intereses
  // consumen primero el límite; la reparación, lo que quede.
  const interesesAfectos = intereses * dedicacion;
  const interesesDeducible = Math.min(interesesAfectos, ingresosIntegros);
  const reparacionDeducible = Math.min(reparacionBruta, Math.max(ingresosIntegros - interesesDeducible, 0));
  const grupoDeducibleAhora = interesesDeducible + reparacionDeducible;
  const excesoACuatroAnios = (interesesAfectos + reparacionBruta) - grupoDeducibleAhora;

  const totalDeducible = corriente + amortizacion + grupoDeducibleAhora;
  const rendimientoNeto = ingresosIntegros - totalDeducible;

  // Avisos para el usuario
  const notas = [];
  if (excesoACuatroAnios > 0) {
    notas.push(`Los intereses y gastos de reparación superan los ingresos: ${fmt(excesoACuatroAnios)} se deducirán en los 4 ejercicios siguientes (no este año).`);
  }
  if (bruto.amortizable > 0) {
    notas.push(`Mobiliario/enseres: solo se deduce el 10% anual. Este año entran ${fmt(amortMuebles)} de los ${fmt(bruto.amortizable * dedicacion)} comprados; el resto se amortiza en años siguientes.`);
  }
  if (bruto.no_deducible > 0) {
    notas.push(`${fmt(bruto.no_deducible)} en gastos NO deducibles (categoría "Otros" o mejoras) no reducen el rendimiento.`);
  }
  notas.push('El alquiler turístico no da derecho a la reducción del 60% (reservada al arrendamiento de vivienda habitual).');
  if (dedicacion < 1) {
    notas.push(`Gastos prorrateados al ${Math.round(dedicacion * 100)}% de dedicación al alquiler.`);
  }

  return {
    year,
    dedicacion,
    ingresosIntegros,
    desglose: {
      corriente,
      reparacion: reparacionDeducible,
      intereses: interesesDeducible,
      amortizacion,
      noDeducible: bruto.no_deducible * dedicacion,
    },
    bruto,
    byCategory,
    totalDeducible,
    rendimientoNeto,
    excesoACuatroAnios,
    notas,
  };
}

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
}

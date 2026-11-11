// Reutilizado de Gastolens (finance-core)
export function startOfDay(d = new Date()) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function startOfMonth(d = new Date()) {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfMonth(d = new Date()) {
  const r = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function daysInMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount ?? 0);
}

export function formatCurrencyPrecise(amount) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount ?? 0);
}

export function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

// Tiempo relativo en español ("hace 2 h", "hace 3 días"). Para fechas lejanas
// cae a la fecha corta. Sin dato → null.
export function timeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return `el ${formatDate(iso)}`;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export function monthLabel(d = new Date()) {
  return MONTHS[new Date(d).getMonth()];
}

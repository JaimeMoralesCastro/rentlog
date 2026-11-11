import { estimateCosts } from '../finance/costEstimator.js';
import { formatCurrencyPrecise } from '../finance/dateHelpers.js';

// Costes estimados sin caja, sin iconos.
export default function CostEstimateCard({ properties = [], reservations = [], year, onEdit }) {
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31, 23, 59, 59);

  const agg = { cleaning: 0, maintenance: 0, consumables: 0, utilities: 0 };
  let stays = 0, nights = 0;
  let overridden = false;
  for (const p of properties) {
    const res = reservations.filter(r => r.property_id === p.id);
    const est = estimateCosts(p, res, { from, to });
    for (const it of est.items) agg[it.key] += it.value;
    stays += est.stays; nights += est.nights;
    if (Object.values(est.overridden).some(Boolean)) overridden = true;
  }
  const total = Object.values(agg).reduce((s, v) => s + v, 0);
  const single = properties.length === 1 ? properties[0] : null;

  const LABELS = { cleaning: 'Limpieza', maintenance: 'Conservación', consumables: 'Consumibles', utilities: 'Suministros' };

  return (
    <section>
      <header className="mb-5 flex items-start gap-3">
        <div>
          <p className="label mb-1">Predicción</p>
          <h2 className="font-display text-h2">Costes estimados {year}</h2>
        </div>
        {single && onEdit && (
          <button onClick={() => onEdit(single.id)} className="ml-auto action">
            Ajustar a mis gastos reales
          </button>
        )}
      </header>

      <p className="text-[13px] text-ink-500 mb-1 leading-relaxed">
        Según <span className="text-ink-900">precios de España</span>, uso y zona · {stays} estancias, {nights} noches
        {overridden && <span className="ml-1 text-ink-900">· ajustada por ti</span>}
      </p>
      <p className="text-[11px] text-ink-400 mb-6">Es una predicción; ajústala con «Ajustar a mis gastos reales».</p>

      <ul className="flex flex-col gap-5 mb-6">
        {Object.entries(agg).map(([key, value], i) => {
          const pct = total > 0 ? (value / total) * 100 : 0;
          return (
            <li key={key} className="flex flex-col gap-2 stagger" style={{ ['--i']: i }}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-ink-700">{LABELS[key]}</span>
                <span className="text-[14px] font-medium text-ink-900 tabular">{formatCurrencyPrecise(value)}</span>
              </div>
              <div className="h-0.5 bg-hairline relative">
                <div className="absolute left-0 top-0 h-0.5 bg-ink-900 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between pt-5 hair-top">
        <span className="label">Total estimado</span>
        <span className="font-display text-[22px] text-ink-900 tabular">{formatCurrencyPrecise(total)}</span>
      </div>
    </section>
  );
}

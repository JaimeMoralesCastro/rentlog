import { formatCurrency } from '../finance/dateHelpers.js';
import { suggestRate } from '../finance/pricing.js';

// Bloque editorial sin caja, sin iconos.
export default function SmartRateCard({ kpis, properties }) {
  const property = properties[0] ?? {};
  const { baseRate, suggested, deltaPct, reason, season } = suggestRate(property, kpis, new Date());
  const up = deltaPct > 0;

  return (
    <section>
      <header className="mb-4 flex items-center">
        <p className="text-eyebrow">Tarifa sugerida</p>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-ink-500">Premium</span>
      </header>

      <div className="flex items-baseline gap-3">
        <p className="text-[44px] font-display tracking-tighter text-ink-900 tabular leading-none">{formatCurrency(suggested)}</p>
        {deltaPct !== 0 && (
          <span className="text-[13px] font-semibold tabular text-ink-900">
            {up ? '↑' : '↓'} {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-500 tabular">
        <span>Actual <span className="text-ink-900">{formatCurrency(baseRate)}</span></span>
        <span aria-hidden className="text-ink-300">·</span>
        <span className="capitalize">{season}</span>
      </div>
      <p className="text-[13px] text-ink-700 leading-relaxed mt-3">{reason}</p>
    </section>
  );
}

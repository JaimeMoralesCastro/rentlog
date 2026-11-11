import { TrendingUp, TrendingDown } from 'lucide-react';

// Tarjeta de KPI: cifra grande + delta vs periodo anterior + subtítulo.
export default function KpiCard({ label, value, delta, deltaLabel, hint, accent = 'teal' }) {
  const positive = delta == null ? null : delta >= 0;
  const accentBg = {
    teal:  'bg-teal-50 text-teal-600',
    peach: 'bg-peach-100 text-peach-600',
    income: 'bg-[#E7F1EC] text-income',
  }[accent] ?? 'bg-teal-50 text-teal-600';

  return (
    <div className="bg-canvas-card rounded-2xl border border-ink-100 shadow-card p-4 flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <span className="text-2xl font-semibold text-ink-900 tabular leading-none">{value}</span>
      <div className="flex items-center gap-2 mt-0.5">
        {delta != null && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${positive ? 'bg-[#E7F1EC] text-income' : 'bg-[#FBEAE7] text-expense'}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {positive ? '+' : ''}{delta}{deltaLabel ?? '%'}
          </span>
        )}
        {hint && <span className="text-[11px] text-ink-500">{hint}</span>}
      </div>
    </div>
  );
}

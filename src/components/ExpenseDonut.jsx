import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '../finance/dateHelpers.js';

// Donut sin caja: pie a la izquierda, lista compacta a la derecha.
const PALETTE = ['#0A0A0A', '#3A3A3A', '#5C5C5C', '#7E7E7E', '#A0A0A0', '#C2C2C2', '#D6D6D6'];

export default function ExpenseDonut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-[13px] text-ink-500 py-6">Sin gastos registrados este mes.</p>;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={66} paddingAngle={2} stroke="none">
              {data.map((_, i) => (<Cell key={i} fill={PALETTE[i % PALETTE.length]} />))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E6E6E6', borderRadius: 0, fontSize: 12 }}
              formatter={(v) => formatCurrency(v)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-ink-500 font-medium uppercase tracking-wide">Total</span>
          <span className="text-[15px] font-semibold text-ink-900 tabular leading-none">{formatCurrency(total)}</span>
        </div>
      </div>
      <ul className="flex-1 flex flex-col gap-1.5 min-w-0">
        {data.map((d, i) => (
          <li key={i} className="flex items-center justify-between text-[12.5px] gap-3">
            <span className="flex items-center gap-2 text-ink-700 truncate">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="tabular font-medium text-ink-900 shrink-0">{formatCurrency(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

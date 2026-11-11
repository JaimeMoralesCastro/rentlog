import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { formatCurrency } from '../finance/dateHelpers.js';

// Sin contenedor, sin sombras: el chart respira en la sección.
export default function RevenueChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#EDEDEF" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8E8E96' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8E8E96' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,15,0.04)' }}
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E6E6E6', borderRadius: 0, fontSize: 12, boxShadow: 'none' }}
          formatter={(v, name) => [formatCurrency(v), name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
        <Bar dataKey="ingresos" name="Ingresos" radius={[0, 0, 0, 0]} maxBarSize={26}>
          {data.map((_, i) => <Cell key={i} fill="#0A0A0A" />)}
        </Bar>
        <Bar dataKey="gastos" name="Gastos" radius={[0, 0, 0, 0]} maxBarSize={26}>
          {data.map((_, i) => <Cell key={i} fill="#D6D6D6" />)}
        </Bar>
        <Line dataKey="beneficio" name="Beneficio" stroke="#FF4D00" strokeWidth={2.25} dot={{ r: 3, fill: '#FF4D00' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

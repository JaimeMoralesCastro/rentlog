import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell, ReferenceLine,
} from 'recharts';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import { buildForecast } from '../finance/forecast.js';
import { demandShape, marketOccupancy, MARKET_PROVENANCE } from '../finance/marketData.js';
import { formatCurrency } from '../finance/dateHelpers.js';

const MONTHS_SHORT = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function Analytics({ data, propId, embedded = false }) {
  const { properties, reservations } = data;
  const [propFilter, setPropFilter] = useState('all');
  // Embebida en Predicciones: el piso lo fija el hub (un solo piso, sin selector).
  const activeFilter = embedded ? propId : propFilter;

  const fProps = activeFilter === 'all' ? properties : properties.filter(p => p.id === activeFilter);
  const fRes = activeFilter === 'all' ? reservations : reservations.filter(r => r.property_id === activeFilter);

  const { series, insights } = useMemo(
    () => buildForecast(fProps, fRes, { monthsBack: 6, monthsAhead: 6 }),
    [fProps, fRes]
  );

  // Estacionalidad de la zona (de la primera propiedad filtrada)
  const zone = fProps[0]?.zone_type || 'Ciudad';

  // Cada punto añade la ocupación de MERCADO real (INE) de su mes para comparar
  const chartData = series.map(s => {
    const monthIdx = parseInt(s.key.slice(5, 7), 10) - 1;
    return { ...s, occPct: Math.round(s.occ * 100), mercadoPct: Math.round(marketOccupancy(zone, monthIdx) * 100) };
  });
  const firstForecast = series.find(s => s.isForecast);
  const pct = v => `${Math.round(v * 100)}%`;
  const shape = demandShape(zone);
  const maxShape = Math.max(...shape);

  return (
    <div className={embedded ? '' : 'page pb-16'}>
      {embedded ? (
        <header className="hair-top pt-16 mb-12">
          <p className="label mb-2">Datos reales del mercado</p>
          <h2 className="font-display text-[40px] leading-none tracking-tight">Previsión de ocupación e ingresos</h2>
          <p className="text-[15px] text-ink-500 mt-3">Próximos 6 meses.</p>
        </header>
      ) : (
        <PageHeader
          eyebrow="Datos reales del mercado"
          title="Predicciones"
          subtitle="Previsión de ocupación e ingresos · próximos 6 meses"
          actions={
            <Select className="w-full sm:w-52" value={propFilter} onChange={setPropFilter}
              options={[{ value: 'all', label: 'Todas las propiedades' }, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
          }
        />
      )}

      {/* Insights — banda editorial sin cajas. "Tendencia" = único acento. */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 hair-top hair-bottom py-8 mb-20" data-reveal>
        <Insight i={0} label={`Ocupación ${insights.nextMonthLabel}`} value={pct(insights.nextMonthOcc)} hint="próximo mes (previsión)" />
        <Insight i={1} label="Ingresos 90 días" value={formatCurrency(insights.next90Revenue)} hint="proyección" />
        <Insight i={2} label="Tendencia" value={`${insights.trendPct >= 0 ? '↑' : '↓'} ${Math.abs(insights.trendPct)}%`} hint="vs. meses recientes" accent />
        <Insight i={3} label="Mejor mes" value={capitalize(insights.bestMonth)} hint={`${pct(insights.bestMonthOcc)} previsto`} />
      </section>

      {/* Gráfica de previsión — sin caja */}
      <section className="mb-24" data-reveal>
        <header className="mb-3 flex items-center">
          <div>
            <p className="label mb-1">Previsión próximos 6 meses</p>
            <h3 className="font-display text-h2">Ocupación e ingresos</h3>
          </div>
          <span className="ml-auto text-[11px] font-medium text-ink-500 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-ink-900" /> real</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#D6D6D6]" /> previsión</span>
          </span>
        </header>
        <p className="text-[12px] text-ink-500 mb-6">Confianza del modelo: <span className="text-ink-900">{insights.confidence}</span></p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#EDEDEF" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8E8E96' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: '#8E8E96' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="occ" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#8E8E96' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(11,11,15,0.04)' }}
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E6E6E6', borderRadius: 0, fontSize: 12, boxShadow: 'none' }}
              formatter={(v, name) => name === 'Tu ocupación' || name === 'Mercado (INE)' ? [`${v}%`, name] : [formatCurrency(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
            {firstForecast && (
              <ReferenceLine yAxisId="rev" x={firstForecast.label} stroke="#0A0A0A" strokeDasharray="3 3"
                label={{ value: 'hoy', position: 'top', fontSize: 10, fill: '#8E8E96' }} />
            )}
            <Bar yAxisId="rev" dataKey="revenue" name="Ingresos" radius={[0, 0, 0, 0]} maxBarSize={26}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.isForecast ? '#D6D6D6' : '#0A0A0A'} />
              ))}
            </Bar>
            <Line yAxisId="occ" dataKey="mercadoPct" name="Mercado (INE)" stroke="#B7B7BD" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line yAxisId="occ" dataKey="occPct" name="Tu ocupación" stroke="#FF4D00" strokeWidth={2.25} dot={{ r: 3, fill: '#FF4D00' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* Estacionalidad de la zona — barras monocromas, sin caja */}
      <section data-reveal>
        <p className="label mb-1">Estacionalidad · {zone}</p>
        <h3 className="font-display text-h2 mb-1">Qué meses concentran la demanda</h3>
        <p className="text-[13px] text-ink-500 mb-6">Patrón real para tu tipo de ubicación (INE).</p>
        <div className="flex items-end gap-2 h-32">
          {shape.map((v, i) => {
            const h = (v / maxShape) * 100;
            const hot = v >= 1.12; const cold = v <= 0.9;
            return (
              <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                <div className="w-full transition-all duration-300 ease-out" style={{
                  height: `${h}%`,
                  background: hot ? '#0A0A0A' : cold ? '#EDEDEF' : '#B7B7BD',
                }} />
                <span className="text-[10px] text-ink-500 font-medium">{MONTHS_SHORT[i]}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6 mt-5 text-[11px] text-ink-500">
          <span className="flex items-center gap-2"><span className="w-2 h-2 bg-ink-900" /> temporada alta</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 bg-[#EDEDEF]" /> temporada baja</span>
        </div>
      </section>

      <p className="text-[12px] text-ink-500 mt-12 leading-relaxed max-w-[70ch]">
        Predicción basada en tu histórico de reservas y en datos reales de mercado de {MARKET_PROVENANCE.source} ({MARKET_PROVENANCE.datasets.join(', ')}, {MARKET_PROVENANCE.period}). La línea «Mercado (INE)» es la ocupación media real de tu tipo de zona. Mejora a medida que acumulas más datos.
      </p>
    </div>
  );
}

function Insight({ label, value, hint, accent = false, i = 0 }) {
  return (
    <div className="stagger" style={{ ['--i']: i }}>
      <p className="label mb-3">{label}</p>
      <p className={`text-[28px] font-display tabular leading-none ${accent ? 'text-accent' : ''}`}>{value}</p>
      <p className="text-[12px] text-ink-500 mt-2">{hint}</p>
    </div>
  );
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'; }

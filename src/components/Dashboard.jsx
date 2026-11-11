import { useMemo, useState } from 'react';
import RevenueChart from './RevenueChart.jsx';
import ExpenseDonut from './ExpenseDonut.jsx';
import OccupancyCalendar from './OccupancyCalendar.jsx';
import SmartRateCard from './SmartRateCard.jsx';
import UpcomingReservations from './UpcomingReservations.jsx';
import ExpenseInput from './ExpenseInput.jsx';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import SetupChecklist from './SetupChecklist.jsx';
import ImportHistoryNotice from './ImportHistoryNotice.jsx';
import { computeKpis, monthlySeries, expenseBreakdown } from '../finance/metrics.js';
import { formatCurrency } from '../finance/dateHelpers.js';
import { useCountUp } from '../hooks/useCountUp.js';

export default function Dashboard({ data, displayName, onImportHistory, onConnect, onAddProperty, onConnectBusiness }) {
  const { properties, reservations, expenses, addExpenseFromText } = data;
  const totalIncome = reservations.reduce((s, r) => s + (Number(r.gross_income) || 0), 0);
  const needsHistory = properties.length > 0 && reservations.length > 0 && totalIncome === 0;

  const [propFilter, setPropFilter] = useState('all');
  const [inputProperty, setInputProperty] = useState(properties[0]?.id ?? null);

  const fProps = propFilter === 'all' ? properties : properties.filter(p => p.id === propFilter);
  const fRes = propFilter === 'all' ? reservations : reservations.filter(r => r.property_id === propFilter);
  const fExp = propFilter === 'all' ? expenses : expenses.filter(e => e.property_id === propFilter);
  const fixedMonthlyCost = fProps.reduce((s, p) => s + (Number(p.fixed_monthly_cost) || 0), 0);

  const kpis = useMemo(
    () => computeKpis(fRes, fExp, { unitsAvailable: Math.max(fProps.length, 1), fixedMonthlyCost }),
    [fRes, fExp, fProps.length, fixedMonthlyCost]
  );
  const series = useMemo(() => monthlySeries(fRes, fExp, 6), [fRes, fExp]);
  const breakdown = useMemo(() => expenseBreakdown(fExp), [fExp]);

  const prev = series[series.length - 2] ?? { ingresos: 0 };
  const last = series[series.length - 1] ?? { ingresos: 0 };
  const incomeDelta = prev.ingresos > 0 ? Math.round((last.ingresos - prev.ingresos) / prev.ingresos * 100) : null;

  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const netProfitAnim = useCountUp(kpis.netProfit);
  const incomeAnim    = useCountUp(kpis.grossIncome);

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Panel"
        title={`Hola, ${displayName}`}
        subtitle={hoy}
        actions={
          <Select
            className="w-[240px]"
            value={propFilter}
            onChange={setPropFilter}
            options={[{ value: 'all', label: 'Todas las propiedades' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
          />
        }
      />

      <SetupChecklist data={data} onAddProperty={onAddProperty} onConnect={onConnect} onImport={onImportHistory} onConnectBusiness={onConnectBusiness} />
      {needsHistory && <ImportHistoryNotice onImport={onImportHistory} />}

      {/* La cifra clave: único dato en rojo de la vista (DESIGN.md §1). */}
      <section className="mb-24">
        <p className="label mb-4">Beneficio neto · este mes</p>
        <p className="font-display text-hero text-accent tabular">{formatCurrency(netProfitAnim)}</p>
        {incomeDelta != null && (
          <p className="mt-5 text-[15px]">
            <span aria-hidden className="mr-1.5">{incomeDelta >= 0 ? '↑' : '↓'}</span>
            {incomeDelta >= 0 ? '+' : ''}{incomeDelta}% respecto al mes anterior
          </p>
        )}
      </section>

      {/* Banda de KPIs: filas tipográficas separadas por vacío, sin contenedores. */}
      <section className="mb-24 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10">
        {[
          { label: 'Ingresos', value: formatCurrency(incomeAnim), hint: `${kpis.bookedNights}/${kpis.availableNights} noches` },
          { label: 'Ocupación', value: `${Math.round(kpis.occupancy * 100)}%`, hint: `margen ${Math.round(kpis.margin * 100)}%` },
          { label: 'ADR', value: formatCurrency(kpis.adr), hint: `RevPAR ${formatCurrency(kpis.revpar)}` },
          { label: 'Próximo mes', value: `${Math.round(kpis.occupancy * 100 * 1.08)}%`, hint: 'previsión INE' },
        ].map((m, i) => (
          <div key={m.label} className="stagger" style={{ ['--i']: i }}>
            <p className="label mb-3">{m.label}</p>
            <p className="font-display text-[34px] leading-none tabular">{m.value}</p>
            <p className="text-[13px] mt-3">{m.hint}</p>
          </div>
        ))}
      </section>

      {/* Cuerpo: secciones sin cajas, separadas por aire (≥96px entre bloques). */}
      <div className="grid lg:grid-cols-12 gap-x-16 gap-y-24">
        <div className="lg:col-span-8 flex flex-col gap-24">
          <Section title="Ingresos vs gastos" data-reveal>
            <RevenueChart data={series} />
          </Section>
          <div className="grid sm:grid-cols-2 gap-16" data-reveal>
            <Section title="Calendario del mes">
              <OccupancyCalendar reservations={fRes} />
            </Section>
            <Section title="Reparto de gastos">
              <ExpenseDonut data={breakdown} />
            </Section>
          </div>
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-24">
          <div data-reveal>
            <SmartRateCard kpis={kpis} properties={fProps} />
          </div>
          <Section title="Apuntar gasto" data-reveal>
            <ExpenseInput onAdd={addExpenseFromText} properties={properties} propertyId={inputProperty} onPropertyChange={setInputProperty} />
          </Section>
          <Section title="Próximas operaciones" data-reveal>
            <UpcomingReservations reservations={fRes} properties={properties} />
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children, ...rest }) {
  return (
    <section {...rest}>
      {title && (
        <h2 className="font-display text-h2 hair-bottom pb-4 mb-8">{title}</h2>
      )}
      {children}
    </section>
  );
}

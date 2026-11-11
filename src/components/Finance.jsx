import { useState, useMemo } from 'react';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import ExpenseInput from './ExpenseInput.jsx';
import FiscalReport from './FiscalReport.jsx';
import CostEstimateCard from './CostEstimateCard.jsx';
import ConnectBank from './ConnectBank.jsx';
import { treatmentFor, TREATMENTS } from '../finance/fiscalSpain.js';
import { formatCurrencyPrecise, formatDate } from '../finance/dateHelpers.js';

const YEARS = (() => { const y = new Date().getFullYear(); return [y, y - 1, y - 2]; })();

export default function Finance({ data, onEditProperty }) {
  const { properties, reservations, expenses, addExpenseFromText, deleteExpense } = data;
  const [year, setYear] = useState(YEARS[0]);
  const [propFilter, setPropFilter] = useState('all');
  const [inputProperty, setInputProperty] = useState(properties[0]?.id ?? null);
  const [bankOpen, setBankOpen] = useState(false);

  const fExpenses = useMemo(() => expenses.filter(e =>
    (propFilter === 'all' || e.property_id === propFilter)
  ), [expenses, propFilter]);

  const fReservations = useMemo(() => reservations.filter(r =>
    (propFilter === 'all' || r.property_id === propFilter)
  ), [reservations, propFilter]);

  const yearExpenses = useMemo(() =>
    [...fExpenses]
      .filter(e => new Date(e.date).getFullYear() === year)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [fExpenses, year]
  );

  const exportReport = (report) => {
    const lines = [
      ['Rentlog — Informe fiscal', String(year)],
      [],
      ['Ingresos íntegros', report.ingresosIntegros.toFixed(2)],
      ['Gastos corrientes deducibles', report.desglose.corriente.toFixed(2)],
      ['Conservación y reparación', report.desglose.reparacion.toFixed(2)],
      ['Intereses de financiación', report.desglose.intereses.toFixed(2)],
      ['Amortización', report.desglose.amortizacion.toFixed(2)],
      ['Total gastos deducibles', report.totalDeducible.toFixed(2)],
      ['RENDIMIENTO NETO', report.rendimientoNeto.toFixed(2)],
      [],
      ['Detalle de gastos del ejercicio'],
      ['Fecha', 'Descripción', 'Categoría', 'Subcategoría', 'Importe', 'Tratamiento fiscal'],
      ...yearExpenses.map(e => [
        formatDate(e.date), (e.description || '').replace(/;/g, ','), e.category, e.subcategory,
        Number(e.amount).toFixed(2), TREATMENTS[treatmentFor(e.category, e.subcategory)].label,
      ]),
    ];
    const csv = lines.map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rentlog-informe-fiscal-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Cuentas claras"
        title="Finanzas"
        subtitle="Gastos e informe fiscal · IRPF capital inmobiliario"
        actions={
          <>
            <Select className="w-full sm:w-44" value={propFilter} onChange={setPropFilter}
              options={[{ value: 'all', label: 'Todas las propiedades' }, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
            <Select className="w-24 shrink-0" value={year} onChange={v => setYear(Number(v))}
              options={YEARS.map(y => ({ value: y, label: String(y) }))} />
            <button onClick={() => setBankOpen(true)} className="action shrink-0">Conectar banco</button>
          </>
        }
      />

      <div className="grid lg:grid-cols-5 gap-x-16 gap-y-16" data-reveal>
        {/* Izquierda: informe + alta de gasto */}
        <div className="lg:col-span-3 flex flex-col gap-16">
          <FiscalReport reservations={fReservations} expenses={fExpenses} year={year} onExport={exportReport} />
        </div>

        {/* Derecha: registrar gasto + costes estimados */}
        <div className="lg:col-span-2 flex flex-col gap-16">
          <ExpenseInput onAdd={addExpenseFromText} properties={properties} propertyId={inputProperty} onPropertyChange={setInputProperty} />
          <CostEstimateCard
            properties={propFilter === 'all' ? properties : properties.filter(p => p.id === propFilter)}
            reservations={fReservations}
            year={year}
            onEdit={onEditProperty}
          />
        </div>
      </div>

      {/* Histórico de gastos del ejercicio — sin caja */}
      <section className="mt-14" data-reveal>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-eyebrow">Gastos {year}</p>
          <span className="text-[12px] text-ink-500 tabular ml-auto">
            {formatCurrencyPrecise(yearExpenses.reduce((s, e) => s + Number(e.amount), 0))}
          </span>
        </div>

        {yearExpenses.length === 0 ? (
          <p className="text-[13px] text-ink-500 text-center py-10">Sin gastos registrados en {year}.</p>
        ) : (
          <ul className="flex flex-col">
            {yearExpenses.map((e, i) => {
              const t = TREATMENTS[treatmentFor(e.category, e.subcategory)];
              return (
                <li
                  key={e.id}
                  className={`group flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1 py-4 stagger ${i > 0 ? 'hair-top' : ''}`}
                  style={{ ['--i']: Math.min(i, 12) }}
                >
                  <span className="label w-24 shrink-0">{e.category}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink-900 truncate">{e.description || e.category}</p>
                    <p className="text-[12px] text-ink-500">{formatDate(e.date)} · {e.subcategory}</p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] shrink-0 ${t.key === 'no_deducible' ? 'text-ink-900' : 'text-ink-400'}`}>
                    {t.label}
                  </span>
                  <span className="text-[15px] font-medium text-ink-900 tabular w-20 text-right">{formatCurrencyPrecise(e.amount)}</span>
                  <button onClick={() => deleteExpense(e.id)} className="action text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex">
                    eliminar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {bankOpen && <ConnectBank data={data} onClose={() => setBankOpen(false)} />}
    </div>
  );
}

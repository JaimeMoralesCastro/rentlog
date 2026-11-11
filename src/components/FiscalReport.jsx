import { useState } from 'react';
import { computeFiscalReport, TREATMENTS } from '../finance/fiscalSpain.js';
import { formatCurrency, formatCurrencyPrecise } from '../finance/dateHelpers.js';

// Informe fiscal — sin caja, sin iconos. Editorial.
export default function FiscalReport({ reservations, expenses, year, onExport }) {
  const [dedicacion, setDedicacion] = useState(100);
  const [intereses, setIntereses] = useState('');
  const [amortInmueble, setAmortInmueble] = useState('');
  const [showAdj, setShowAdj] = useState(false);

  const report = computeFiscalReport(reservations, expenses, {
    year,
    dedicacion: dedicacion / 100,
    interesesFinanciacion: Number(intereses) || 0,
    amortizacionInmueble: Number(amortInmueble) || 0,
  });

  const rows = [
    { label: 'Gastos corrientes (suministros, limpieza, comisiones, IBI…)', value: report.desglose.corriente, color: TREATMENTS.corriente.color },
    { label: 'Conservación y reparación', value: report.desglose.reparacion, color: TREATMENTS.reparacion.color },
    ...(report.desglose.intereses > 0 ? [{ label: 'Intereses de financiación', value: report.desglose.intereses, color: '#3F767D' }] : []),
    { label: 'Amortización (mobiliario 10% + inmueble 3%)', value: report.desglose.amortizacion, color: TREATMENTS.amortizable.color },
  ];

  return (
    <section>
      <header className="mb-6 flex items-center gap-3">
        <div>
          <p className="label mb-1">IRPF · Capital inmobiliario</p>
          <h2 className="font-display text-h2">Informe fiscal {year}</h2>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <button onClick={() => setShowAdj(s => !s)} className={`action ${showAdj ? 'underline' : ''}`}>
            Ajustes
          </button>
          <button onClick={() => onExport(report)} className="cta" style={{ padding: '12px 24px' }}>
            Exportar
          </button>
        </div>
      </header>

      {showAdj && (
        <div className="bg-[#F7F7F7] p-4 mb-8 grid sm:grid-cols-3 gap-4 animate-fade-in">
          <Adj label="Dedicación al alquiler" suffix="%" value={dedicacion} onChange={setDedicacion} min={0} max={100}
               hint="% del año que el inmueble está destinado al alquiler." />
          <Adj label="Intereses hipoteca (año)" suffix="€" value={intereses} onChange={setIntereses}
               hint="Intereses del préstamo (no el capital)." />
          <Adj label="Amortización inmueble (año)" suffix="€" value={amortInmueble} onChange={setAmortInmueble}
               hint="3% del mayor de valor catastral de construcción o coste, sin suelo." />
        </div>
      )}

      {/* Cifras principales — banda inline. Rendimiento neto = único acento. */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <Big label="Ingresos íntegros" value={report.ingresosIntegros} />
        <Big label="Gastos deducibles" value={report.totalDeducible} />
        <Big label="Rendimiento neto" value={report.rendimientoNeto} accent strong />
      </div>

      {/* Desglose */}
      <ul className="flex flex-col mb-10">
        {rows.map((r, i) => (
          <li key={i} className={`flex items-center justify-between py-3.5 text-[14px] ${i > 0 ? 'hair-top' : ''}`}>
            <span className="text-ink-700">{r.label}</span>
            <span className="tabular font-medium text-ink-900 shrink-0">{formatCurrencyPrecise(r.value)}</span>
          </li>
        ))}
      </ul>

      {/* Notas legales */}
      <div className="flex flex-col gap-1.5">
        {report.notas.map((n, i) => (
          <p key={i} className="text-[12px] text-ink-500 leading-relaxed">— {n}</p>
        ))}
        <p className="text-[11px] text-ink-400 mt-2">Estimación orientativa según IRPF (capital inmobiliario). No sustituye el asesoramiento de un profesional.</p>
      </div>
    </section>
  );
}

function Big({ label, value, accent, strong }) {
  return (
    <div>
      <p className="label mb-2 leading-tight">{label}</p>
      <p className={`tabular leading-none font-display ${strong ? 'text-[28px] sm:text-[34px]' : 'text-[22px] sm:text-[28px]'} ${accent ? 'text-accent' : ''}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function Adj({ label, suffix, value, onChange, hint, min, max }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <div className="flex items-center gap-1 bg-white border border-hairline px-2.5 py-2 focus-within:border-ink-900">
        <input type="number" min={min} max={max} value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent text-[14px] text-ink-900 focus:outline-none tabular" placeholder="0" />
        <span className="text-[11px] text-ink-500">{suffix}</span>
      </div>
      <span className="text-[11px] text-ink-400 leading-tight">{hint}</span>
    </label>
  );
}

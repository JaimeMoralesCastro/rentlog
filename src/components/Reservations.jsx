import { useState, useMemo, useEffect } from 'react';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import ReservationForm from './ReservationForm.jsx';
import ImportReservations from './ImportReservations.jsx';
import ConnectEmail from './ConnectEmail.jsx';
import { formatCurrency, formatDate } from '../finance/dateHelpers.js';

export default function Reservations({ data, onGoToConnect, autoOpenImport, onConsumeAutoOpenImport }) {
  const { properties, reservations, saveReservation, deleteReservation, importReservations } = data;
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [propFilter, setPropFilter] = useState('all');

  // Si se llega desde el aviso "Importar mi histórico", abre el modal directamente
  useEffect(() => {
    if (autoOpenImport) { setImporting(true); onConsumeAutoOpenImport?.(); }
  }, [autoOpenImport]); // eslint-disable-line react-hooks/exhaustive-deps
  const nameOf = id => properties.find(p => p.id === id)?.name ?? 'Sin asignar';

  const filtered = useMemo(() => {
    const list = propFilter === 'all' ? reservations : reservations.filter(r => r.property_id === propFilter);
    return [...list].sort((a, b) => new Date(b.check_in) - new Date(a.check_in));
  }, [reservations, propFilter]);

  const totalIncome = filtered.filter(r => r.status !== 'cancelled').reduce((s, r) => s + (Number(r.gross_income) || 0), 0);

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Tu agenda"
        title="Reservas"
        subtitle={`${filtered.length} reservas · ${formatCurrency(totalIncome)} en ingresos`}
        actions={
          <>
            <Select className="w-full sm:w-44" value={propFilter} onChange={setPropFilter}
              options={[{ value: 'all', label: 'Todas las propiedades' }, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
            <button onClick={() => setEmailOpen(true)} className="h-9 px-3 rounded-lg bg-ink-50 hover:bg-ink-100 text-ink-900 text-[13px] font-medium">Conecta tu correo</button>
            <button onClick={() => setImporting(true)} className="h-9 px-3 rounded-lg bg-ink-50 hover:bg-ink-100 text-ink-900 text-[13px] font-medium">Importar</button>
            <button onClick={() => setEditing({})} className="h-9 px-4 rounded-lg bg-accent hover:bg-accent-ink text-ink-900 text-[13px] font-semibold">Nueva</button>
          </>
        }
      />

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-eyebrow mb-2">Vacío</p>
          <p className="text-[16px] font-semibold text-ink-900 mb-1">Sin reservas todavía</p>
          <p className="text-[13px] text-ink-500 mb-5">Impórtalas desde el CSV de Airbnb o añádelas a mano.</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => setImporting(true)} className="border border-ink-100 text-ink-900 text-[13px] font-medium rounded-lg px-4 h-9">Importar CSV</button>
            <button onClick={() => setEditing({})} className="bg-accent hover:bg-accent-ink text-ink-900 text-[13px] font-semibold rounded-lg px-4 h-9">Añadir reserva</button>
          </div>
        </div>
      ) : (
        <div data-reveal>
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.4fr_0.8fr_0.8fr_7.5rem] gap-3 px-3 py-2.5 hair-bottom text-eyebrow">
            <span>Huésped</span><span>Propiedad</span><span>Fechas</span><span className="text-right">Ingreso</span><span>Canal</span><span></span>
          </div>
          <ul className="flex flex-col">
            {filtered.map((r, i) => {
              const cancelled = r.status === 'cancelled';
              return (
                <li
                  key={r.id}
                  className={`grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1.4fr_0.8fr_0.8fr_7.5rem] gap-x-3 gap-y-1 px-3 py-3.5 items-center group stagger ${i > 0 ? 'hair-top' : ''}`}
                  style={{ ['--i']: Math.min(i, 12) }}
                >
                  <span className={`text-[13.5px] font-medium truncate ${cancelled ? 'text-ink-300 line-through' : 'text-ink-900'}`}>
                    {r.guest_name || 'Reserva'}
                  </span>
                  <span className="text-[12px] text-ink-500 truncate order-3 md:order-none">{nameOf(r.property_id)}</span>
                  <span className="text-[12px] text-ink-700 tabular order-4 md:order-none">
                    {formatDate(r.check_in)} → {formatDate(r.check_out)} <span className="text-ink-300">({r.nights}n)</span>
                  </span>
                  <span className="text-[13.5px] font-semibold text-ink-900 tabular text-right">{formatCurrency(r.gross_income)}</span>
                  <span className="order-5 md:order-none">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{r.source}</span>
                  </span>
                  <span className="flex items-center gap-3 justify-end order-6 md:order-none opacity-0 group-hover:opacity-100 transition-opacity duration-180">
                    <button onClick={() => setEditing(r)} className="sublink text-[11.5px] text-ink-700 hover:text-ink-900">Editar</button>
                    <button onClick={() => deleteReservation(r.id)} className="sublink text-[11.5px] text-ink-500 hover:text-expense">Eliminar</button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editing && (
        <ReservationForm initial={editing.id ? editing : null} properties={properties} onSave={saveReservation} onClose={() => setEditing(null)} />
      )}
      {importing && (
        <ImportReservations
          properties={properties}
          onImport={importReservations}
          onClose={() => setImporting(false)}
          onGoToConnect={(pid) => { setImporting(false); onGoToConnect?.(pid); }}
        />
      )}

      {emailOpen && <ConnectEmail data={data} onClose={() => setEmailOpen(false)} />}
    </div>
  );
}

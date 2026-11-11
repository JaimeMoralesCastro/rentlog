import { useState } from 'react';
import Select from './Select.jsx';
import { parseReservationsCsv } from '../finance/csvImport.js';
import { formatCurrency, formatDate } from '../finance/dateHelpers.js';

// Modal de importación de reservas: sube el CSV del informe de Airbnb/Booking,
// previsualiza lo detectado y confirma. Incluye recordatorio de conexión iCal.
export default function ImportReservations({ properties = [], onImport, onClose, onGoToConnect }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '');
  const [source, setSource] = useState('Airbnb');
  const [preview, setPreview] = useState(null); // { reservations, errors, fileName }
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const { reservations, errors } = parseReservationsCsv(text, { propertyId: propertyId || null, source });
    setPreview({ reservations, errors, fileName: file.name });
  };

  const confirm = async () => {
    if (!preview?.reservations.length) return;
    setBusy(true);
    // reasigna propiedad/canal actuales por si se cambiaron tras parsear
    const rows = preview.reservations.map(r => ({ ...r, property_id: propertyId || null, source }));
    const res = await onImport(rows);
    setBusy(false);
    setDone(res);
  };

  const field = 'w-full';
  const lbl = 'text-xs font-medium text-ink-700 mb-1 block';

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas-card w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[92vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-canvas-card z-10">
          <h2 className="text-base font-semibold text-ink-900">Importar reservas</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-400 hover:text-ink-900 text-[22px] leading-none w-8 h-8 -mr-1.5 flex items-center justify-center rounded-lg">×</button>
        </header>

        {done ? (
          <div className="px-5 py-10 flex flex-col items-center text-center gap-2">
            <span aria-hidden className="text-income text-[32px] leading-none">✓</span>
            <p className="text-sm font-semibold text-ink-900">{done.inserted} reservas importadas</p>
            <p className="text-xs text-ink-500">Ya aparecen en tu dashboard y en la lista de reservas.</p>
            <button onClick={onClose} className="mt-3 px-5 py-2.5 rounded-xl bg-peach-500 hover:bg-peach-600 text-white text-sm font-semibold">Listo</button>
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Asignar a propiedad</label>
                <Select className={field} value={propertyId} onChange={setPropertyId}
                  options={[{ value: '', label: 'Sin asignar' }, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
              </div>
              <div>
                <label className={lbl}>Canal</label>
                <Select className={field} value={source} onChange={setSource} options={['Airbnb', 'Booking', 'Vrbo', 'Directo']} />
              </div>
            </div>

            {/* Cómo conseguir el CSV — sección plana con hairline */}
            <div className="border-t border-ink-100 pt-4">
              <p className="text-eyebrow mb-2">Cómo descargar tu informe en Airbnb</p>
              <ol className="text-[11px] text-ink-700 leading-relaxed list-decimal pl-4 space-y-0.5">
                <li>Entra en Airbnb y pulsa <strong>Hoy</strong> → <strong>Menú</strong> → <strong>Ingresos</strong>.</li>
                <li>Elige <strong>Pagado</strong> (histórico) o <strong>Próximos</strong> y el rango de fechas.</li>
                <li>Pulsa <strong>Obtener informe</strong> → <strong>Crear informe</strong> y descarga el CSV.</li>
              </ol>
              <p className="text-[10px] text-ink-400 mt-1.5">En Booking: <strong>Reservas → Exportar</strong>.</p>
            </div>

            {/* Dropzone (input de archivo, sin icono) */}
            <label className="border-2 border-dashed border-ink-100 rounded-2xl px-4 py-8 flex flex-col items-center gap-1.5 cursor-pointer hover:border-ink-300 hover:bg-ink-50/50 transition-colors">
              <span className="text-sm font-medium text-ink-900">Sube aquí el CSV</span>
              <span className="text-[11px] text-ink-500 text-center max-w-xs">Arrástralo o haz clic. Detectamos las fechas y los importes automáticamente.</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            </label>

            {/* Preview — bloque plano con hairline */}
            {preview && (
              <div className="border-t border-ink-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-ink-900 truncate">{preview.fileName}</span>
                  <span className="ml-auto text-xs text-income font-semibold">{preview.reservations.length} reservas</span>
                </div>

                {preview.errors.length > 0 && (
                  <p className="text-[11px] text-expense mb-1.5">{preview.errors.length} fila(s) omitidas por datos no válidos.</p>
                )}

                {preview.reservations.length > 0 && (
                  <ul className="max-h-44 overflow-y-auto flex flex-col">
                    {preview.reservations.slice(0, 8).map((r, i) => (
                      <li key={i} className={`flex items-center gap-2 py-1.5 text-xs ${i > 0 ? 'hair-top' : ''}`}>
                        <span className="text-ink-900 font-medium truncate flex-1">{r.guest_name || 'Reserva'}</span>
                        <span className="text-ink-500 tabular">{formatDate(r.check_in)} → {formatDate(r.check_out)}</span>
                        <span className="text-ink-900 tabular font-medium w-16 text-right">{formatCurrency(r.gross_income)}</span>
                      </li>
                    ))}
                    {preview.reservations.length > 8 && (
                      <li className="py-1.5 text-[11px] text-ink-500 text-center">y {preview.reservations.length - 8} más…</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {/* Nota conexión automática — bloque sutil clicable, lleva a conectar el iCal */}
            <button
              type="button"
              onClick={() => onGoToConnect?.(propertyId || null)}
              className="text-left w-full rounded-xl bg-ink-50 hover:bg-ink-100 transition-colors px-3 py-2.5 flex items-start gap-2 group"
            >
              <p className="text-[11px] text-ink-700 leading-relaxed flex-1">
                <strong className="text-ink-900">¿Quieres que se importen solas?</strong> Conecta el calendario (iCal) de cada propiedad y Rentlog sincronizará las reservas sin que subas archivos.
              </p>
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-ink-900 shrink-0 mt-0.5 group-hover:gap-1.5 transition-all">
                Conectar <span aria-hidden>→</span>
              </span>
            </button>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-100 text-sm font-medium text-ink-700 hover:bg-ink-100/50">Cancelar</button>
              <button onClick={confirm} disabled={busy || !preview?.reservations.length}
                className="flex-1 py-2.5 rounded-xl bg-peach-500 hover:bg-peach-600 text-white text-sm font-semibold disabled:opacity-50">
                {busy ? 'Importando…' : `Importar ${preview?.reservations.length || ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

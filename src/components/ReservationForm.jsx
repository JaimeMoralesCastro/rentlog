import { useState } from 'react';
import { X } from 'lucide-react';
import Select from './Select.jsx';

const SOURCES = ['Airbnb', 'Booking', 'Vrbo', 'Directo'];

const EMPTY = {
  property_id: '', guest_name: '', source: 'Airbnb',
  check_in: '', check_out: '', gross_income: '', channel_fee: '', cleaning_fee: '',
};

// Alta / edición manual de una reserva.
export default function ReservationForm({ initial, properties = [], onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, property_id: properties[0]?.id ?? '', ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.check_in || !form.check_out) { setErr('Indica las fechas de entrada y salida.'); return; }
    if (new Date(form.check_out) <= new Date(form.check_in)) { setErr('La salida debe ser posterior a la entrada.'); return; }
    setErr(null); setBusy(true);
    await onSave({
      ...form,
      property_id: form.property_id || null,
      gross_income: Number(form.gross_income) || 0,
      channel_fee: Number(form.channel_fee) || 0,
      cleaning_fee: Number(form.cleaning_fee) || 0,
      status: 'confirmed',
    });
    setBusy(false);
    onClose();
  };

  const field = 'bg-canvas border border-ink-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-300 w-full';
  const lbl = 'text-xs font-medium text-ink-700 mb-1 block';

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[92vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-canvas-card">
          <h2 className="text-base font-semibold text-ink-900">{initial?.id ? 'Editar reserva' : 'Nueva reserva'}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900"><X size={18} /></button>
        </header>

        <form onSubmit={submit} className="px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Propiedad</label>
              <Select value={form.property_id} onChange={v => set('property_id', v)}
                options={[{ value: '', label: 'Sin asignar' }, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
            </div>
            <div>
              <label className={lbl}>Canal</label>
              <Select value={form.source} onChange={v => set('source', v)} options={SOURCES} />
            </div>
          </div>

          <div>
            <label className={lbl}>Huésped</label>
            <input className={field} value={form.guest_name} onChange={e => set('guest_name', e.target.value)} placeholder="Nombre del huésped" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Entrada</label>
              <input className={field} type="date" value={form.check_in} onChange={e => set('check_in', e.target.value)} required />
            </div>
            <div>
              <label className={lbl}>Salida</label>
              <input className={field} type="date" value={form.check_out} onChange={e => set('check_out', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Ingreso (€)</label>
              <input className={field} type="number" min="0" step="0.01" value={form.gross_income} onChange={e => set('gross_income', e.target.value)} placeholder="420" />
            </div>
            <div>
              <label className={lbl}>Comisión (€)</label>
              <input className={field} type="number" min="0" step="0.01" value={form.channel_fee} onChange={e => set('channel_fee', e.target.value)} placeholder="50" />
            </div>
            <div>
              <label className={lbl}>Limpieza (€)</label>
              <input className={field} type="number" min="0" step="0.01" value={form.cleaning_fee} onChange={e => set('cleaning_fee', e.target.value)} placeholder="45" />
            </div>
          </div>

          {err && <p className="text-xs text-expense bg-[#FBEAE7] rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-100 text-sm font-medium text-ink-700 hover:bg-ink-100/50">Cancelar</button>
            <button disabled={busy} className="flex-1 py-2.5 rounded-xl bg-peach-500 hover:bg-peach-600 text-white text-sm font-semibold disabled:opacity-60">
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

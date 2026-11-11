import { useState } from 'react';
import { X, Star } from 'lucide-react';
import Select from './Select.jsx';

// Alta manual de una reseña (el sentimiento se calcula al guardar).
export default function ReviewForm({ properties = [], onSave, onClose }) {
  const [form, setForm] = useState({
    property_id: properties[0]?.id ?? '', guest_name: '', rating: 5, text: '',
    review_date: new Date().toISOString().slice(0, 10),
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    setBusy(true);
    await onSave({ ...form, property_id: form.property_id || null, rating: Number(form.rating) });
    setBusy(false);
    onClose();
  };

  const field = 'bg-canvas border border-ink-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-300 w-full';
  const lbl = 'text-xs font-medium text-ink-700 mb-1 block';

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[92vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-canvas-card">
          <h2 className="text-base font-semibold text-ink-900">Nueva reseña</h2>
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
              <label className={lbl}>Huésped</label>
              <input className={field} value={form.guest_name} onChange={e => set('guest_name', e.target.value)} placeholder="Nombre" />
            </div>
          </div>

          <div>
            <label className={lbl}>Valoración</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => set('rating', n)}>
                  <Star size={24} className={n <= form.rating ? 'text-peach-500 fill-peach-300' : 'text-ink-300'} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Texto de la reseña</label>
            <textarea className={field + ' resize-none'} rows={4} value={form.text} onChange={e => set('text', e.target.value)}
              placeholder="Pega aquí la opinión del huésped. Rentlog detectará los aspectos (limpieza, ruido, ubicación…) automáticamente." />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-100 text-sm font-medium text-ink-700 hover:bg-ink-100/50">Cancelar</button>
            <button disabled={busy} className="flex-1 py-2.5 rounded-xl bg-peach-500 hover:bg-peach-600 text-white text-sm font-semibold disabled:opacity-60">
              {busy ? 'Analizando…' : 'Guardar y analizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import Select from './Select.jsx';
import IcalUrlInput from './IcalUrlInput.jsx';
import { defaultRates } from '../finance/costEstimator.js';

const PLATFORMS = ['Airbnb', 'Booking', 'Vrbo', 'Directo'];
const ZONE_TYPES = ['Playa', 'Ciudad', 'Montaña', 'Rural'];

const EMPTY = {
  name: '', city: '', address: '', bedrooms: 1, capacity: 2,
  platform: 'Airbnb', zone_type: 'Ciudad', base_rate: '', fixed_monthly_cost: '',
  ical_airbnb_url: '', ical_booking_url: '',
  est_cleaning_per_stay: '', est_maintenance_per_night: '', est_consumables_per_stay: '', est_utilities_per_night: '',
};

// Partidas de coste editables (placeholder = estimación automática por tamaño)
const COST_FIELDS = [
  { key: 'est_cleaning_per_stay',     rate: 'cleaningPerStay',     label: 'Limpieza',     unit: '€/estancia' },
  { key: 'est_maintenance_per_night', rate: 'maintenancePerNight', label: 'Conservación', unit: '€/noche' },
  { key: 'est_consumables_per_stay',  rate: 'consumablesPerStay',  label: 'Consumibles',  unit: '€/estancia' },
  { key: 'est_utilities_per_night',   rate: 'utilitiesPerNight',   label: 'Suministros',  unit: '€/noche' },
];

// Formulario de alta/edición de propiedad, con sección de conexión de canales.
export default function PropertyForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    // Overrides de coste: cadena vacía → null (usa estimación automática)
    const num = v => (v === '' || v === null || v === undefined ? null : Number(v));
    await onSave({
      ...form,
      bedrooms: Number(form.bedrooms) || 1,
      capacity: Number(form.capacity) || 2,
      base_rate: Number(form.base_rate) || 0,
      fixed_monthly_cost: Number(form.fixed_monthly_cost) || 0,
      est_cleaning_per_stay: num(form.est_cleaning_per_stay),
      est_maintenance_per_night: num(form.est_maintenance_per_night),
      est_consumables_per_stay: num(form.est_consumables_per_stay),
      est_utilities_per_night: num(form.est_utilities_per_night),
    });
    setBusy(false);
    onClose();
  };

  // Tarifas automáticas según tamaño + zona del formulario (para los placeholders)
  const estimated = defaultRates({ bedrooms: form.bedrooms, capacity: form.capacity, zone_type: form.zone_type });

  const field = 'bg-canvas border border-ink-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-300 w-full';
  const lbl = 'text-xs font-medium text-ink-700 mb-1 block';

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[92vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-canvas-card z-10">
          <h2 className="text-base font-semibold text-ink-900">{initial?.id ? 'Editar propiedad' : 'Nueva propiedad'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-400 hover:text-ink-900 text-[22px] leading-none w-8 h-8 -mr-1.5 flex items-center justify-center rounded-lg">×</button>
        </header>

        <form onSubmit={submit} className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className={lbl}>Nombre</label>
            <input className={field} required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Piso Centro" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Ciudad</label>
              <input className={field} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Madrid" />
            </div>
            <div>
              <label className={lbl}>Plataforma principal</label>
              <Select value={form.platform} onChange={v => set('platform', v)} options={PLATFORMS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tipo de zona</label>
              <Select value={form.zone_type} onChange={v => set('zone_type', v)} options={ZONE_TYPES} />
              <span className="text-[10px] text-ink-400 mt-1 block">Afina la estacionalidad del Smart Rate.</span>
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Habitaciones</label>
              <input className={field} type="number" min="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Capacidad (huéspedes)</label>
              <input className={field} type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tarifa base / noche (€)</label>
              <input className={field} type="number" min="0" step="0.01" value={form.base_rate} onChange={e => set('base_rate', e.target.value)} placeholder="95" />
            </div>
            <div>
              <label className={lbl}>Coste fijo mensual (€)</label>
              <input className={field} type="number" min="0" step="0.01" value={form.fixed_monthly_cost} onChange={e => set('fixed_monthly_cost', e.target.value)} placeholder="650" />
            </div>
          </div>

          {/* ── Estimación de costes (editable) — sección plana con hairline ── */}
          <div className="border-t border-ink-100 pt-4">
            <p className="text-eyebrow mb-1.5">Estimación de costes</p>
            <p className="text-[11px] text-ink-500 leading-relaxed mb-3">
              Según los <strong className="text-ink-700">precios medios de España</strong>, el <strong className="text-ink-700">tamaño</strong> del piso, su <strong className="text-ink-700">uso</strong> (reservas) y la <strong className="text-ink-700">zona</strong>. Déjalo vacío para usar la estimación automática o escribe tu valor real.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {COST_FIELDS.map(({ key, rate, label, unit }) => (
                <div key={key}>
                  <label className="text-[11px] text-ink-700">{label} <span className="text-ink-400">({unit})</span></label>
                  <input
                    className={field + ' mt-0.5'}
                    type="number" min="0" step="0.01"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={`auto: ${estimated[rate]}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Conexión de canales — sección plana con hairline ── */}
          <div className="border-t border-ink-100 pt-4">
            <p className="text-eyebrow mb-1.5">Conexión automática de reservas</p>
            <p className="text-[11px] text-ink-500 leading-relaxed mb-3">
              Pega el <strong className="text-ink-700">enlace iCal de tu calendario</strong> (acaba en <code className="bg-ink-50 px-1 rounded text-ink-700">.ics</code>) y Rentlog importará tus reservas solo. Cada plataforma tiene el suyo; pulsa <em>«¿Dónde lo consigo?»</em> para los pasos exactos.
            </p>
            <div className="flex flex-col gap-3">
              <IcalUrlInput platform="airbnb"  value={form.ical_airbnb_url}  onChange={v => set('ical_airbnb_url', v)} />
              <IcalUrlInput platform="booking" value={form.ical_booking_url} onChange={v => set('ical_booking_url', v)} />
            </div>
          </div>

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

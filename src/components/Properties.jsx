import { useState, useMemo, useEffect } from 'react';
import PropertyForm from './PropertyForm.jsx';
import PageHeader from './PageHeader.jsx';
import { computeKpis } from '../finance/metrics.js';
import { formatCurrency, timeAgo } from '../finance/dateHelpers.js';

export default function Properties({ data, autoEditId, onConsumeAutoEdit, onConnectBusiness }) {
  const { properties, reservations, expenses, saveProperty, deleteProperty, syncProperty } = data;
  const [editing, setEditing] = useState(null); // objeto propiedad o {} para nueva
  const [confirmDel, setConfirmDel] = useState(null);

  // Si se llega desde el banner "Conectar", abre la ficha de esa propiedad
  // (o el alta si no había ninguna) directamente en la sección de iCal.
  useEffect(() => {
    if (autoEditId === undefined || autoEditId === null) return;
    const target = properties.find(p => p.id === autoEditId);
    setEditing(target ?? {});
    onConsumeAutoEdit?.();
  }, [autoEditId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Tus propiedades"
        title="Propiedades"
        subtitle={`${properties.length} ${properties.length === 1 ? 'propiedad' : 'propiedades'} · conecta tus canales para sincronizar reservas`}
        actions={
          <>
            {onConnectBusiness && (
              <button onClick={onConnectBusiness} className="action">Conectar mi negocio</button>
            )}
            <button onClick={() => setEditing({})} className="cta">Nueva propiedad</button>
          </>
        }
      />

      {properties.length === 0 ? (
        <div className="py-16 max-w-[52ch]">
          <p className="font-display text-h2 mb-2">Aún no tienes propiedades</p>
          <p className="text-[15px] text-ink-500 mb-8">Añade tu primer piso para empezar a ver su rentabilidad.</p>
          <button onClick={() => setEditing({})} className="cta">Añadir propiedad</button>
        </div>
      ) : (
        <ul className="flex flex-col" data-reveal>
          {properties.map((p, i) => (
            <li key={p.id} className={`stagger ${i > 0 ? 'hair-top' : ''}`} style={{ ['--i']: Math.min(i, 8) }}>
              <PropertyRow
                property={p}
                reservations={reservations.filter(r => r.property_id === p.id)}
                expenses={expenses.filter(e => e.property_id === p.id)}
                onEdit={() => setEditing(p)}
                onDelete={() => setConfirmDel(p)}
                onSync={() => syncProperty(p)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PropertyForm
          initial={editing.id ? editing : null}
          onSave={saveProperty}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-40 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setConfirmDel(null)}>
          <div className="bg-white border border-ink-900 p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="font-display text-[21px] leading-tight mb-2">Eliminar «{confirmDel.name}»</p>
            <p className="text-[13px] text-ink-500 mb-8">Se borrará la propiedad. Sus reservas y gastos quedarán sin asignar.</p>
            <div className="flex items-center gap-8">
              <button onClick={() => { deleteProperty(confirmDel.id); setConfirmDel(null); }} className="bg-ink-900 text-white text-[12px] font-semibold uppercase tracking-[0.1em] px-6 py-3">Eliminar</button>
              <button onClick={() => setConfirmDel(null)} className="action">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyRow({ property, reservations, expenses, onEdit, onDelete, onSync }) {
  const k = useMemo(
    () => computeKpis(reservations, expenses, { unitsAvailable: 1, fixedMonthlyCost: Number(property.fixed_monthly_cost) || 0 }),
    [reservations, expenses, property.fixed_monthly_cost]
  );
  const connected = Boolean(property.ical_airbnb_url || property.ical_booking_url);
  const isOn = connected || property.connected_via;
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null);
    const res = await onSync();
    setSyncing(false);
    setSyncMsg(res.error
      ? { ok: false, text: res.error }
      : { ok: true, text: res.inserted > 0 ? `${res.inserted} reservas nuevas` : 'Ya estás al día' });
    setTimeout(() => setSyncMsg(null), 4000);
  };

  return (
    <article className="py-10">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-display text-[26px] leading-none">{property.name}</h3>
          <p className="text-[13px] text-ink-500 mt-2">
            {property.city && `${property.city} · `}{property.platform} · {property.bedrooms} {property.bedrooms === 1 ? 'hab.' : 'hab.'} · {property.capacity} huéspedes
          </p>
          <p className="flex items-center gap-2 text-[12px] mt-3">
            <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-ink-900' : 'bg-ink-300'}`} />
            <span className={isOn ? 'text-ink-900' : 'text-ink-400'}>
              {property.connected_via ? `Conectado vía ${property.connected_via}` : connected ? 'Canal conectado' : 'Sin conectar'}
            </span>
            {connected && (
              <span className="text-ink-400">
                · {property.last_sync_at ? `Sincronizado ${timeAgo(property.last_sync_at)}` : 'Sin sincronizar aún'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          {connected && (
            syncMsg
              ? <span className="text-[12px] text-ink-500">{syncMsg.text}</span>
              : <button onClick={handleSync} disabled={syncing} className="action disabled:opacity-60">{syncing ? 'Sincronizando…' : 'Sincronizar'}</button>
          )}
          <button onClick={onEdit} className="action">Editar</button>
          <button onClick={onDelete} className="action">Eliminar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 mt-8">
        <Figure label="Beneficio neto · mes" value={formatCurrency(k.netProfit)} />
        <Figure label="Ocupación" value={`${Math.round(k.occupancy * 100)}%`} />
        <Figure label="ADR" value={formatCurrency(k.adr)} />
        <Figure label="Tarifa" value={formatCurrency(property.base_rate)} />
      </div>
    </article>
  );
}

function Figure({ label, value }) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      <p className="font-display text-[28px] leading-none tabular">{value}</p>
    </div>
  );
}

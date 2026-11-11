// Lista limpia con hairlines, sin iconos.
export default function UpcomingReservations({ reservations = [], properties = [] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nameOf = id => properties.find(p => p.id === id)?.name ?? '—';

  const events = [];
  for (const r of reservations) {
    if (r.status === 'cancelled') continue;
    const ci = new Date(r.check_in), co = new Date(r.check_out);
    if (ci >= today) events.push({ date: ci, type: 'in', r });
    if (co >= today) {
      events.push({ date: co, type: 'out', r });
      events.push({ date: co, type: 'clean', r });
    }
  }
  events.sort((a, b) => a.date - b.date);
  const top = events.slice(0, 5);
  const labels = { in: 'Entrada', out: 'Salida', clean: 'Limpieza' };

  if (top.length === 0)
    return <p className="text-[13px] text-ink-500">Sin operaciones próximas.</p>;

  return (
    <ul className="flex flex-col">
      {top.map((e, i) => (
        <li
          key={i}
          className={`flex items-center gap-3 py-3.5 ${i > 0 ? 'hair-top' : ''}`}
        >
          <span className="label w-16 shrink-0">{labels[e.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-ink-900 truncate">{nameOf(e.r.property_id)}</p>
            <p className="text-[12px] text-ink-500 truncate">{e.r.guest_name ?? 'Reserva'} · {e.r.source}</p>
          </div>
          <span className="text-[12px] text-ink-500 tabular shrink-0">
            {e.date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
          </span>
        </li>
      ))}
    </ul>
  );
}

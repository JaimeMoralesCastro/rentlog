import { daysInMonth, startOfMonth } from '../finance/dateHelpers.js';

// Heatmap minimalista de ocupación del mes. Sin caja.
export default function OccupancyCalendar({ reservations = [], ref = new Date() }) {
  const total = daysInMonth(ref);
  const first = startOfMonth(ref);
  const offset = (first.getDay() + 6) % 7;
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = (d) => d === today.getDate() && ref.getMonth() === today.getMonth() && ref.getFullYear() === today.getFullYear();

  const occupied = new Set();
  for (const r of reservations) {
    if (r.status === 'cancelled') continue;
    const ci = new Date(r.check_in), co = new Date(r.check_out);
    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()) occupied.add(d.getDate());
    }
  }

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 gap-px text-center mb-px">
        {['L','M','X','J','V','S','D'].map(d => (
          <span key={d} className="label text-[9.5px] pb-2">{d}</span>
        ))}
      </div>
      {/* La ocupación se codifica en tinta, no en color: el rojo es un evento
          puntual (DESIGN.md §1), no un patrón repetido por cada noche. */}
      <div className="grid grid-cols-7 gap-px text-center">
        {cells.map((d, i) => {
          const occ = d != null && occupied.has(d);
          const tod = d != null && isToday(d);
          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center text-[11px] tabular
                ${d == null ? '' :
                  occ ? 'bg-ink-900 text-white' :
                  tod ? 'border border-ink-900' : 'bg-[#F2F2F2]'}`}
            >
              {d ?? ''}
            </div>
          );
        })}
      </div>
      <p className="text-[13px] mt-5 tabular">{occupied.size} de {total} noches ocupadas</p>
    </div>
  );
}

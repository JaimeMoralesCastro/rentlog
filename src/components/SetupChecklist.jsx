import { useState } from 'react';

// Onboarding inline — sin cajas, sin iconos. Sólo tipografía y hairlines.
export default function SetupChecklist({ data, onAddProperty, onConnect, onImport, onConnectBusiness }) {
  const { properties, reservations, reviews } = data;
  const [hidden, setHidden] = useState(false);

  const hasProperty  = properties.length > 0;
  const hasConnected = properties.some(p => p.ical_airbnb_url || p.ical_booking_url);
  const hasIncome    = reservations.some(r => Number(r.gross_income) > 0);
  const hasReviews   = (reviews?.length ?? 0) > 0;

  const essentialDone = hasProperty && hasConnected && hasIncome;
  if (hidden || essentialDone) return null;

  const steps = [
    { done: hasProperty,  title: 'Añade tus pisos', text: 'Cada propiedad con su zona y tamaño. Personaliza predicciones y la estimación de gastos.', action: onAddProperty, cta: 'Añadir' },
    { done: hasConnected, title: 'Conecta el calendario', text: 'Pega el enlace iCal en la ficha del piso. Trae las fechas, siempre al día.', action: onConnect, cta: 'Conectar' },
    { done: hasIncome,    title: 'Importa tu histórico', text: 'Sube el informe de Airbnb/Booking — trae tu dinero y reservas pasadas. Sin esto no verás ingresos.', action: onImport, cta: 'Importar' },
    { done: hasReviews,   title: 'Añade tus reseñas', text: 'Opcional: análisis de sentimiento por aspecto.', optional: true },
  ];
  const doneCount = steps.filter(s => s.done && !s.optional).length;
  const total = steps.filter(s => !s.optional).length;

  return (
    <section className="relative mb-14 animate-fade-in">
      <button
        onClick={() => setHidden(true)}
        className="absolute top-0 right-0 action"
      >
        Ocultar
      </button>

      <header className="mb-8">
        <p className="label mb-2">Onboarding · {doneCount}/{total}</p>
        <h2 className="font-display text-h2">Pon en marcha tu cuenta</h2>
        <p className="text-[13px] text-ink-500 mt-1.5">Para tener todos tus datos solo necesitas esto.</p>
      </header>

      <ol className="flex flex-col">
        {steps.map((s, i) => (
          <li
            key={i}
            className={`flex items-start gap-5 py-5 stagger ${i > 0 ? 'hair-top' : ''} group`}
            style={{ ['--i']: i }}
          >
            <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold tabular
              ${s.done ? 'bg-ink-900 text-white' : 'border border-ink-300 text-ink-500'}`}>
              {s.done ? <span className="leading-none">✓</span> : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] text-ink-900 flex items-center gap-2.5">
                {s.title}
                {s.optional && <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-400">opcional</span>}
                {s.done && <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-400">hecho</span>}
              </p>
              <p className="text-[13px] text-ink-500 leading-relaxed mt-1 max-w-[60ch]">{s.text}</p>
            </div>
            {!s.done && s.action && (
              <button onClick={s.action} className="shrink-0 action">{s.cta} →</button>
            )}
          </li>
        ))}
      </ol>

      {onConnectBusiness && (
        <div className="mt-6 pt-5 hair-top flex items-start gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-[16px] text-ink-900 flex items-center gap-2.5">
              O conéctalo todo de una vez
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-400">premium</span>
            </p>
            <p className="text-[13px] text-ink-500 leading-relaxed mt-1 max-w-[60ch]">
              Conecta tu cuenta y Rentlog importa propiedades, reservas, importes y comisiones. Sin iCal, sin CSV.
            </p>
          </div>
          <button onClick={onConnectBusiness} className="shrink-0 action">Conectar mi negocio →</button>
        </div>
      )}

      <footer className="mt-6 pt-5 hair-top flex flex-col gap-2.5">
        <p className="text-[13px] text-ink-500 leading-relaxed">
          <span className="text-ink-900">Tus gastos no hace falta teclearlos.</span> Rentlog los predice según los precios de España, el tamaño y el uso de cada piso. Tú los ajustas a lo que pagas de verdad.
        </p>
        <p className="text-[13px] text-ink-500 leading-relaxed">
          <span className="text-ink-900">Tus datos son solo tuyos.</span> No los compartimos ni los vendemos. Cada cuenta está aislada con seguridad por usuario.
        </p>
      </footer>
    </section>
  );
}

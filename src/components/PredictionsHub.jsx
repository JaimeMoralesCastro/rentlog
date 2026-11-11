import { useState } from 'react';
import PageHeader from './PageHeader.jsx';
import Select from './Select.jsx';
import SmartRateCalendar from './SmartRateCalendar.jsx';
import Analytics from './Analytics.jsx';

// Página "Predicciones": une la tarifa inteligente por noche (siempre visible)
// y la previsión de ocupación/ingresos, que solo aparece cuando el piso tiene
// suficientes reservas registradas para que el modelo sea fiable.
const MIN_RES_FOR_FORECAST = 4; // mínimo de reservas por piso (ajustable)

export default function PredictionsHub({ data }) {
  const { properties, reservations } = data;
  const [propId, setPropId] = useState(properties[0]?.id ?? null);
  const property = properties.find(p => p.id === propId) || null;

  const propRes = reservations.filter(r => r.property_id === propId && r.status !== 'cancelled');
  const enough = propRes.length >= MIN_RES_FOR_FORECAST;

  if (!property) {
    return (
      <div className="page pb-16">
        <PageHeader eyebrow="Ingresos" title="Predicciones" />
        <div className="py-16">
          <p className="font-display text-h2 mb-2">Añade una propiedad primero</p>
          <p className="text-[15px] text-ink-500">Aquí verás la tarifa sugerida por noche y, con suficientes reservas, la previsión de ocupación e ingresos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Ingresos"
        title="Predicciones"
        subtitle="Tarifa inteligente por noche y previsión de ocupación e ingresos, piso a piso."
        actions={
          <Select className="w-full sm:w-52" value={propId} onChange={setPropId}
            options={properties.map(p => ({ value: p.id, label: p.name }))} />
        }
      />

      <SmartRateCalendar data={data} propId={propId} embedded />

      {enough ? (
        <Analytics data={data} propId={propId} embedded />
      ) : (
        <section className="hair-top pt-16 mt-16" data-reveal>
          <p className="label mb-2">Previsión</p>
          <h2 className="font-display text-[40px] leading-none tracking-tight">Aún no hay datos suficientes</h2>
          <p className="text-[15px] text-ink-500 mt-4 max-w-[62ch]">
            Para una previsión fiable de ocupación e ingresos de <span className="text-ink-900">{property.name}</span> necesitas
            al menos {MIN_RES_FOR_FORECAST} reservas registradas en Rentlog. Llevas {propRes.length}
            {propRes.length === 1 ? ' reserva' : ' reservas'}. Importa o sincroniza tu histórico y la previsión aparecerá aquí.
          </p>
        </section>
      )}
    </div>
  );
}

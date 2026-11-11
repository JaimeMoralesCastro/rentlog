import { useState, useMemo } from 'react';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import { guidebookSlug } from '../finance/guidebook.js';
import { nightlyRate } from '../finance/pricing.js';

// C5 — Landing / web pública por piso (maqueta). Página de conversión previa a
// la reserva. El botón de reserva directa queda como STUB de Stripe (TODO): el
// Payment Link real lo configura el usuario.
export default function LandingPreview({ data }) {
  const { properties, reviews } = data;
  const [propId, setPropId] = useState(properties[0]?.id ?? null);
  const property = properties.find(p => p.id === propId) || null;

  if (!property) {
    return (
      <div className="page pb-16">
        <PageHeader eyebrow="Tu web" title="Página del piso" />
        <div className="py-16 text-center">
          <p className="text-[16px] font-semibold text-ink-900 mb-1">Añade una propiedad primero</p>
          <p className="text-[13px] text-ink-500">Cada piso tendrá su propia página pública con reserva directa (sin comisiones de plataforma).</p>
        </div>
      </div>
    );
  }

  const slug = guidebookSlug(property);
  const url = `rentlog.app/piso/${slug}`;

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Tu web"
        title="Página del piso"
        subtitle="Una web de reserva directa por piso — sin comisiones de plataforma. Así la verá tu huésped."
        actions={
          <Select className="w-full sm:w-44" value={propId} onChange={setPropId}
            options={properties.map(p => ({ value: p.id, label: p.name }))} />
        }
      />

      {/* Vista previa: no es una card, es la página del huésped delimitada por
          una regla y su URL rotulada encima. */}
      <div data-reveal>
        <p className="label hair-bottom pb-3 mb-0">{url}</p>
        <div className="hair-bottom">
          <Landing property={property} reviews={reviews.filter(r => r.property_id === property.id)} />
        </div>
      </div>

      <p className="text-[13px] mt-8 max-w-[60ch]">
        Esta es una vista previa. La página se publica en tu dominio de Rentlog al conectar tu cuenta, con
        tus fotos reales. La reserva directa con pago se activa cuando configures el cobro (Stripe).
      </p>
    </div>
  );
}

function Landing({ property, reviews }) {
  const rate = useMemo(() => nightlyRate(property, new Date(), { occupancy: 0 }), [property]);
  const top = useMemo(
    () => [...reviews].filter(r => (r.text || '').trim()).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3),
    [reviews]
  );
  const avg = reviews.length ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length) : null;
  const [booking, setBooking] = useState({ from: '', to: '', guests: 2 });
  const [stub, setStub] = useState(false);

  const facts = [
    property.bedrooms != null && { k: `${property.bedrooms}`, v: property.bedrooms === 1 ? 'habitación' : 'habitaciones' },
    property.capacity != null && { k: `${property.capacity}`, v: 'huéspedes' },
    property.zone_type && { k: property.zone_type, v: 'zona' },
  ].filter(Boolean);

  return (
    <div>
      {/* Hero de la web pública: banda negra a sangre con titular serif. */}
      <div className="bg-frame text-white flex items-end min-h-[380px] py-14">
        <div className="px-6 sm:px-10">
          {avg != null && (
            <p className="label text-white/70 mb-4">
              <span aria-hidden className="mr-1.5">★</span>{avg.toFixed(1)} · {reviews.length} reseña{reviews.length === 1 ? '' : 's'}
            </p>
          )}
          <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-tighter">{property.name}</h2>
          {property.city && <p className="text-[15px] text-white/75 mt-4">{property.city}</p>}
        </div>
      </div>

      {/* Galería: retratos 4:5, fondo neutro, sin filtro. */}
      <div className="grid grid-cols-4 gap-px bg-hairline">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="aspect-[4/5] bg-[#F2F2F2] flex items-center justify-center">
            <span className="label text-ink-300">Foto</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-16 px-6 sm:px-10 py-16">
        {/* Contenido */}
        <div className="min-w-0">
          <div className="flex gap-12 pb-8 hair-bottom">
            {facts.map((f, i) => (
              <div key={i}>
                <p className="font-display text-[28px] leading-none">{f.k}</p>
                <p className="label mt-2">{f.v}</p>
              </div>
            ))}
          </div>

          <section className="py-12 hair-bottom">
            <p className="text-[17px] leading-relaxed max-w-[62ch]">
              {property.name} te espera en {property.city || 'una ubicación privilegiada'}. Un espacio
              cuidado, cómodo y perfecto para tu escapada. Reserva directamente aquí, sin comisiones de
              intermediarios, y trata con el anfitrión de tú a tú.
            </p>
          </section>

          {top.length > 0 && (
            <section className="py-12 hair-bottom">
              <h3 className="label mb-8">Lo que dicen los huéspedes</h3>
              <div className="flex flex-col gap-10">
                {top.map((r, i) => (
                  <blockquote key={r.id || i}>
                    <p className="pull font-display text-[21px] leading-[1.45] max-w-[52ch]">{r.text}</p>
                    <footer className="label mt-4">
                      {'★'.repeat(Math.round(r.rating || 0))} · {r.guest_name || 'Huésped'}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {/* Ubicación (stub) */}
          <section className="py-12">
            <h3 className="label mb-5">Ubicación</h3>
            <div className="aspect-[16/9] bg-[#F2F2F2] flex items-center justify-center">
              <span className="label text-ink-300">Mapa · {property.city || 'ubicación'}</span>
            </div>
          </section>
        </div>

        {/* CARD 2 de 2 (DESIGN.md §4): el widget de reserva es un objeto
            acotado de verdad — la única pieza que el huésped opera. */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="border border-ink-900 p-8">
            <p className="flex items-baseline gap-2 mb-10">
              <span className="font-display text-[38px] leading-none tabular">{rate.price} €</span>
              <span className="label">/ noche</span>
            </p>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <label className="block">
                <span className="label block mb-2">Entrada</span>
                <input type="date" value={booking.from} onChange={e => setBooking(b => ({ ...b, from: e.target.value }))}
                  className="field" />
              </label>
              <label className="block">
                <span className="label block mb-2">Salida</span>
                <input type="date" value={booking.to} onChange={e => setBooking(b => ({ ...b, to: e.target.value }))}
                  className="field" />
              </label>
            </div>
            <label className="block mb-10">
              <span className="label block mb-2">Huéspedes</span>
              <Select value={String(booking.guests)} onChange={v => setBooking(b => ({ ...b, guests: Number(v) }))}
                options={Array.from({ length: property.capacity || 6 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}` }))} />
            </label>

            {/* CTA primario único de la vista. STUB Stripe — el Payment Link
                real lo configura el usuario. */}
            <button onClick={() => setStub(true)} className="cta w-full">Reservar</button>
            {stub ? (
              <p className="text-[13px] mt-5">
                Reserva directa con pago: pendiente de conectar Stripe. <span className="label">(todo)</span>
              </p>
            ) : (
              <p className="label mt-5">Sin comisiones · pago seguro</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import Select from './Select.jsx';
import PageHeader from './PageHeader.jsx';
import ReviewForm from './ReviewForm.jsx';
import ReviewImport from './ReviewImport.jsx';
import { aggregateReviews, sentimentLabel } from '../finance/reviewSentiment.js';
import { formatDate } from '../finance/dateHelpers.js';

// Monocromo: el sentimiento se lee por la palabra y el peso, no por color.
// Lo negativo (lo accionable) sube a tinta plena; el resto queda tenue.
const sentTone = (label) => (label === 'negativo' ? 'text-ink-900' : 'text-ink-400');

export default function Reviews({ data }) {
  const { properties, reviews, saveReview, deleteReview, importReviews } = data;
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [propFilter, setPropFilter] = useState('all');

  const fReviews = useMemo(
    () => (propFilter === 'all' ? reviews : reviews.filter(r => r.property_id === propFilter)),
    [reviews, propFilter]
  );
  const agg = useMemo(() => aggregateReviews(fReviews), [fReviews]);
  const nameOf = id => properties.find(p => p.id === id)?.name ?? '—';
  const globalLabel = sentimentLabel(agg.overallSentiment);

  return (
    <div className="page pb-16">
      <PageHeader
        eyebrow="Voz de tus huéspedes"
        title="Reseñas"
        subtitle={`${agg.count} reseñas · análisis de sentimiento por aspecto`}
        actions={
          <>
            <Select className="w-full sm:w-44" value={propFilter} onChange={setPropFilter}
              options={[{ value: 'all', label: 'Todas las propiedades' }, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
            <button onClick={() => setImporting(true)} className="action">Importar</button>
            <button onClick={() => setAdding(true)} className="cta">Nueva</button>
          </>
        }
      />

      {agg.count === 0 ? (
        <div className="py-16 max-w-[52ch]">
          <p className="label mb-3">Vacío</p>
          <p className="font-display text-h2 mb-2">Aún no hay reseñas</p>
          <p className="text-[15px] text-ink-500 mb-8">Pega todas tus reseñas de golpe y Rentlog las analizará por aspecto. No hace falta añadirlas una a una.</p>
          <div className="flex items-center gap-8">
            <button onClick={() => setImporting(true)} className="cta">Importar reseñas</button>
            <button onClick={() => setAdding(true)} className="action">Añadir una</button>
          </div>
        </div>
      ) : (
        <>
          {/* Banda de cifras sin cajas. "A mejorar" es el único dato en acento. */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 hair-top hair-bottom py-8 mb-20" data-reveal>
            {[
              { label: 'Valoración media', value: agg.avgRating?.toFixed(1) ?? '—', suffix: '/ 5' },
              { label: 'Sentimiento global', value: globalLabel, capitalize: true },
              { label: 'Mejor valorado', value: agg.topPositive?.aspect ?? '—' },
              { label: 'A mejorar', value: agg.topIssue?.aspect ?? 'Nada', accent: true, hint: agg.topIssue && `${agg.topIssue.negPct}% lo mencionan mal` },
            ].map((m, i) => (
              <div key={m.label} className="stagger" style={{ ['--i']: i }}>
                <p className="label mb-3">{m.label}</p>
                <p className={`text-[28px] font-display tabular leading-none ${m.capitalize ? 'capitalize' : ''} ${m.accent ? 'text-accent' : ''}`}>
                  {m.value}{m.suffix && <span className="text-[15px] text-ink-300 ml-1">{m.suffix}</span>}
                </p>
                {m.hint && <p className="text-[12px] text-ink-500 mt-2">{m.hint}</p>}
              </div>
            ))}
          </section>

          <div className="grid lg:grid-cols-5 gap-16" data-reveal>
            {/* Análisis por aspecto: barras monocromas de positividad */}
            <div className="lg:col-span-2">
              <p className="label mb-3">Análisis por aspecto</p>
              <h3 className="font-display text-h2">Qué destacan</h3>
              <p className="text-[13px] text-ink-500 mb-8 mt-1">…y qué critican tus huéspedes.</p>
              <ul className="flex flex-col gap-6">
                {agg.byAspect.map((a, i) => {
                  const norm = (a.sentiment + 1) / 2 * 100;
                  return (
                    <li key={a.aspect} className="stagger" style={{ ['--i']: i }}>
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-[14px] text-ink-900">{a.aspect}</span>
                        <span className="text-[12px] text-ink-500 tabular">{a.mentions} menciones · {sentimentLabel(a.sentiment)}</span>
                      </div>
                      <div className="h-0.5 bg-hairline relative">
                        <div className="absolute left-0 top-0 h-0.5 bg-ink-900 transition-[width] duration-700 ease-out" style={{ width: `${norm}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Lista de reseñas — sin caja, con hairlines */}
            <div className="lg:col-span-3 flex flex-col">
              {agg.analyzed.map((r, i) => {
                const label = sentimentLabel(r.analysis.sentiment);
                return (
                  <article key={r.id} className={`py-8 group stagger ${i > 0 ? 'hair-top' : ''}`} style={{ ['--i']: Math.min(i, 8) }}>
                    <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} aria-hidden className={`text-[14px] leading-none ${n <= (r.rating ?? 0) ? 'text-ink-900' : 'text-ink-200'}`}>★</span>
                        ))}
                      </span>
                      <span className="text-[14px] text-ink-900">{r.guest_name || 'Huésped'}</span>
                      <span className="text-[12px] text-ink-400">· {nameOf(r.property_id)} · {formatDate(r.review_date)}</span>
                      <span className={`ml-auto text-[10px] font-semibold uppercase tracking-[0.1em] ${sentTone(label)}`}>{label}</span>
                      <button onClick={() => deleteReview(r.id)} className="action text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity">eliminar</button>
                    </div>
                    <p className="text-[16px] leading-relaxed mb-4 max-w-[62ch]">{r.text}</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(r.analysis.aspects).map(([asp, score]) => (
                        <span key={asp} className={`text-[10px] font-semibold uppercase tracking-[0.1em] border border-hairline px-2 py-0.5 ${sentimentLabel(score) === 'negativo' ? 'border-ink-900 text-ink-900' : 'text-ink-500'}`}>
                          {asp}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}

      {adding && <ReviewForm properties={properties} onSave={saveReview} onClose={() => setAdding(false)} />}
      {importing && <ReviewImport properties={properties} onImport={importReviews} onClose={() => setImporting(false)} />}
    </div>
  );
}

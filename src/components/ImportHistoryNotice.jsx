// Aviso inline editorial — sin caja, sin iconos.
export default function ImportHistoryNotice({ onImport }) {
  return (
    <section className="mb-16 animate-fade-in pb-10 hair-bottom">
      <p className="label mb-2">Acción recomendada</p>
      <h3 className="font-display text-h2">
        Importa tu histórico para ver tus ingresos reales
      </h3>
      <p className="text-[15px] text-ink-500 leading-relaxed mt-3 max-w-[62ch]">
        El enlace de calendario solo trae las <span className="text-ink-900">fechas</span>, no el dinero. Para ver ingresos, beneficio, ADR y predicciones, sube una vez el CSV de Airbnb.
      </p>
      <p className="text-[13px] text-ink-500 mt-4 leading-snug">
        En Airbnb: <span className="text-ink-900">Hoy → Menú → Ingresos → Pagado → Obtener informe → Crear informe</span>.
      </p>
      <button onClick={onImport} className="action mt-6">Importar mi histórico →</button>
    </section>
  );
}

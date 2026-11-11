// Menú horizontal sobre negro: texto plano, sin cápsulas, sin fondos activos.
// Los tres bloques (Operación / Huésped / Ingresos) se leen por el vacío entre
// grupos, no por etiquetas ni contenedores.
const GROUPS = [
  { items: [{ id: 'dashboard', label: 'Dashboard' }] },
  { items: [
    { id: 'properties',   label: 'Propiedades' },
    { id: 'reservations', label: 'Reservas' },
    { id: 'cleaning',     label: 'Limpiezas' },
  ] },
  { items: [
    // Guía y Mensajes fusionados 2026-07-27: la pestaña "Guía" muestra la guía
    // digital y, debajo, las plantillas de mensajería (ver GuestHub.jsx).
    { id: 'guidebook', label: 'Huésped' },
    // APARCADAS 2026-07-27 (petición del usuario). El código sigue intacto;
    // para reactivarlas: descomentar estas líneas + sus rutas e imports en App.jsx.
    // { id: 'landing',   label: 'Web' },
    // { id: 'reviews',   label: 'Reseñas' },
  ] },
  { items: [
    // Tarifas + Predicciones fusionadas 2026-07-27 en la pestaña "Predicciones"
    // (ver PredictionsHub.jsx): tarifa por noche + previsión gated por nº de reservas.
    { id: 'finance',   label: 'Finanzas' },
    { id: 'analytics', label: 'Predicciones' },
  ] },
];

export default function SiteNav({ active, onChange, onLogout, demo }) {
  return (
    <header className="bg-frame text-white sticky top-0 z-30">
      <div className="page flex items-center gap-6 h-16">
        <span className="font-display text-[19px] text-white leading-none shrink-0">
          Rentlog
          {demo && <span className="label ml-2 text-white/60 align-middle">demo</span>}
        </span>

        {/* Los tres bloques se leen por el vacío entre grupos (gap mayor), no
            por etiquetas: cabe la nav entera a 1280 sin cápsulas ni cortes. */}
        <nav aria-label="Secciones" className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          <ul className="flex items-center gap-x-6">
            {GROUPS.map((group, gi) => (
              <li key={gi}>
                <ul className="flex items-center gap-x-3.5">
                  {group.items.map(({ id, label }) => (
                    <li key={id}>
                      <button
                        onClick={() => onChange(id)}
                        aria-current={active === id ? 'page' : undefined}
                        className="navlink label whitespace-nowrap py-2"
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <button onClick={onLogout} className="navlink label shrink-0 hidden sm:inline-flex">Salir</button>
      </div>
    </header>
  );
}

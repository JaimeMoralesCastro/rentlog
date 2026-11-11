// ============================================================================
//  Datos de ejemplo para MODO DEMO (sin Supabase configurado).
//  Permiten ver el dashboard con cifras realistas de 2 propiedades.
// ============================================================================
function iso(y, m, d) { return new Date(y, m - 1, d).toISOString(); }
function dateStr(y, m, d) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

const now = new Date();
const Y = now.getFullYear();
const M = now.getMonth() + 1;

// Fecha relativa a hoy (maneja el cambio de mes). Se usa para que ciertas
// reservas de ejemplo caigan siempre en el futuro próximo y las features
// operativas (p. ej. la rotación de limpieza "mismo día") sean visibles hoy.
function rel(n) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return dateStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export const DEMO_PROPERTIES = [
  { id: 'p1', name: 'Piso Centro', city: 'Madrid', bedrooms: 2, capacity: 4, platform: 'Airbnb', zone_type: 'Ciudad', fixed_monthly_cost: 650, base_rate: 95, active: true, ical_airbnb_url: 'https://www.airbnb.com/calendar/ical/demo.ics' },
  { id: 'p2', name: 'Ático Playa', city: 'Valencia', bedrooms: 1, capacity: 2, platform: 'Airbnb', zone_type: 'Playa', fixed_monthly_cost: 480, base_rate: 80, active: true },
];

export const DEMO_RESERVATIONS = [
  { id: 'r1', property_id: 'p1', guest_name: 'María G.', source: 'Airbnb', check_in: dateStr(Y, M, 2),  check_out: dateStr(Y, M, 6),  nights: 4, gross_income: 420, channel_fee: 50, cleaning_fee: 45, status: 'confirmed' },
  { id: 'r2', property_id: 'p1', guest_name: 'John D.',  source: 'Airbnb', check_in: rel(3),  check_out: rel(6),  nights: 3, gross_income: 380, channel_fee: 45, cleaning_fee: 45, status: 'confirmed' },
  { id: 'r3', property_id: 'p1', guest_name: 'Luca R.',  source: 'Booking', check_in: rel(8), check_out: rel(12), nights: 4, gross_income: 460, channel_fee: 70, cleaning_fee: 45, status: 'confirmed' },
  { id: 'r4', property_id: 'p2', guest_name: 'Sara M.',  source: 'Airbnb', check_in: dateStr(Y, M, 5),  check_out: dateStr(Y, M, 10), nights: 5, gross_income: 450, channel_fee: 54, cleaning_fee: 40, status: 'confirmed' },
  { id: 'r5', property_id: 'p2', guest_name: 'Tom W.',   source: 'Airbnb', check_in: dateStr(Y, M, 14), check_out: dateStr(Y, M, 17), nights: 3, gross_income: 255, channel_fee: 30, cleaning_fee: 40, status: 'confirmed' },
  { id: 'r6', property_id: 'p1', guest_name: 'Emma T.',  source: 'Airbnb', check_in: rel(1),  check_out: rel(3),  nights: 2, gross_income: 210, channel_fee: 25, cleaning_fee: 45, status: 'confirmed' },
];

export const DEMO_EXPENSES = [
  { id: 'e1', property_id: 'p1', amount: 120, currency: 'EUR', category: 'Limpieza',      subcategory: 'Servicio limpieza', description: 'Limpieza · Servicio limpieza', date: iso(Y, M, 6),  is_deductible: true },
  { id: 'e2', property_id: 'p1', amount: 68,  currency: 'EUR', category: 'Suministros',   subcategory: 'Electricidad',      description: 'Suministros · Electricidad', date: iso(Y, M, 8),  is_deductible: true },
  { id: 'e3', property_id: 'p1', amount: 35,  currency: 'EUR', category: 'Amenities',     subcategory: 'Acogida',           description: 'Amenities · Acogida',        date: iso(Y, M, 9),  is_deductible: true },
  { id: 'e4', property_id: 'p1', amount: 90,  currency: 'EUR', category: 'Mantenimiento', subcategory: 'Fontanería',        description: 'Mantenimiento · Fontanería', date: iso(Y, M, 15), is_deductible: true },
  { id: 'e5', property_id: 'p2', amount: 100, currency: 'EUR', category: 'Limpieza',      subcategory: 'Servicio limpieza', description: 'Limpieza · Servicio limpieza', date: iso(Y, M, 10), is_deductible: true },
  { id: 'e6', property_id: 'p2', amount: 42,  currency: 'EUR', category: 'Suministros',   subcategory: 'Internet',          description: 'Suministros · Internet',     date: iso(Y, M, 12), is_deductible: true },
];

export const DEMO_REVIEWS = [
  { id: 'rv1', property_id: 'p1', rating: 5, guest_name: 'María G.', review_date: dateStr(Y, M, 7),  text: 'Apartamento muy limpio y céntrico, perfecto para movernos a pie. El anfitrión fue muy atento. Repetiríamos sin duda.' },
  { id: 'rv2', property_id: 'p1', rating: 4, guest_name: 'John D.', review_date: dateStr(Y, M, 13), text: 'Buena ubicación y cómodo, aunque se oía bastante ruido de la calle por la noche y costó dormir.' },
  { id: 'rv3', property_id: 'p1', rating: 3, guest_name: 'Luca R.', review_date: dateStr(Y, M, 22), text: 'La zona genial pero el piso llegó algo sucio y faltaban toallas. La cama incómoda.' },
  { id: 'rv4', property_id: 'p1', rating: 5, guest_name: 'Sophie L.', review_date: dateStr(Y, M - 1 || 12, 18), text: 'Todo impecable, wifi rápido y comunicación excelente. Muy recomendable.' },
  { id: 'rv5', property_id: 'p2', rating: 5, guest_name: 'Sara M.', review_date: dateStr(Y, M, 10), text: 'Ático espectacular, muy limpio y tranquilo. Se descansa de maravilla y la playa cerquísima.' },
  { id: 'rv6', property_id: 'p2', rating: 4, guest_name: 'Tom W.', review_date: dateStr(Y, M, 17), text: 'Sitio agradable y bien equipado. El wifi iba un poco lento pero por lo demás genial.' },
  { id: 'rv7', property_id: 'p2', rating: 2, guest_name: 'Hans K.', review_date: dateStr(Y, M - 1 || 12, 9), text: 'Esperábamos más. El apartamento estaba algo viejo y había ruido constante. No dormimos bien.' },
];

// Guías del huésped de ejemplo (C3 Guidebook) para el modo demo.
export const DEMO_GUIDEBOOKS = {
  p1: {
    welcome: '¡Bienvenido/a a Piso Centro! Estamos encantados de recibirte. Aquí tienes todo lo que necesitas para que tu estancia en Madrid sea perfecta.',
    checkin_time: 'A partir de las 15:00', checkout_time: 'Antes de las 11:00',
    access: 'La caja de llaves está a la derecha del portal, número 4B. Código: te lo enviamos el día de llegada. El portal cierra a las 22:00, usa la llave grande.',
    parking: 'Parking de pago (Zona Azul) en la calle. Garaje Aparcamientos Sol a 200 m, 24 €/día.',
    wifi_network: 'PisoCentro_5G', wifi_password: 'madrid2024',
    house: 'Termostato en el recibidor (gira para ajustar). Lavadora bajo el fregadero con pastillas incluidas. La basura se baja al contenedor de la esquina; reciclaje en los cubos amarillo/azul del rellano.',
    rules: 'No se admiten fiestas ni eventos. Prohibido fumar dentro. Respeta el descanso de los vecinos a partir de las 22:00. Máximo 4 personas.',
    recommendations: [
      { name: 'Mercado de San Miguel', category: 'Restaurante', note: 'Tapas y ambiente a 5 min andando. Mejor a media tarde.' },
      { name: 'Café Central', category: 'Bar / Café', note: 'Jazz en directo por las noches, muy cerca.' },
      { name: 'Parque del Retiro', category: 'Ocio', note: 'Perfecto para pasear. Alquila una barca en el estanque.' },
    ],
    host_name: 'Jaime', host_phone: '+34 600 123 456',
    emergency: 'Emergencias 112 · Centro de salud a 400 m · Farmacia 24 h en C/ Mayor 12.',
  },
  p2: {
    welcome: '¡Bienvenido/a al Ático Playa! Desayuna con vistas al mar y disfruta de Valencia.',
    checkin_time: 'A partir de las 16:00', checkout_time: 'Antes de las 10:30',
    access: 'Portero automático 7ºA. Sube en ascensor hasta el 7. Las llaves están en la cerradura inteligente: código por WhatsApp.',
    parking: 'Plaza de garaje incluida, nº 14 en el sótano -1.',
    wifi_network: 'AticoPlaya', wifi_password: 'mediterraneo',
    house: 'Aire acondicionado con mando en el salón. La terraza tiene toldo motorizado (botón en la pared). Sombrillas y sillas de playa en el trastero de la entrada.',
    rules: 'No fiestas. No fumar en el interior (sí en la terraza). Cuidado con el viento: recoge el toldo si sales. Máximo 2 personas.',
    recommendations: [
      { name: 'Playa de la Malvarrosa', category: 'Playa / Naturaleza', note: 'A 3 min. Chiringuitos al final del paseo.' },
      { name: 'La Pepica', category: 'Restaurante', note: 'Paella valenciana frente al mar. Reserva.' },
    ],
    host_name: 'Jaime', host_phone: '+34 600 123 456',
    emergency: 'Emergencias 112 · Cruz Roja del Mar a 600 m.',
  },
};

// Reservas de meses anteriores para que la gráfica de tendencia tenga histórico
export const DEMO_HISTORY = (() => {
  const res = [];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(Y, now.getMonth() - i, 1);
    const yy = d.getFullYear(), mm = d.getMonth() + 1;
    const factor = 1 - i * 0.06;
    res.push({ id: `h${i}a`, property_id: 'p1', source: 'Airbnb', check_in: dateStr(yy, mm, 4), check_out: dateStr(yy, mm, 12), nights: 8, gross_income: Math.round(820 * factor), channel_fee: 95, status: 'completed' });
    res.push({ id: `h${i}b`, property_id: 'p2', source: 'Airbnb', check_in: dateStr(yy, mm, 7), check_out: dateStr(yy, mm, 14), nights: 7, gross_income: Math.round(610 * factor), channel_fee: 72, status: 'completed' });
  }
  return res;
})();

// ============================================================================
//  Siembra de la CUENTA DEMO de Rentlog.
//  Crea (o reutiliza) el usuario demo@rentlog.app / demo1234 y le carga
//  3 pisos en 3 sitios distintos con reservas, gastos y reseñas realistas,
//  para poder enseñar el producto "de verdad" (login real + Supabase).
//
//  Uso:  node scripts/seed-demo.mjs
//  Requisitos: .env con VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, y
//  "Confirm email" DESACTIVADO en Supabase (Authentication → Email).
//
//  Idempotente: al re-ejecutar, borra los datos previos del usuario demo
//  (las tablas cascadean) y vuelve a sembrar limpio.
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeReview } from '../src/finance/reviewSentiment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'Demo1234';

// ── Utilidades de fecha (relativas a hoy para que el dashboard esté vivo) ────
const today = new Date();
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function rel(days) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return ymd(d);
}
function relIso(days) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── Los 3 pisos (3 zonas distintas: ciudad / playa / montaña) ────────────────
const PROPERTIES = [
  {
    key: 'centro',
    name: 'Piso Centro', city: 'Madrid', address: 'Calle Mayor 12, Madrid',
    zone_type: 'Ciudad', bedrooms: 2, capacity: 4, platform: 'Airbnb',
    base_rate: 95, fixed_monthly_cost: 650, active: true,
    ical_airbnb_url: 'https://www.airbnb.com/calendar/ical/demo-centro.ics',
  },
  {
    key: 'playa',
    name: 'Ático Playa', city: 'Valencia', address: 'Paseo Marítimo 44, Valencia',
    zone_type: 'Playa', bedrooms: 1, capacity: 2, platform: 'Airbnb',
    base_rate: 85, fixed_monthly_cost: 480, active: true,
    ical_airbnb_url: 'https://www.airbnb.com/calendar/ical/demo-playa.ics',
  },
  {
    key: 'sierra',
    name: 'Casa Sierra', city: 'Granada', address: 'Camino del Purche 3, Sierra Nevada, Granada',
    zone_type: 'Montaña', bedrooms: 3, capacity: 6, platform: 'Airbnb',
    base_rate: 120, fixed_monthly_cost: 700, active: true,
    ical_airbnb_url: 'https://www.airbnb.com/calendar/ical/demo-sierra.ics',
  },
];

// Reservas por piso: mezcla de completadas (meses pasados, para la tendencia)
// y confirmadas próximas. { d: díasDesdeHoy(check_in), n: noches, ... }
const RESERVATIONS = {
  centro: [
    { guest: 'María G.',    source: 'Airbnb',  d: -58, n: 4, gross: 420, fee: 50, clean: 45, status: 'completed' },
    { guest: 'Sophie L.',   source: 'Booking', d: -30, n: 5, gross: 540, fee: 82, clean: 45, status: 'completed' },
    { guest: 'Emma T.',     source: 'Airbnb',  d: 1,   n: 2, gross: 210, fee: 25, clean: 45, status: 'confirmed' },
    { guest: 'John D.',     source: 'Airbnb',  d: 3,   n: 3, gross: 380, fee: 45, clean: 45, status: 'confirmed' },
    { guest: 'Luca R.',     source: 'Booking', d: 12,  n: 4, gross: 460, fee: 70, clean: 45, status: 'confirmed' },
  ],
  playa: [
    { guest: 'Tom W.',      source: 'Airbnb',  d: -45, n: 3, gross: 255, fee: 30, clean: 40, status: 'completed' },
    { guest: 'Sara M.',     source: 'Airbnb',  d: -20, n: 5, gross: 450, fee: 54, clean: 40, status: 'completed' },
    { guest: 'Nadia B.',    source: 'Airbnb',  d: 4,   n: 4, gross: 420, fee: 50, clean: 40, status: 'confirmed' },
    { guest: 'Marc P.',     source: 'Booking', d: 18,  n: 6, gross: 690, fee: 104, clean: 40, status: 'confirmed' },
  ],
  sierra: [
    { guest: 'Familia Ortega', source: 'Airbnb',  d: -52, n: 6, gross: 780, fee: 94, clean: 60, status: 'completed' },
    { guest: 'Hans K.',        source: 'Booking', d: -25, n: 4, gross: 520, fee: 78, clean: 60, status: 'completed' },
    { guest: 'Grupo esquí',    source: 'Airbnb',  d: 2,   n: 3, gross: 450, fee: 54, clean: 60, status: 'confirmed' },
    { guest: 'Laura V.',       source: 'Airbnb',  d: 15,  n: 5, gross: 700, fee: 84, clean: 60, status: 'confirmed' },
  ],
};

// Gastos por piso (deducibles). { a: importe, cat, sub, day: díasDesdeHoy }
const EXPENSES = {
  centro: [
    { a: 120, cat: 'Limpieza',      sub: 'Servicio limpieza', day: -54 },
    { a: 68,  cat: 'Suministros',   sub: 'Electricidad',      day: -20 },
    { a: 90,  cat: 'Mantenimiento', sub: 'Fontanería',        day: -8 },
    { a: 35,  cat: 'Amenities',     sub: 'Acogida',           day: -3 },
  ],
  playa: [
    { a: 100, cat: 'Limpieza',    sub: 'Servicio limpieza', day: -40 },
    { a: 42,  cat: 'Suministros', sub: 'Internet',          day: -15 },
    { a: 58,  cat: 'Suministros', sub: 'Agua',              day: -6 },
  ],
  sierra: [
    { a: 150, cat: 'Limpieza',      sub: 'Servicio limpieza', day: -48 },
    { a: 130, cat: 'Suministros',   sub: 'Calefacción',       day: -22 },
    { a: 210, cat: 'Mantenimiento', sub: 'Caldera',           day: -10 },
    { a: 45,  cat: 'Amenities',     sub: 'Leña',              day: -4 },
  ],
};

// Reseñas por piso (valoración variada para la analítica de sentimiento)
const REVIEWS = {
  centro: [
    { guest: 'María G.',  rating: 5, day: -55, text: 'Apartamento muy limpio y céntrico, perfecto para movernos a pie. El anfitrión fue muy atento. Repetiríamos sin duda.' },
    { guest: 'Sophie L.', rating: 4, day: -26, text: 'Buena ubicación y muy cómodo, aunque se oía algo de ruido de la calle por la noche. El wifi rápido.' },
    { guest: 'John D.',   rating: 3, day: -12, text: 'La zona genial pero el piso llegó algo sucio y faltaban toallas. La cama incómoda.' },
  ],
  playa: [
    { guest: 'Sara M.', rating: 5, day: -18, text: 'Ático espectacular, muy limpio y tranquilo. Se descansa de maravilla y la playa cerquísima.' },
    { guest: 'Tom W.',  rating: 4, day: -42, text: 'Sitio agradable y bien equipado. El wifi iba un poco lento pero por lo demás genial.' },
  ],
  sierra: [
    { guest: 'Familia Ortega', rating: 5, day: -48, text: 'Casa amplia y acogedora, perfecta para la nieve. La calefacción calienta enseguida y las vistas increíbles.' },
    { guest: 'Hans K.',        rating: 4, day: -23, text: 'Muy buena para grupos y bien situada para esquiar. Algo fría al llegar pero luego perfecta.' },
    { guest: 'Laura V.',       rating: 5, day: -2,  text: 'Impecable, tranquila y con todo lo necesario. El anfitrión muy comunicativo. Volveríamos.' },
  ],
};

// Guías del huésped por piso (C3). Se guardan en la tabla `guidebooks`.
const GUIDEBOOKS = {
  centro: {
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
  playa: {
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
  sierra: {
    welcome: '¡Bienvenido/a a Casa Sierra! Tu refugio en Sierra Nevada, perfecto tras un día de nieve o de montaña.',
    checkin_time: 'A partir de las 16:00', checkout_time: 'Antes de las 11:00',
    access: 'La casa es la última del Camino del Purche. Caja de llaves junto a la puerta de madera; el código te llega el día de llegada. En invierno lleva calzado de nieve.',
    parking: 'Plaza propia delante de la casa para 2 coches. En días de nevada, cadenas recomendadas para subir.',
    wifi_network: 'CasaSierra', wifi_password: 'nevada1500',
    house: 'Calefacción por radiadores (termostato en el salón) y chimenea de leña — la leña está en el porche cubierto. Caldera de gas para el agua caliente: no la apagues. Botas y trineos en el trastero.',
    rules: 'No fiestas. No fumar dentro. Cierra bien puertas y ventanas al salir por el frío. Máximo 6 personas. Respeta el descanso a partir de las 23:00.',
    recommendations: [
      { name: 'Estación de esquí Sierra Nevada', category: 'Ocio', note: 'A 15 min en coche. Compra el forfait online para evitar colas.' },
      { name: 'Restaurante El Purche', category: 'Restaurante', note: 'Cocina de montaña con vistas. Reserva en temporada.' },
      { name: 'Mirador del Purche', category: 'Playa / Naturaleza', note: 'Amanecer y estrellas espectaculares a 5 min andando.' },
    ],
    host_name: 'Jaime', host_phone: '+34 600 123 456',
    emergency: 'Emergencias 112 · Guardia Civil de Montaña · Centro de salud de Monachil a 20 min.',
  },
};

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env');
    process.exit(1);
  }
  const supa = createClient(url, anon, { auth: { persistSession: false } });

  // 1) Autenticarse como el usuario demo (o crearlo si no existe).
  let { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({
    email: DEMO_EMAIL, password: DEMO_PASSWORD,
  });

  if (signInErr) {
    if (/Email not confirmed/i.test(signInErr.message)) {
      console.error('\n⛔ El usuario demo existe pero está SIN CONFIRMAR.');
      console.error('   Desactiva "Confirm email" en Supabase (Authentication → Sign In / Providers → Email)');
      console.error('   y vuelve a ejecutar este script.\n');
      process.exit(2);
    }
    // No existe → registrarlo
    const { data: signUp, error: signUpErr } = await supa.auth.signUp({
      email: DEMO_EMAIL, password: DEMO_PASSWORD,
      options: { data: { display_name: 'Anfitrión Demo' } },
    });
    if (signUpErr) {
      console.error('Error al registrar el usuario demo:', signUpErr.message);
      process.exit(1);
    }
    if (!signUp.session) {
      console.error('\n⛔ Usuario demo creado pero Supabase pide CONFIRMACIÓN por email.');
      console.error('   Desactiva "Confirm email" en Supabase (Authentication → Sign In / Providers → Email)');
      console.error('   y vuelve a ejecutar este script (ya no lo re-crea, solo inicia sesión).\n');
      process.exit(2);
    }
    signIn = signUp;
  }

  const userId = signIn.user.id;
  console.log(`✔ Sesión demo iniciada (user_id=${userId})`);

  // 2) Limpiar datos previos del usuario demo (idempotencia). Al borrar las
  //    propiedades, reservas/gastos/reseñas cascadean por FK.
  await supa.from('reviews').delete().eq('user_id', userId);
  await supa.from('expenses').delete().eq('user_id', userId);
  await supa.from('reservations').delete().eq('user_id', userId);
  await supa.from('properties').delete().eq('user_id', userId);
  console.log('✔ Datos previos del demo limpiados');

  // 3) Insertar propiedades y quedarnos con sus IDs reales.
  const idByKey = {};
  for (const p of PROPERTIES) {
    const { key, ...row } = p;
    const { data, error } = await supa.from('properties')
      .insert({ ...row, user_id: userId }).select().single();
    if (error) { console.error(`Error piso ${p.name}:`, error.message); process.exit(1); }
    idByKey[key] = data.id;
    console.log(`  + Piso: ${p.name} (${p.city})`);
  }

  // 4) Reservas
  let resCount = 0;
  for (const [key, list] of Object.entries(RESERVATIONS)) {
    const rows = list.map(r => ({
      user_id: userId, property_id: idByKey[key], guest_name: r.guest,
      source: r.source, check_in: rel(r.d), check_out: rel(r.d + r.n),
      gross_income: r.gross, channel_fee: r.fee, cleaning_fee: r.clean, status: r.status,
    }));
    const { error } = await supa.from('reservations').insert(rows);
    if (error) { console.error('Error reservas:', error.message); process.exit(1); }
    resCount += rows.length;
  }
  console.log(`✔ ${resCount} reservas`);

  // 5) Gastos
  let expCount = 0;
  for (const [key, list] of Object.entries(EXPENSES)) {
    const rows = list.map(e => ({
      user_id: userId, property_id: idByKey[key], amount: e.a, currency: 'EUR',
      category: e.cat, subcategory: e.sub, description: `${e.cat} · ${e.sub}`,
      is_deductible: true, date: relIso(e.day),
    }));
    const { error } = await supa.from('expenses').insert(rows);
    if (error) { console.error('Error gastos:', error.message); process.exit(1); }
    expCount += rows.length;
  }
  console.log(`✔ ${expCount} gastos`);

  // 6) Reseñas (con sentimiento/aspectos calculados por el analizador del app)
  let rvCount = 0;
  for (const [key, list] of Object.entries(REVIEWS)) {
    const rows = list.map(rv => {
      const a = analyzeReview(rv.text, rv.rating);
      return {
        user_id: userId, property_id: idByKey[key],
        rating: rv.rating, text: rv.text, review_date: rel(rv.day),
        aspects: a.aspects, sentiment: a.sentiment,
      };
    });
    const { error } = await supa.from('reviews').insert(rows);
    if (error) { console.error('Error reseñas:', error.message); process.exit(1); }
    rvCount += rows.length;
  }
  console.log(`✔ ${rvCount} reseñas`);

  // 7) Guías del huésped (una por piso)
  let gbCount = 0;
  for (const [key, content] of Object.entries(GUIDEBOOKS)) {
    const { error } = await supa.from('guidebooks').upsert(
      { property_id: idByKey[key], user_id: userId, content, is_published: false, updated_at: new Date().toISOString() },
      { onConflict: 'property_id' },
    );
    if (error) { console.error('Error guía:', error.message); process.exit(1); }
    gbCount++;
  }
  console.log(`✔ ${gbCount} guías del huésped`);

  await supa.auth.signOut();
  console.log('\n✅ Cuenta demo lista.');
  console.log(`   Login:  ${DEMO_EMAIL}`);
  console.log(`   Clave:  ${DEMO_PASSWORD}`);
  console.log(`   3 pisos · ${resCount} reservas · ${expCount} gastos · ${rvCount} reseñas`);
}

main().catch(err => { console.error(err); process.exit(1); });

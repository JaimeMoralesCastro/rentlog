// Test del parser de correos de anfitrión. Fixtures que imitan el formato
// documentado de Airbnb/Booking (ES/EN). Sustituir por correos REALES cuando
// los tengamos para afinar. Uso: node scripts/test-email-parser.mjs
import { parseHostReservationEmail } from '../src/finance/emailParser.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
}

// ── 1. Airbnb · reserva confirmada (ES) ─────────────────────────────────────
const airbnbEs = {
  from: 'Airbnb <automated@airbnb.com>',
  subject: 'Reserva confirmada: María llega el 9 jul',
  text: `Reserva confirmada
Huésped: María González
Llegada: jueves, 9 de julio de 2026
Salida: domingo, 12 de julio de 2026
3 noches · 2 huéspedes

Detalles del pago
Tarifa por noche 100,00 € x 3 noches 300,00 €
Comisión de anfitrión de Airbnb -9,00 €
Ganancias 291,00 €

Código de confirmación: HMABCDE123
Alojamiento: Piso Centro`,
};
{
  const r = parseHostReservationEmail(airbnbEs);
  console.log('\n[1] Airbnb ES →', JSON.stringify(r));
  check('detecta Airbnb', r?.source === 'Airbnb');
  check('huésped', r?.guest_name === 'María González', r?.guest_name);
  check('check_in', r?.check_in === '2026-07-09', r?.check_in);
  check('check_out', r?.check_out === '2026-07-12', r?.check_out);
  check('noches 3', r?.nights === 3, String(r?.nights));
  check('ganancias 291', r?.gross_income === 291, String(r?.gross_income));
  check('comisión 9', r?.channel_fee === 9, String(r?.channel_fee));
  check('external_uid', r?.external_uid === 'airbnb-HMABCDE123', r?.external_uid);
  check('confirmed', r?.status === 'confirmed');
}

// ── 2. Airbnb · reservation confirmed (EN) ──────────────────────────────────
const airbnbEn = {
  from: 'Airbnb <automated@airbnb.com>',
  subject: 'Reservation confirmed - John arrives Aug 3',
  text: `Reservation confirmed
Guest: John Smith
Check-in: Monday, August 3, 2026
Check-out: Friday, August 7, 2026
4 nights

Payout details
$120.00 x 4 nights $480.00
Airbnb host service fee -$14.40
You earn $465.60

Confirmation code: HMZZ998877
Listing: Beach Loft`,
};
{
  const r = parseHostReservationEmail(airbnbEn);
  console.log('\n[2] Airbnb EN →', JSON.stringify(r));
  check('detecta Airbnb', r?.source === 'Airbnb');
  check('guest', r?.guest_name === 'John Smith', r?.guest_name);
  check('check_in', r?.check_in === '2026-08-03', r?.check_in);
  check('check_out', r?.check_out === '2026-08-07', r?.check_out);
  check('you earn 465.60', r?.gross_income === 465.6, String(r?.gross_income));
  check('fee 14.40', r?.channel_fee === 14.4, String(r?.channel_fee));
  check('code', r?.external_uid === 'airbnb-HMZZ998877', r?.external_uid);
}

// ── 3. Booking · nueva reserva (ES) ─────────────────────────────────────────
const bookingEs = {
  from: 'Booking.com <noreply@booking.com>',
  subject: 'Nueva reserva de Luca Rossi',
  text: `Tienes una nueva reserva
Huésped: Luca Rossi
Entrada: 15/08/2026
Salida: 19/08/2026
4 noches
Importe total: 520,00 €
Comisión: 78,00 €
Número de reserva: 4451237890
Alojamiento: Ático Playa`,
};
{
  const r = parseHostReservationEmail(bookingEs);
  console.log('\n[3] Booking ES →', JSON.stringify(r));
  check('detecta Booking', r?.source === 'Booking');
  check('huésped', r?.guest_name === 'Luca Rossi', r?.guest_name);
  check('check_in 15/08', r?.check_in === '2026-08-15', r?.check_in);
  check('check_out 19/08', r?.check_out === '2026-08-19', r?.check_out);
  check('total 520', r?.gross_income === 520, String(r?.gross_income));
  check('comisión 78', r?.channel_fee === 78, String(r?.channel_fee));
  check('nº reserva', r?.external_uid === 'booking-4451237890', r?.external_uid);
}

// ── 4. Airbnb · payout (ES) ─────────────────────────────────────────────────
const payoutEs = {
  from: 'Airbnb <express@airbnb.com>',
  subject: 'Se ha enviado un pago de 291,00 €',
  text: `Tu pago va en camino
Se abonarán 291,00 € en tu cuenta
Reserva de María González
Llegada 9 jul 2026 · Salida 12 jul 2026
Código de confirmación HMABCDE123`,
};
{
  const r = parseHostReservationEmail(payoutEs);
  console.log('\n[4] Airbnb payout ES →', JSON.stringify(r));
  check('es reserva', r !== null);
  check('importe 291', r?.gross_income === 291, String(r?.gross_income));
  check('code', r?.external_uid === 'airbnb-HMABCDE123', r?.external_uid);
}

// ── 5. Cancelación → status cancelled ───────────────────────────────────────
const cancelEs = {
  from: 'Airbnb <automated@airbnb.com>',
  subject: 'Reserva cancelada: María',
  text: `Reserva cancelada
Huésped: María González
Llegada: 9 de julio de 2026
Salida: 12 de julio de 2026
Código de confirmación: HMABCDE123`,
};
{
  const r = parseHostReservationEmail(cancelEs);
  console.log('\n[5] Cancelación →', JSON.stringify(r));
  check('cancelled', r?.status === 'cancelled', r?.status);
}

// ── 6. Campaña / no-reserva → null ──────────────────────────────────────────
const spam = {
  from: 'Booking.com <email.campaign@sg.booking.com>',
  subject: 'Ahorra un 15% o más en alojamientos este verano',
  text: 'Encuentra tu próximo viaje con las Ofertas Escapada.',
};
{
  const r = parseHostReservationEmail(spam);
  console.log('\n[6] Campaña →', JSON.stringify(r));
  check('ignora campaña (null)', r === null);
}

// ── 7. Airbnb · asunto real con el código dentro ────────────────────────────
const airbnbCodeSubject = {
  from: 'Airbnb <automated@airbnb.com>',
  subject: 'Reservation Confirmed - HMKKLL7788',
  text: `Reservation confirmed
Guest: Emma Turner
Check-in: Aug 3, 2026
Check-out: Aug 7, 2026
You earn €465,60`,
};
{
  const r = parseHostReservationEmail(airbnbCodeSubject);
  console.log('\n[7] Airbnb código-en-asunto →', JSON.stringify(r));
  check('code desde asunto', r?.external_uid === 'airbnb-HMKKLL7788', r?.external_uid);
  check('guest', r?.guest_name === 'Emma Turner', r?.guest_name);
  check('check_in', r?.check_in === '2026-08-03', r?.check_in);
  check('you earn', r?.gross_income === 465.6, String(r?.gross_income));
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok · ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);

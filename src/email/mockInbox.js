// ============================================================================
//  Bandeja de correo SIMULADA para el conector "Conecta tu correo" (modo mock).
//  Imita los correos que un ANFITRIÓN recibe de Airbnb / Booking: nuevas
//  reservas, un payout, una cancelación y una campaña (que debe ignorarse).
//  Cuando conectemos Gmail de verdad (OAuth read-only), una Edge Function
//  devolverá correos con esta misma forma { from, subject, text/html } y el
//  resto del flujo (parser + orquestador + UI) no cambia.
//
//  Las pistas de "Alojamiento" apuntan a los pisos de la demo ("Piso Centro",
//  "Ático Playa"). Uno apunta a "Loft Granada" (que no existe) para enseñar el
//  caso "asignar propiedad a mano".
// ============================================================================

export const MOCK_HOST_EMAILS = [
  // 1 · Airbnb · reserva confirmada (ES) → Piso Centro
  {
    from: 'Airbnb <automated@airbnb.com>',
    subject: 'Reserva confirmada: Carla llega el 12 ago',
    date: '2026-07-28',
    text: `Reserva confirmada
Huésped: Carla Ferrer
Llegada: miércoles, 12 de agosto de 2026
Salida: domingo, 16 de agosto de 2026
4 noches · 2 huéspedes

Detalles del pago
Tarifa por noche 105,00 € x 4 noches 420,00 €
Comisión de anfitrión de Airbnb -12,60 €
Ganancias 407,40 €

Código de confirmación: HMABC12345
Alojamiento: Piso Centro`,
  },

  // 2 · Airbnb · reservation confirmed (EN) → Ático Playa
  {
    from: 'Airbnb <automated@airbnb.com>',
    subject: 'Reservation confirmed - HMXY987654',
    date: '2026-07-27',
    text: `Reservation confirmed
Guest: James Wilson
Check-in: Saturday, September 5, 2026
Check-out: Wednesday, September 9, 2026
4 nights

Payout details
$95.00 x 4 nights $380.00
Airbnb host service fee -$11.40
You earn $368.60

Confirmation code: HMXY987654
Listing: Ático Playa`,
  },

  // 3 · Booking · nueva reserva (ES) → Piso Centro
  {
    from: 'Booking.com <noreply@booking.com>',
    subject: 'Nueva reserva de Marco Bianchi',
    date: '2026-07-26',
    text: `Tienes una nueva reserva
Huésped: Marco Bianchi
Entrada: 20/08/2026
Salida: 24/08/2026
4 noches
Importe total: 512,00 €
Comisión: 76,80 €
Número de reserva: 4478123900
Alojamiento: Piso Centro`,
  },

  // 4 · Airbnb · payout (ES) — MISMO código que el nº1: el orquestador los funde
  {
    from: 'Airbnb <express@airbnb.com>',
    subject: 'Se ha enviado un pago de 407,40 €',
    date: '2026-08-17',
    text: `Tu pago va en camino
Se abonarán 407,40 € en tu cuenta
Reserva de Carla Ferrer
Llegada 12 ago 2026 · Salida 16 ago 2026
Código de confirmación HMABC12345`,
  },

  // 5 · Airbnb · reserva (ES) → "Loft Granada" (no coincide con ningún piso)
  {
    from: 'Airbnb <automated@airbnb.com>',
    subject: 'Reserva confirmada: Nadia llega el 1 sep',
    date: '2026-07-25',
    text: `Reserva confirmada
Huésped: Nadia Popova
Llegada: martes, 1 de septiembre de 2026
Salida: viernes, 4 de septiembre de 2026
3 noches

Tarifa por noche 70,00 € x 3 noches 210,00 €
Comisión de anfitrión de Airbnb -6,30 €
Ganancias 203,70 €

Código de confirmación: HMLG445566
Alojamiento: Loft Granada`,
  },

  // 6 · Booking · campaña comercial → debe IGNORARSE (no es una reserva)
  {
    from: 'Booking.com <email.campaign@sg.booking.com>',
    subject: 'Ahorra un 15% o más este verano',
    date: '2026-07-24',
    text: 'Descubre ofertas de última hora para tu próxima escapada con las Ofertas Escapada.',
  },

  // 7 · Airbnb · cancelación (ES) → status cancelled
  {
    from: 'Airbnb <automated@airbnb.com>',
    subject: 'Reserva cancelada: Diego',
    date: '2026-07-23',
    text: `Reserva cancelada
Huésped: Diego Alonso
Llegada: 10 de octubre de 2026
Salida: 13 de octubre de 2026
Código de confirmación: HMCX223344
Alojamiento: Piso Centro`,
  },
];

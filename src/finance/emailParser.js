// ============================================================================
//  Parser de correos de ANFITRIÓN de Airbnb / Booking → reserva Rentlog.
//  Reconstruye la reserva (huésped, fechas, dinero) a partir del email que el
//  anfitrión recibe cuando alguien reserva su piso o cuando le llega el payout.
//  Pensado para el futuro conector "Conecta tu correo" (Gmail read-only): una
//  Edge Function busca estos correos, los pasa por aquí y hace importExpenses/
//  importReservations con dedupe por `external_uid` (código de confirmación).
//
//  Estado: construido desde el FORMATO DOCUMENTADO (ES/EN). Falta validar/afinar
//  con correos reales de anfitrión (ver scripts/test-email-parser.mjs).
//  Estrategia: extracción por ETIQUETAS (no por maquetación), tolerante a idioma
//  y a cambios de plantilla, con reporte de campos que faltan para revisión manual.
// ============================================================================

const MONTHS = {
  // Español (abreviado y completo)
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
  may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
  sep: 9, sept: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11,
  dic: 12, diciembre: 12,
  // Inglés (completos + abreviaturas que faltaban: apr, aug, dec)
  jan: 1, january: 1, february: 2, march: 3, apr: 4, april: 4, june: 6, july: 7,
  aug: 8, august: 8, september: 9, october: 10, november: 11, dec: 12, december: 12,
};

function deaccent(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Convierte HTML a texto plano razonable (por si solo tenemos htmlBody).
export function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|td|li|h[1-6]|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&euro;/gi, '€')
    .replace(/&#8364;/g, '€').replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

// ── Fechas ──────────────────────────────────────────────────────────────────
// Acepta "9 jul 2026", "9 de julio de 2026", "Jul 9, 2026", "9 July 2026",
// "2026-07-09" y "09/07/2026" (dd/mm, criterio ES). Devuelve YYYY-MM-DD | null.
export function parseDateLoose(input, { year } = {}) {
  if (!input) return null;
  const s = deaccent(String(input)).toLowerCase().trim();

  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // "9 de julio de 2026" | "9 jul 2026" | "9 julio" (año inferido)
  let m = s.match(/(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?(?:\s+de)?(?:\s+(\d{4}))?/);
  if (m && MONTHS[m[2]]) {
    const y = m[3] || year || new Date().getFullYear();
    return fmt(y, MONTHS[m[2]], m[1]);
  }
  // "jul 9, 2026" | "July 9 2026"
  m = s.match(/([a-z]+)\.?\s+(\d{1,2})(?:,)?(?:\s+(\d{4}))?/);
  if (m && MONTHS[m[1]]) {
    const y = m[3] || year || new Date().getFullYear();
    return fmt(y, MONTHS[m[1]], m[2]);
  }
  // "09/07/2026" o "09/07" → dd/mm (criterio España)
  m = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) {
    let y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : (year || new Date().getFullYear());
    return fmt(y, m[2], m[1]);
  }
  return null;
}

function fmt(y, mo, d) {
  const mm = String(Number(mo)).padStart(2, '0');
  const dd = String(Number(d)).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function nightsBetween(ci, co) {
  if (!ci || !co) return null;
  const n = Math.round((new Date(co) - new Date(ci)) / 86400000);
  return n > 0 ? n : null;
}

// ── Dinero ──────────────────────────────────────────────────────────────────
// "€1.234,56" (ES) | "$1,234.56" (EN) | "1234.56 EUR" → número. Null si no hay.
export function parseMoney(input) {
  if (input == null) return null;
  const s = String(input);
  const m = s.match(/(?:€|\$|£|eur|usd|gbp)?\s*([\d.,]+)\s*(?:€|\$|£|eur|usd|gbp)?/i);
  if (!m) return null;
  let num = m[1];
  if (num.includes('.') && num.includes(',')) {
    // el último separador es el decimal
    num = num.lastIndexOf(',') > num.lastIndexOf('.')
      ? num.replace(/\./g, '').replace(',', '.')
      : num.replace(/,/g, '');
  } else if (num.includes(',')) {
    // coma sola: decimal si hay 1-2 cifras detrás, si no miles
    num = /,\d{1,2}$/.test(num) ? num.replace(',', '.') : num.replace(/,/g, '');
  }
  const n = parseFloat(num);
  return Number.isFinite(n) ? n : null;
}

function detectCurrency(text) {
  if (/€|eur/i.test(text)) return 'EUR';
  if (/\$|usd/i.test(text)) return 'USD';
  if (/£|gbp/i.test(text)) return 'GBP';
  return 'EUR';
}

// Primer valor monetario que sigue a alguna de las etiquetas dadas.
function moneyAfterLabel(text, labels) {
  for (const label of labels) {
    const re = new RegExp(deaccent(label) + '[^\\d€$£-]{0,40}(-?\\s*[€$£]?\\s*[\\d.,]+\\s*(?:€|eur|usd|gbp)?)', 'i');
    const m = deaccent(text).match(re);
    if (m) { const v = parseMoney(m[1]); if (v != null) return Math.abs(v); }
  }
  return null;
}

// Patrón de una etiqueta simple tolerante a acentos (para casarla sobre el
// texto ORIGINAL y así conservar los acentos del valor capturado).
function ai(label) {
  const map = { a: '[aáà]', e: '[eé]', i: '[ií]', o: '[oó]', u: '[uúü]', n: '[nñ]', c: '[cç]' };
  return deaccent(label).replace(/[a-z]/gi, c => map[c.toLowerCase()] || c);
}

// Valor tras una etiqueta, acotado a la línea (no aplanar → no invade el
// siguiente campo). Sobre el texto original: conserva acentos.
function valueAfterLabel(text, labels) {
  for (const label of labels) {
    const re = new RegExp(ai(label) + '\\s*[:\\-]?\\s*([^\\n]{1,60})', 'i');
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

// Limpia un nombre: corta en dígito/·/coma y deja como mucho 4 palabras.
function cleanName(s) {
  if (!s) return '';
  const n = String(s).split(/[·|,;:\d]/)[0].trim();
  return n.split(/\s+/).slice(0, 4).join(' ').trim();
}
const wordCount = s => (s ? s.trim().split(/\s+/).length : 0);

// ── Canal y tipo ────────────────────────────────────────────────────────────
export function detectChannel({ from = '', subject = '', text = '' } = {}) {
  const hay = `${from} ${subject} ${text}`.toLowerCase();
  if (/airbnb/.test(hay)) return 'Airbnb';
  if (/booking\.com|booking/.test(hay)) return 'Booking';
  return null;
}

// ¿Es un correo de RESERVA de anfitrión (no una campaña, ni un mensaje)?
function classifyType({ subject = '', text = '' }, channel) {
  const s = deaccent(`${subject} ${text}`).toLowerCase();
  if (/cancelad|cancelled|cancellation|anulad/.test(s)) return 'cancelled';
  if (channel === 'Airbnb') {
    if (/reserva confirmada|reservation confirmed|booking confirmed|has recibido una reserva|nueva reserva|se ha enviado un pago|payout|has ganado|se abonaran|se abonar/.test(s)) return 'reservation';
  }
  if (channel === 'Booking') {
    if (/nueva reserva|new reservation|new booking|reserva nueva|has recibido una reserva/.test(s)) return 'reservation';
  }
  return 'other';
}

// ── Extracción principal ────────────────────────────────────────────────────
// email: { from, subject, text (plaintext), html }
// Devuelve una reserva normalizada + `missing` (campos a revisar) o null si no
// es un correo de reserva de anfitrión.
export function parseHostReservationEmail(email = {}) {
  const text = email.text || htmlToText(email.html);
  const subject = email.subject || '';
  const src = { from: email.from || '', subject, text };

  const channel = detectChannel(src);
  if (!channel) return null;
  const type = classifyType(src, channel);
  if (type === 'other') return null;

  const flat = text.replace(/\s+/g, ' ');
  const year = (flat.match(/\b(20\d{2})\b/) || [])[1];

  // Huésped: candidatos del cuerpo (etiqueta) y del asunto; elegimos el más
  // completo (nombre y apellido gana a solo el nombre de pila del asunto).
  const candidates = [];
  const bodyName = cleanName(valueAfterLabel(text, ['huesped', 'nombre del huesped', 'guest name', 'guest', 'reserva de', 'booking from']));
  if (bodyName) candidates.push(bodyName);
  const subjM = subject.match(/reserva confirmada[:\s]+([A-Za-zÀ-ÿ'’\-\s]+?)\s+(?:llega|va a|reserva)/i)
    || subject.match(/reservation confirmed[\-\s]+([A-Za-zÀ-ÿ'’\-\s]+?)\s+arrives/i)
    || subject.match(/nueva reserva de\s+([A-Za-zÀ-ÿ'’\-\s]+)/i);
  if (subjM) candidates.push(cleanName(subjM[1]));
  const guest = candidates.filter(Boolean).sort((a, b) => wordCount(b) - wordCount(a))[0] || '';

  // Fechas: rango "9 – 12 jul 2026" o etiquetas entrada/salida
  let checkIn = null, checkOut = null;
  const range = flat.match(/(\d{1,2}\s*(?:de\s+)?[a-zA-ZÀ-ÿ]+\.?(?:\s+de\s+\d{4}|\s+\d{4})?)\s*[–\-a]{1,3}\s*(\d{1,2}\s*(?:de\s+)?[a-zA-ZÀ-ÿ]+\.?(?:\s+de\s+\d{4}|\s+\d{4})?)/);
  if (range) { checkIn = parseDateLoose(range[1], { year }); checkOut = parseDateLoose(range[2], { year }); }
  if (!checkIn) checkIn = parseDateLoose(valueAfterLabel(text, ['llegada', 'entrada', 'check-in', 'check in', 'arrival']), { year });
  if (!checkOut) checkOut = parseDateLoose(valueAfterLabel(text, ['salida', 'check-out', 'check out', 'departure']), { year });

  let nights = nightsBetween(checkIn, checkOut);
  if (!nights) {
    const nm = flat.match(/(\d{1,3})\s*(?:noches?|nights?)/i);
    if (nm) nights = Number(nm[1]);
  }

  // Dinero: ingreso del anfitrión (payout/ganancias) y comisión del canal
  const gross = moneyAfterLabel(flat, ['ganas', 'ganancias', 'you earn', 'total del anfitrion', 'total \\(', 'importe total', 'se abonaran', 'payout', 'total payout', 'total']);
  const fee = moneyAfterLabel(flat, ['comision de anfitrion', 'comision del anfitrion', 'host service fee', 'comision', 'commission', 'service fee', 'tarifa de servicio']);

  // Código de confirmación → external_uid (dedupe)
  // Código de confirmación: en el cuerpo (etiqueta) o en el propio asunto
  // (formato real de Airbnb: "Reservation Confirmed - HMXXXXXXXX").
  let code = valueAfterLabel(text, ['codigo de confirmacion', 'confirmation code', 'numero de reserva', 'reservation number', 'confirmacion', 'confirmation'])
    ?.match(/[A-Z0-9]{6,}/i)?.[0] || null;
  if (!code) {
    const sc = subject.match(/(?:reservation confirmed|reserva confirmada)\s*[-–:]\s*([A-Z0-9]{6,})\b/i);
    if (sc) code = sc[1];
  }

  const reservation = {
    source: channel,
    guest_name: guest ? guest.replace(/\s+/g, ' ').trim() : '',
    check_in: checkIn,
    check_out: checkOut,
    nights: nights || null,
    gross_income: gross ?? 0,
    channel_fee: fee ?? 0,
    currency: detectCurrency(flat),
    external_uid: code ? `${channel.toLowerCase()}-${code}` : null,
    status: type === 'cancelled' ? 'cancelled' : 'confirmed',
    listing_hint: valueAfterLabel(text, ['alojamiento', 'anuncio', 'listing', 'property', 'propiedad']) || null,
  };

  // Campos imprescindibles / a revisar
  const missing = [];
  if (!reservation.check_in) missing.push('check_in');
  if (!reservation.check_out) missing.push('check_out');
  if (gross == null) missing.push('gross_income');
  if (!reservation.guest_name) missing.push('guest_name');
  if (!reservation.external_uid) missing.push('external_uid');

  // Sin fechas no hay reserva utilizable
  if (!reservation.check_in && !reservation.check_out) return null;

  reservation.missing = missing;
  return reservation;
}

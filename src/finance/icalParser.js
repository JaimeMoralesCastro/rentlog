// ============================================================================
//  Parser de iCal (calendarios de Airbnb / Booking / Vrbo).
//  Extrae las reservas (VEVENT) → fechas. Los calendarios iCal NO incluyen
//  el importe ni, en Airbnb, el nombre del huésped (privacidad): por eso las
//  reservas sincronizadas llegan con ingreso 0 y se completan con el CSV o la
//  conexión por API. Ignora los bloqueos de disponibilidad ("Not available").
// ============================================================================

// Desdobla líneas plegadas del iCal (una línea larga partida con CRLF + espacio)
function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

// "20260710" o "20260710T140000Z" → "2026-07-10"
function icalDate(raw) {
  const m = raw.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// Lee el valor de una propiedad dentro de un bloque VEVENT (admite parámetros)
function prop(body, key) {
  const m = body.match(new RegExp(`(?:^|\\n)${key}(?:;[^:\\n]*)?:([^\\n]*)`, 'i'));
  return m ? m[1].trim() : null;
}

// Airbnb suele poner SUMMARY = "Reserved"/"Reservado" (sin nombre por privacidad)
function cleanGuest(summary) {
  if (!summary) return '';
  const s = summary.trim();
  if (/^reserved$/i.test(s) || /^reservado$/i.test(s) || /not available/i.test(s)) return '';
  // Booking a veces incluye "CLOSED - Not available" o el nombre real
  return s.replace(/^closed\s*-\s*/i, '').trim();
}

function isBlock(summary) {
  const s = (summary || '').toLowerCase();
  return s.includes('not available') || s.includes('no disponible') || s.includes('blocked') || s.includes('closed');
}

/**
 * Parsea un texto iCal a filas de reservation.
 * @returns array de { external_uid, property_id, source, guest_name, check_in, check_out, gross_income, channel_fee, status }
 */
export function parseIcal(text, { source = 'Airbnb', propertyId = null } = {}) {
  if (!text) return [];
  const t = unfold(text);
  const blocks = t.split(/BEGIN:VEVENT/i).slice(1);
  const out = [];

  for (const b of blocks) {
    const body = b.split(/END:VEVENT/i)[0];
    const dtstart = prop(body, 'DTSTART');
    const dtend = prop(body, 'DTEND');
    if (!dtstart || !dtend) continue;

    const check_in = icalDate(dtstart);
    const check_out = icalDate(dtend);
    if (!check_in || !check_out) continue;

    const summary = prop(body, 'SUMMARY') || '';
    if (isBlock(summary)) continue; // saltar bloqueos de disponibilidad

    const uid = prop(body, 'UID') || `${source}-${check_in}-${check_out}`;

    out.push({
      external_uid: uid,
      property_id: propertyId,
      source,
      guest_name: cleanGuest(summary),
      check_in,
      check_out,
      gross_income: 0,   // iCal no trae importe
      channel_fee: 0,
      status: 'confirmed',
    });
  }
  return out;
}

// ============================================================================
//  Orquestador de importación por correo. Coge una lista de correos crudos
//  ({ from, subject, text/html }), los pasa por el parser de anfitrión y
//  devuelve reservas listas para revisar e importar:
//    · ignora lo que no es una reserva (campañas, avisos)
//    · funde el correo de reserva con su payout cuando comparten código
//    · casa cada reserva con una propiedad por el nombre del alojamiento
//    · marca duplicados (código ya presente en la BBDD) y campos a revisar
//  No habla con Supabase: recibe las reservas existentes y devuelve candidatos.
//  El mismo flujo servirá cuando los correos vengan de Gmail de verdad.
// ============================================================================
import { parseHostReservationEmail } from '../finance/emailParser.js';

// Normaliza para comparar nombres de alojamiento (sin acentos ni símbolos).
function norm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Casa la pista "Alojamiento: X" con una de las propiedades del usuario.
// Exacto > uno contiene al otro > solape de palabras. null si no hay match claro.
function matchProperty(hint, properties) {
  const h = norm(hint);
  if (!h) return null;
  let best = null, bestScore = 0;
  for (const p of properties) {
    const n = norm(p.name);
    if (!n) continue;
    let score = 0;
    if (n === h) score = 100;
    else if (h.includes(n) || n.includes(h)) score = 70;
    else {
      const ht = new Set(h.split(' '));
      const overlap = n.split(' ').filter(t => t.length > 2 && ht.has(t)).length;
      score = overlap * 30;
    }
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return bestScore >= 45 ? best : null;
}

// Funde dos reservas con el mismo código (típico: reserva + su payout).
function mergeReservations(a, b) {
  const out = { ...a };
  for (const k of ['guest_name', 'check_in', 'check_out', 'nights', 'currency', 'listing_hint']) {
    if (!out[k] && b[k]) out[k] = b[k];
  }
  out.gross_income = Math.max(Number(a.gross_income) || 0, Number(b.gross_income) || 0);
  out.channel_fee = Math.max(Number(a.channel_fee) || 0, Number(b.channel_fee) || 0);
  if (a.status === 'cancelled' || b.status === 'cancelled') out.status = 'cancelled';
  // los campos que faltan son los que faltan en AMBOS
  const ma = new Set(a.missing || []), mb = new Set(b.missing || []);
  out.missing = [...ma].filter(x => mb.has(x));
  return out;
}

// emails: [{ from, subject, text, html }]
// ctx: { properties, existingReservations }
// → { candidates, stats }
export function scanInbox(emails = [], { properties = [], existingReservations = [] } = {}) {
  const existingUids = new Set(existingReservations.map(r => r.external_uid).filter(Boolean));

  // 1 · parsear e ignorar lo que no es reserva
  let ignored = 0;
  const parsed = [];
  for (const email of emails) {
    const r = parseHostReservationEmail(email);
    if (!r) { ignored++; continue; }
    parsed.push(r);
  }

  // 2 · agrupar por código (funde reserva + payout); los sin código van sueltos
  const byUid = new Map();
  const noUid = [];
  for (const r of parsed) {
    if (r.external_uid) {
      byUid.set(r.external_uid, byUid.has(r.external_uid) ? mergeReservations(byUid.get(r.external_uid), r) : r);
    } else {
      noUid.push(r);
    }
  }
  const merged = [...byUid.values(), ...noUid];

  // 3 · casar propiedad, marcar duplicados y preparar para revisión
  const candidates = merged.map(r => {
    const property = matchProperty(r.listing_hint, properties);
    const dup = r.external_uid ? existingUids.has(r.external_uid) : false;
    const importable = Boolean(r.check_in && r.check_out);
    // "revisar" = faltan datos relevantes (el código no bloquea la importación)
    const review = (r.missing || []).filter(m => m !== 'external_uid');
    return {
      ...r,
      _property_id: property?.id ?? null,
      _matchedName: property?.name ?? null,
      _dup: dup,
      _importable: importable,
      _review: review,
      _selected: !dup && importable,
    };
  });

  return {
    candidates,
    stats: {
      scanned: emails.length,
      ignored,
      found: candidates.length,
      duplicates: candidates.filter(c => c._dup).length,
      needReview: candidates.filter(c => c._review.length > 0).length,
    },
  };
}

// Convierte un candidato revisado en una fila lista para importReservations().
// Nota: NO enviamos `currency` (la tabla `reservations` no la tiene; todo va en
// EUR por defecto), igual que hace la importación por CSV/iCal.
export function candidateToReservation(c) {
  return {
    property_id: c._property_id ?? null,
    guest_name: c.guest_name || 'Reserva',
    source: c.source,
    check_in: c.check_in,
    check_out: c.check_out,
    gross_income: Number(c.gross_income) || 0,
    channel_fee: Number(c.channel_fee) || 0,
    status: c.status || 'confirmed',
    external_uid: c.external_uid || null,
  };
}

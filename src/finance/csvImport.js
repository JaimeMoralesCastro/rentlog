// ============================================================================
//  Importación de reservas desde CSV (informe de Airbnb / Booking).
//  Parser de CSV tolerante (comillas, comas internas) + mapeo de columnas.
// ============================================================================

// Parser CSV mínimo que respeta campos entrecomillados con comas y saltos.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"' && t[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') pushField();
      else if (c === '\n') pushRow();
      else field += c;
    }
  }
  if (field.length || row.length) pushRow();
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

// Normaliza un encabezado para comparar (sin acentos, minúsculas, sin signos)
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

// Busca el índice de la primera columna cuyo encabezado contenga alguno de los alias
function findCol(headers, aliases) {
  const H = headers.map(norm);
  for (const a of aliases) {
    const idx = H.findIndex(h => h.includes(norm(a)));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDate(s) {
  if (!s) return null;
  const t = s.trim();
  // ISO (2026-06-04) o formatos con / . Devuelve YYYY-MM-DD o null.
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(t);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function parseMoney(s) {
  if (!s) return 0;
  const cleaned = String(s).replace(/[^0-9.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Mapea el CSV a filas de reservation. propertyId: a qué propiedad se asignan.
// source: etiqueta de canal ('Airbnb' | 'Booking').
export function parseReservationsCsv(text, { propertyId, source = 'Airbnb' } = {}) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { reservations: [], errors: ['El archivo no tiene filas de datos.'] };

  const headers = rows[0];
  const col = {
    guest:   findCol(headers, ['guest name', 'nombre del huesped', 'huesped', 'guest']),
    checkin: findCol(headers, ['start date', 'check in', 'fecha de entrada', 'entrada', 'arrival', 'checkin', 'fecha']),
    checkout: findCol(headers, ['end date', 'check out', 'fecha de salida', 'salida', 'departure', 'checkout']),
    nights:  findCol(headers, ['nights', 'noches', 'n de noches', 'num noches']),
    income:  findCol(headers, ['earnings', 'ganancias', 'amount', 'payout', 'pago', 'ingresos', 'importe', 'total']),
    fee:     findCol(headers, ['service fee', 'host fee', 'comision', 'commission', 'tarifa de servicio']),
    status:  findCol(headers, ['status', 'estado']),
  };

  // Necesitamos la entrada y, o bien la salida, o bien el nº de noches para calcularla.
  if (col.checkin === -1 || (col.checkout === -1 && col.nights === -1)) {
    return { reservations: [], errors: ['No se encontró la fecha de entrada ni la de salida/noches. Asegúrate de exportar el informe de ingresos o de reservas de Airbnb.'] };
  }

  const reservations = [];
  const errors = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const ci = parseDate(r[col.checkin]);
    // Salida: directa, o calculada a partir de la entrada + nº de noches
    let co = col.checkout !== -1 ? parseDate(r[col.checkout]) : null;
    if (!co && ci && col.nights !== -1) {
      const n = parseInt(String(r[col.nights]).replace(/\D/g, ''), 10);
      if (Number.isFinite(n) && n > 0) {
        const d = new Date(ci); d.setDate(d.getDate() + n);
        co = d.toISOString().slice(0, 10);
      }
    }
    if (!ci || !co) { errors.push(`Fila ${i + 1}: fechas no válidas, omitida.`); continue; }

    const rawStatus = col.status !== -1 ? norm(r[col.status]) : '';
    const status = rawStatus.includes('cancel') ? 'cancelled' : 'confirmed';

    reservations.push({
      property_id: propertyId ?? null,
      guest_name: col.guest !== -1 ? (r[col.guest] || '').trim() : '',
      source,
      check_in: ci,
      check_out: co,
      gross_income: col.income !== -1 ? parseMoney(r[col.income]) : 0,
      channel_fee: col.fee !== -1 ? parseMoney(r[col.fee]) : 0,
      status,
    });
  }

  return { reservations, errors };
}

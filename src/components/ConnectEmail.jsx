import { useState, useEffect } from 'react';
import Select from './Select.jsx';
import { scanInbox, candidateToReservation } from '../email/importEmails.js';
import { getGmailAccount, startGmailConnect, fetchHostEmails, disconnectGmail } from '../email/gmailConnection.js';
import { isConfigured } from '../lib/supabase.js';
import { formatCurrency, formatDate } from '../finance/dateHelpers.js';

// "Conecta tu correo" — puente Gmail (OAuth read-only).
// Flujo: intro/conectar → leer bandeja → revisar las reservas reconstruidas →
// importar. En modo demo lee una bandeja simulada; con Supabase + Google
// configurados, conecta Gmail de verdad y lee los correos del usuario.
export default function ConnectEmail({ data, onClose }) {
  const { properties, reservations, importReservations } = data;
  const [account, setAccount] = useState(null); // null=cargando | {demo}|{connected}|{connected:false}
  const [step, setStep] = useState('intro');     // intro | scanning | review | done
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let alive = true;
    getGmailAccount().then(a => { if (alive) setAccount(a); }).catch(() => { if (alive) setAccount({ connected: false }); });
    return () => { alive = false; };
  }, []);

  const demo = !isConfigured;
  const connected = demo || account?.connected;

  const connectGmail = async () => {
    setBusy(true); setError(null);
    try {
      await startGmailConnect();
      const a = await getGmailAccount();
      setAccount(a);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const disconnect = async () => {
    setBusy(true); setError(null);
    try { await disconnectGmail(); setAccount({ connected: false }); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };

  const scan = async () => {
    setBusy(true); setError(null); setStep('scanning');
    try {
      const emails = await fetchHostEmails();
      const { candidates: cs, stats: st } = scanInbox(emails, {
        properties,
        existingReservations: reservations,
      });
      setCandidates(cs);
      setStats(st);
      setStep('review');
    } catch (e) {
      setError(e.message);
      setStep('intro');
    }
    setBusy(false);
  };

  const setRow = (i, patch) => setCandidates(cs => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  // Solo se importa lo que no es duplicado, tiene fechas y una propiedad asignada
  // (property_id es obligatorio en la BBDD).
  const canImport = (c) => !c._dup && c._importable && !!c._property_id;

  const runImport = async () => {
    setBusy(true); setError(null);
    const chosen = candidates.filter(c => c._selected && canImport(c));
    const rows = chosen.map(candidateToReservation);
    const res = await importReservations(rows);
    if (res.error) { setError(res.error); setBusy(false); return; }
    setSummary({
      inserted: res.inserted,
      total: rows.reduce((s, r) => s + (r.status === 'cancelled' ? 0 : r.gross_income), 0),
    });
    setStep('done');
    setBusy(false);
  };

  const selectableCount = candidates.filter(c => c._selected && canImport(c)).length;

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[92vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-canvas-card z-10">
          <h2 className="text-base font-semibold text-ink-900">Conecta tu correo</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-400 hover:text-ink-900 text-[22px] leading-none w-8 h-8 -mr-1.5 flex items-center justify-center rounded-lg">×</button>
        </header>

        {step === 'intro' ? (
          <div className="px-6 py-8">
            <p className="text-eyebrow mb-3">Reservas automáticas</p>
            <h3 className="text-[20px] font-display font-semibold tracking-tighter text-ink-900 leading-tight mb-3">
              Tus reservas, desde los correos de Airbnb y Booking
            </h3>
            <p className="text-[12.5px] text-ink-500 leading-relaxed mb-5">
              Rentlog lee los correos que te llegan cuando alguien reserva o cuando recibes un pago, y
              reconstruye la reserva con su importe y comisión. Tú revisas y confirmas. Solo lectura:
              nunca escribimos ni enviamos nada desde tu correo.
            </p>

            {demo && (
              <div className="flex items-start gap-2 rounded-lg bg-warn/10 px-3 py-2.5 mb-5">
                <span className="text-warn text-[13px] leading-none mt-0.5" aria-hidden>!</span>
                <p className="text-[11.5px] text-ink-600 leading-relaxed">
                  Modo <strong>demo</strong>: leemos una bandeja de ejemplo. La conexión real con Gmail
                  (solo lectura) se activa al configurar tu cuenta; el flujo es idéntico.
                </p>
              </div>
            )}

            {connected && account?.email && (
              <p className="text-[11.5px] text-ink-500 mb-5">
                Conectado como <strong className="text-ink-900">{account.email}</strong>
                {' · '}
                <button onClick={disconnect} disabled={busy} className="sublink text-ink-500 hover:text-expense">Desconectar</button>
              </p>
            )}

            {error && <p className="text-[11.5px] text-expense mb-3">{error}</p>}

            {account === null ? (
              <p className="text-[12.5px] text-ink-400 py-2">Comprobando conexión…</p>
            ) : connected ? (
              <button onClick={scan} disabled={busy} className="w-full mt-2 py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold disabled:opacity-50">
                {busy ? 'Leyendo…' : 'Leer mi correo'}
              </button>
            ) : (
              <button onClick={connectGmail} disabled={busy} className="w-full mt-2 py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold disabled:opacity-50">
                {busy ? 'Conectando…' : 'Conectar Gmail'}
              </button>
            )}
            {!demo && !connected && account !== null && (
              <p className="text-[10.5px] text-ink-400 mt-3">Te llevaremos a Google para dar permiso de solo lectura. Puedes revocarlo cuando quieras.</p>
            )}
          </div>

        ) : step === 'scanning' ? (
          <div className="px-6 py-14 text-center">
            <div className="w-5 h-5 border-2 border-ink-200 border-t-ink-900 rounded-full animate-spin mx-auto mb-5" />
            <p className="text-[13px] font-medium text-ink-900">Leyendo tus correos…</p>
            <p className="text-[11.5px] text-ink-500 mt-1.5">Buscando reservas de Airbnb y Booking (solo lectura).</p>
          </div>

        ) : step === 'review' ? (
          <div className="px-6 py-6">
            {candidates.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[15px] font-semibold text-ink-900 mb-1">No hay reservas nuevas</p>
                <p className="text-[12.5px] text-ink-500">No encontramos correos de reserva sin importar.</p>
                <button onClick={onClose} className="mt-6 py-2.5 px-5 rounded-xl bg-accent text-ink-900 text-sm font-semibold">Cerrar</button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-eyebrow mb-1">Revisa y confirma</p>
                  <p className="text-[12.5px] text-ink-500">
                    {stats.found} {stats.found === 1 ? 'reserva encontrada' : 'reservas encontradas'} en {stats.scanned} correos
                    {stats.ignored > 0 && ` · ${stats.ignored} ignorados`}
                    {stats.duplicates > 0 && ` · ${stats.duplicates} ya importadas`}
                  </p>
                </div>

                <ul className="flex flex-col mb-4">
                  {candidates.map((c, i) => (
                    <li key={c.external_uid || i} className={`py-3 ${i > 0 ? 'hair-top' : ''} ${c._dup ? 'opacity-55' : ''}`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => canImport(c) && setRow(i, { _selected: !c._selected })}
                          disabled={!canImport(c)}
                          aria-label={c._selected ? 'Quitar' : 'Incluir'}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center text-[11px] font-bold shrink-0 ${(c._selected && canImport(c)) ? 'bg-accent border-accent text-ink-900' : 'border-ink-200 text-transparent'} ${!canImport(c) ? 'cursor-not-allowed' : ''}`}
                        >✓</button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13px] font-medium text-ink-900 truncate">{c.guest_name || 'Reserva'}</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{c.source}</span>
                            {c._dup && <Badge>Ya importada</Badge>}
                            {c.status === 'cancelled' && <Badge tone="warn">Cancelada</Badge>}
                            {!c._importable && <Badge tone="warn">Sin fechas</Badge>}
                          </div>
                          <p className="text-[11px] text-ink-500 mt-0.5">
                            {c.check_in ? formatDate(c.check_in) : '—'} → {c.check_out ? formatDate(c.check_out) : '—'}
                            {c.nights ? ` · ${c.nights}n` : ''}
                          </p>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Select
                              className="w-40"
                              value={c._property_id}
                              onChange={v => setRow(i, { _property_id: v })}
                              placeholder="Asignar propiedad"
                              options={properties.map(p => ({ value: p.id, label: p.name }))}
                            />
                            {c.listing_hint && !c._matchedName && (
                              <span className="text-[10.5px] text-ink-400">del correo: «{c.listing_hint}»</span>
                            )}
                          </div>

                          {!c._dup && c._importable && !c._property_id && (
                            <p className="text-[10.5px] text-warn mt-1.5">Asigna una propiedad para importarla</p>
                          )}
                          {c._review.length > 0 && (
                            <p className="text-[10.5px] text-warn mt-1.5">Revisar: {c._review.map(labelFor).join(', ')}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold text-ink-900 tabular">{formatCurrency(c.gross_income)}</p>
                          {c.channel_fee > 0 && <p className="text-[10.5px] text-ink-400 tabular">−{formatCurrency(c.channel_fee)} com.</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {error && <p className="text-[11.5px] text-expense mb-3">{error}</p>}
                <button onClick={runImport} disabled={busy || selectableCount === 0} className="w-full py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold disabled:opacity-50">
                  {busy ? 'Importando…' : `Importar ${selectableCount} ${selectableCount === 1 ? 'reserva' : 'reservas'}`}
                </button>
              </>
            )}
          </div>

        ) : (
          <div className="px-6 py-10 text-center">
            <span aria-hidden className="text-income text-[32px] leading-none block mb-3">✓</span>
            <h3 className="text-[20px] font-display font-semibold tracking-tighter text-ink-900 mb-2">Reservas importadas</h3>
            <p className="text-[13px] text-ink-500 mb-6">
              {summary.inserted} {summary.inserted === 1 ? 'reserva añadida' : 'reservas añadidas'} · {formatCurrency(summary.total)} en ingresos
            </p>
            <button onClick={onClose} className="w-full max-w-[260px] py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold">Ver mis reservas</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ children, tone }) {
  const cls = tone === 'warn' ? 'bg-warn/15 text-warn' : 'bg-ink-100 text-ink-500';
  return <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>{children}</span>;
}

const LABELS = { check_in: 'llegada', check_out: 'salida', gross_income: 'importe', guest_name: 'huésped', external_uid: 'código' };
function labelFor(k) { return LABELS[k] || k; }

import { useState } from 'react';
import { connect, getConnection, disconnect } from '../connector/connection.js';
import { importBusiness } from '../connector/importBusiness.js';
import { startCheckout } from '../lib/premium.js';
import { formatCurrency } from '../finance/dateHelpers.js';
import { isConfigured } from '../lib/supabase.js';

// "Conectar mi negocio" — feature Premium. Una sola acción clara por pantalla:
//  paywall → código de invitación → progreso → resumen de lo importado.
// Habla únicamente con la abstracción del connector (nunca con Beds24 directo).

const PROGRESS_COPY = {
  auth:       'Autorizando tu cuenta…',
  properties: 'Leyendo tus propiedades…',
  bookings:   'Trayendo tus reservas e importes…',
  saving:     'Guardando en Rentlog…',
};

export default function ConnectBusiness({ data, premium, onClose }) {
  const existing = getConnection();
  const [step, setStep] = useState(existing ? 'connected' : 'intro'); // intro | connecting | connected | done
  const [code, setCode] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);

  const { isPremium, activateDemo } = premium;

  const runImport = async () => {
    setBusy(true); setError(null); setStep('connecting');
    try {
      const res = await importBusiness(data, setProgress);
      setSummary(res);
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep(getConnection() ? 'connected' : 'intro');
    }
    setBusy(false);
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await connect(code);
      await runImport();
    } catch (e2) {
      setError(e2.message);
      setBusy(false);
    }
  };

  const handleDisconnect = () => { disconnect(); setStep('intro'); setSummary(null); };

  const handleCheckout = () => {
    const url = startCheckout();
    if (!url && !isConfigured) activateDemo(); // demo: simula la activación
  };

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[92vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-canvas-card z-10">
          <h2 className="text-base font-semibold text-ink-900">Conectar mi negocio</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-400 hover:text-ink-900 text-[22px] leading-none w-8 h-8 -mr-1.5 flex items-center justify-center rounded-lg">×</button>
        </header>

        {/* ── Paywall: lo Premium queda detrás de esta pantalla ── */}
        {!isPremium ? (
          <div className="px-6 py-10 text-center">
            <p className="text-eyebrow mb-3">Premium</p>
            <h3 className="text-[24px] font-display font-semibold tracking-tighter text-ink-900 leading-tight mb-3">
              Tus reservas e ingresos,<br />importados solos.
            </h3>
            <p className="text-[13px] text-ink-500 leading-relaxed max-w-[300px] mx-auto mb-8">
              Conecta tu cuenta una vez y Rentlog trae tus propiedades, reservas, importes y comisiones de Airbnb y Booking. Sin enlaces iCal, sin CSV.
            </p>
            <div className="border-t border-ink-100 pt-6 mb-8 max-w-[260px] mx-auto">
              <p className="text-[34px] font-display font-semibold tracking-tighter text-ink-900 tabular leading-none">19 €<span className="text-[14px] text-ink-500 font-medium tracking-normal"> / mes</span></p>
              <p className="text-[11.5px] text-ink-500 mt-2">Hasta 3 propiedades · cancela cuando quieras</p>
            </div>
            <button onClick={handleCheckout} className="w-full max-w-[260px] py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold">
              {isConfigured ? 'Activar Premium' : 'Probar Premium'}
            </button>
            <p className="text-[10.5px] text-ink-400 mt-3">{isConfigured ? 'Pago seguro con Stripe.' : 'Modo demo: se activa al instante para que lo pruebes.'}</p>
          </div>

        ) : step === 'intro' ? (
          <form onSubmit={handleConnect} className="px-6 py-8">
            <p className="text-eyebrow mb-3">Un solo paso</p>
            <h3 className="text-[20px] font-display font-semibold tracking-tighter text-ink-900 leading-tight mb-3">
              Pega tu código de invitación
            </h3>
            <p className="text-[12.5px] text-ink-500 leading-relaxed mb-6">
              Genera un código de invitación en tu channel manager (ajustes → API) con permiso de lectura de reservas, y pégalo aquí. Rentlog hará el resto.
            </p>
            <input
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={isConfigured ? 'Código de invitación' : 'DEMO-1234 (modo demo)'}
              className="w-full bg-canvas border border-ink-100 rounded-xl px-4 py-3 text-sm tracking-wide focus:outline-none focus:border-teal-300 mb-3"
            />
            {error && <p className="text-[11.5px] text-expense mb-3">{error}</p>}
            <button disabled={busy || !code.trim()} className="w-full py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold disabled:opacity-50">
              {busy ? 'Conectando…' : 'Conectar e importar'}
            </button>
          </form>

        ) : step === 'connecting' ? (
          <div className="px-6 py-14 text-center">
            <div className="w-5 h-5 border-2 border-ink-200 border-t-ink-900 rounded-full animate-spin mx-auto mb-5" />
            <p className="text-[13px] font-medium text-ink-900">{PROGRESS_COPY[progress] ?? 'Conectando…'}</p>
            <p className="text-[11.5px] text-ink-500 mt-1.5">Esto solo pasa la primera vez.</p>
          </div>

        ) : step === 'done' && summary ? (
          <div className="px-6 py-10 text-center">
            <span aria-hidden className="text-income text-[32px] leading-none block mb-3">✓</span>
            <h3 className="text-[20px] font-display font-semibold tracking-tighter text-ink-900 mb-6">Negocio conectado</h3>
            <div className="max-w-[280px] mx-auto text-left flex flex-col">
              <Row label="Propiedades" value={`${summary.propertiesCreated} nuevas de ${summary.propertiesFound}`} />
              <Row label="Reservas" value={`${summary.reservationsImported} importadas`} hair />
              {summary.duplicatesSkipped > 0 && <Row label="Ya existían" value={`${summary.duplicatesSkipped} omitidas`} hair />}
              <Row label="Ingresos traídos" value={formatCurrency(summary.grossTotal)} hair strong />
            </div>
            <p className="text-[11px] text-ink-400 mt-5 mb-6">Conectado vía {summary.provider}. Se sincroniza al volver a abrir.</p>
            <button onClick={onClose} className="w-full max-w-[260px] py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold">Ver mi dashboard</button>
          </div>

        ) : (
          /* connected: ya había conexión previa */
          <div className="px-6 py-10 text-center">
            <p className="text-eyebrow mb-3">Conectado vía {existing?.label}</p>
            <h3 className="text-[20px] font-display font-semibold tracking-tighter text-ink-900 mb-3">Tu negocio ya está conectado</h3>
            <p className="text-[12.5px] text-ink-500 leading-relaxed max-w-[300px] mx-auto mb-8">
              Puedes volver a sincronizar para traer las reservas nuevas. Las ya importadas no se duplican.
            </p>
            {error && <p className="text-[11.5px] text-expense mb-3">{error}</p>}
            <button onClick={runImport} disabled={busy} className="w-full max-w-[260px] py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold disabled:opacity-50 mb-3">
              {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <button onClick={handleDisconnect} className="sublink text-[12px] text-ink-500 hover:text-expense">Desconectar cuenta</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, hair, strong }) {
  return (
    <div className={`flex items-baseline justify-between py-2.5 ${hair ? 'hair-top' : ''}`}>
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className={`text-[13px] tabular ${strong ? 'font-semibold text-ink-900' : 'font-medium text-ink-700'}`}>{value}</span>
    </div>
  );
}

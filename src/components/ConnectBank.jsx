import { useState } from 'react';
import Select from './Select.jsx';
import { getBankProvider } from '../banking/provider.js';
import { buildExpenseCandidates } from '../banking/mapper.js';
import { loadImportedTxIds, rememberImportedTxIds } from '../lib/bankStore.js';
import { CATEGORIES, CATEGORY_LIST } from '../finance/categoryConfig.js';
import { isDeductible, treatmentFor, TREATMENTS } from '../finance/fiscalSpain.js';
import { formatCurrencyPrecise, formatDate } from '../finance/dateHelpers.js';

// Fase D — "Conectar banco" (Open Banking / AISP, read-only).
// Flujo: elegir banco → consentimiento (sandbox) → revisar los cargos que
// Rentlog categoriza solo → importar los elegidos como gastos.
// Habla solo con la abstracción de banca (nunca con Enable Banking directo).
export default function ConnectBank({ data, onClose }) {
  const { properties, importExpenses } = data;
  const provider = getBankProvider();
  const [step, setStep] = useState('intro'); // intro | connecting | review | done
  const [bankId, setBankId] = useState('bbva');
  const [banks, setBanks] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);

  // Carga la lista de bancos al abrir (perezoso)
  if (banks.length === 0 && provider.sandbox) {
    provider.listBanks('ES').then(setBanks).catch(() => {});
  }

  const connect = async () => {
    setBusy(true); setError(null); setStep('connecting');
    try {
      const { sessionId } = await provider.startSession(bankId);
      const accounts = await provider.getAccounts(sessionId);
      const txs = await provider.getTransactions(sessionId, accounts[0]?.id, {});
      const alreadyImported = await loadImportedTxIds();
      const cands = buildExpenseCandidates(txs, { propertyId, alreadyImported })
        .map(c => ({ ...c, _selected: true }));
      setCandidates(cands);
      setStep('review');
    } catch (e) {
      setError(e.message);
      setStep('intro');
    }
    setBusy(false);
  };

  const setRow = (i, patch) => setCandidates(cs => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setRowCategory = (i, category) => {
    const subcategory = Object.keys(CATEGORIES[category]?.subcategories || { General: [] })[0] || 'General';
    setRow(i, { category, subcategory, is_deductible: isDeductible(category, subcategory) });
  };

  const runImport = async () => {
    setBusy(true); setError(null);
    const chosen = candidates.filter(c => c._selected);
    const rows = chosen.map(({ _selected, ...r }) => ({ ...r, property_id: propertyId }));
    const res = await importExpenses(rows);
    if (res.error) { setError(res.error); setBusy(false); return; }
    await rememberImportedTxIds(chosen.map(c => c.bank_tx_id));
    setSummary({ inserted: res.inserted, total: rows.reduce((s, r) => s + r.amount, 0) });
    setStep('done');
    setBusy(false);
  };

  const selectedCount = candidates.filter(c => c._selected).length;

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[92vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-canvas-card z-10">
          <h2 className="text-base font-semibold text-ink-900">Conectar banco</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-400 hover:text-ink-900 text-[22px] leading-none w-8 h-8 -mr-1.5 flex items-center justify-center rounded-lg">×</button>
        </header>

        {step === 'intro' ? (
          <div className="px-6 py-8">
            <p className="text-eyebrow mb-3">Gastos automáticos</p>
            <h3 className="text-[20px] font-display font-semibold tracking-tighter text-ink-900 leading-tight mb-3">
              Que tus gastos entren solos desde el banco
            </h3>
            <p className="text-[12.5px] text-ink-500 leading-relaxed mb-5">
              Conecta tu banco por Open Banking (solo lectura) y Rentlog trae tus cargos y los
              categoriza. Tú revisas y confirmas. Nunca compartes tus claves con Rentlog: te
              identificas en tu propio banco.
            </p>
            {provider.sandbox && (
              <div className="flex items-start gap-2 rounded-lg bg-warn/10 px-3 py-2.5 mb-5">
                <span className="text-warn text-[13px] leading-none mt-0.5" aria-hidden>!</span>
                <p className="text-[11.5px] text-ink-600 leading-relaxed">
                  Modo <strong>sandbox</strong>: datos de prueba. La conexión real (Enable Banking) se
                  activa cuando configures tu acceso; el flujo es idéntico.
                </p>
              </div>
            )}
            <label className="block mb-2">
              <span className="text-[12px] font-medium text-ink-500 block mb-1.5">Tu banco</span>
              <Select value={bankId} onChange={setBankId}
                options={(banks.length ? banks : [{ id: 'bbva', name: 'BBVA' }]).map(b => ({ value: b.id, label: b.name }))} />
            </label>
            {error && <p className="text-[11.5px] text-expense mb-3">{error}</p>}
            <button onClick={connect} disabled={busy} className="w-full mt-4 py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold disabled:opacity-50">
              {busy ? 'Conectando…' : 'Conectar y leer movimientos'}
            </button>
          </div>

        ) : step === 'connecting' ? (
          <div className="px-6 py-14 text-center">
            <div className="w-5 h-5 border-2 border-ink-200 border-t-ink-900 rounded-full animate-spin mx-auto mb-5" />
            <p className="text-[13px] font-medium text-ink-900">Conectando con tu banco…</p>
            <p className="text-[11.5px] text-ink-500 mt-1.5">Leyendo los últimos movimientos (solo lectura).</p>
          </div>

        ) : step === 'review' ? (
          <div className="px-6 py-6">
            {candidates.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[15px] font-semibold text-ink-900 mb-1">No hay cargos nuevos</p>
                <p className="text-[12.5px] text-ink-500">Ya has importado los movimientos disponibles en el sandbox.</p>
                <button onClick={onClose} className="mt-6 py-2.5 px-5 rounded-xl bg-accent text-ink-900 text-sm font-semibold">Cerrar</button>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
                  <div>
                    <p className="text-eyebrow mb-1">Revisa y confirma</p>
                    <p className="text-[12.5px] text-ink-500">{candidates.length} cargos · categorizados automáticamente</p>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-medium text-ink-400 block mb-1">Asignar a</span>
                    <Select className="w-44" value={propertyId} onChange={setPropertyId} placeholder="Sin propiedad"
                      options={properties.map(p => ({ value: p.id, label: p.name }))} />
                  </label>
                </div>

                <ul className="flex flex-col mb-4">
                  {candidates.map((c, i) => {
                    const t = TREATMENTS[treatmentFor(c.category, c.subcategory)];
                    return (
                      <li key={c.bank_tx_id} className={`flex items-center gap-3 py-3 ${i > 0 ? 'hair-top' : ''}`}>
                        <button
                          onClick={() => setRow(i, { _selected: !c._selected })}
                          aria-label={c._selected ? 'Quitar' : 'Incluir'}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-[11px] font-bold shrink-0 ${c._selected ? 'bg-accent border-accent text-ink-900' : 'border-ink-200 text-transparent'}`}
                        >✓</button>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink-900 truncate">{c.description}</p>
                          <p className="text-[11px] text-ink-500">{formatDate(c.date)}</p>
                        </div>
                        <Select className="w-36 shrink-0" value={c.category} onChange={v => setRowCategory(i, v)}
                          options={CATEGORY_LIST.map(cat => ({ value: cat, label: cat }))} />
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider w-16 text-center shrink-0" style={{ color: t.color }}>{t.label}</span>
                        <span className="text-[13px] font-semibold text-ink-900 tabular w-20 text-right shrink-0">{formatCurrencyPrecise(c.amount)}</span>
                      </li>
                    );
                  })}
                </ul>

                {error && <p className="text-[11.5px] text-expense mb-3">{error}</p>}
                <button onClick={runImport} disabled={busy || selectedCount === 0} className="w-full py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold disabled:opacity-50">
                  {busy ? 'Importando…' : `Importar ${selectedCount} ${selectedCount === 1 ? 'gasto' : 'gastos'}`}
                </button>
              </>
            )}
          </div>

        ) : (
          <div className="px-6 py-10 text-center">
            <span aria-hidden className="text-income text-[32px] leading-none block mb-3">✓</span>
            <h3 className="text-[20px] font-display font-semibold tracking-tighter text-ink-900 mb-2">Gastos importados</h3>
            <p className="text-[13px] text-ink-500 mb-6">{summary.inserted} {summary.inserted === 1 ? 'gasto añadido' : 'gastos añadidos'} · {formatCurrencyPrecise(summary.total)}</p>
            <button onClick={onClose} className="w-full max-w-[260px] py-3 rounded-xl bg-accent hover:bg-accent-ink text-ink-900 text-sm font-semibold">Ver mis finanzas</button>
          </div>
        )}
      </div>
    </div>
  );
}

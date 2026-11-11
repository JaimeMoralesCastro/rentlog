// Dedupe de banca: qué transacciones ya se importaron como gasto (por
// bank_tx_id) para no duplicarlas al reconectar.
// Con sesión, la verdad está en la columna `expenses.bank_tx_id` (única por
// usuario); en demo, en localStorage.
import { supabase, isConfigured } from './supabase.js';

const KEY = 'rentlog_bank_imported_tx';

export async function loadImportedTxIds() {
  if (!isConfigured) {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  const { data, error } = await supabase
    .from('expenses').select('bank_tx_id').not('bank_tx_id', 'is', null);
  if (error) return [];
  return (data || []).map(r => r.bank_tx_id).filter(Boolean);
}

export async function rememberImportedTxIds(ids = []) {
  // Con sesión no hace falta: el propio insert con bank_tx_id (+ índice único)
  // garantiza el dedupe y loadImportedTxIds lee de `expenses`.
  if (isConfigured) return ids;
  const prev = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } })();
  const list = [...new Set([...prev, ...ids])];
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
  return list;
}

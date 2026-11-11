// ============================================================================
//  Banca · Mapeo transacción → gasto Rentlog (Fase D).
//  Solo los CARGOS (amount < 0) se convierten en gastos; los abonos (payouts)
//  se ignoran (los ingresos entran por reservas). La categoría se sugiere
//  reutilizando el clasificador de Gastolens sobre el concepto + contraparte.
// ============================================================================
import { classifyDescription } from '../finance/nlpParser.js';
import { isDeductible } from '../finance/fiscalSpain.js';

// ¿Es un cargo que debería revisarse como gasto? (excluye abonos)
export function isExpenseTransaction(tx) {
  return Number(tx.amount) < 0;
}

// Convierte una transacción en un "candidato a gasto" (aún sin persistir).
// El anfitrión lo revisa (categoría/propiedad) antes de importarlo.
export function mapTransaction(tx, { propertyId = null } = {}) {
  const text = `${tx.counterparty || ''} ${tx.description || ''}`.trim();
  const { category, subcategory } = classifyDescription(text);
  return {
    bank_tx_id: tx.id,                       // para dedupe
    property_id: propertyId,
    amount: Math.abs(Number(tx.amount) || 0),
    currency: tx.currency || 'EUR',
    category,
    subcategory,
    description: tx.counterparty || text || `${category} · ${subcategory}`,
    raw_text: text,
    is_deductible: isDeductible(category, subcategory),
    date: tx.date,
    source: 'bank',
  };
}

// Prepara la lista de candidatos a partir de las transacciones (solo cargos),
// excluyendo los que ya se importaron antes (dedupe por bank_tx_id).
export function buildExpenseCandidates(transactions = [], { propertyId = null, alreadyImported = [] } = {}) {
  const seen = new Set(alreadyImported);
  return transactions
    .filter(isExpenseTransaction)
    .filter((tx) => !seen.has(tx.id))
    .map((tx) => mapTransaction(tx, { propertyId }));
}

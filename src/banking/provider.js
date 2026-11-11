// ============================================================================
//  Banca abierta (Open Banking / AISP) · Abstracción de proveedor — Fase D
//
//  Contrato que toda implementación cumple. La app SOLO habla con esta interfaz
//  (nunca con Enable Banking directamente), para poder empezar con un proveedor
//  MOCK/sandbox hoy y enchufar el real (Enable Banking) mañana sin tocar la UI,
//  el mapper ni el import.
//
//  interface BankProvider {
//    id: string        // 'mock' | 'enablebanking'
//    label: string     // nombre mostrado
//    sandbox: boolean  // true = datos de prueba (no reales)
//    listBanks(country) // → [{ id, name, country }]
//    startSession(bankId)
//                       // → { sessionId, authUrl? }  (real: consentimiento en el
//                       //    banco vía authUrl; mock: sesión inmediata)
//    getAccounts(sessionId)
//                       // → [{ id, name, iban }]
//    getTransactions(sessionId, accountId, { from })
//                       // → [{ id, date, amount, currency, counterparty, description }]
//                       //    amount < 0 = cargo (gasto); amount > 0 = abono (ingreso)
//  }
//
//  Las formas de respuesta siguen el modelo de Enable Banking (AISP, read-only)
//  para que el salto a producción sea solo de transporte/credenciales.
// ============================================================================
import { mockBankProvider } from './providers/mockBankProvider.js';
import { enableBankingProvider } from './providers/enableBankingProvider.js';

const REGISTRY = {
  mock: mockBankProvider,
  enablebanking: enableBankingProvider,
};

// Proveedor activo: por env (VITE_BANK_PROVIDER) o mock por defecto.
export function getBankProvider(name) {
  const id = name || import.meta.env.VITE_BANK_PROVIDER || 'mock';
  const p = REGISTRY[id];
  if (!p) throw new Error(`Proveedor de banca desconocido: ${id}`);
  return p;
}

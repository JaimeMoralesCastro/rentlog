// ============================================================================
//  Proveedor de banca REAL — Enable Banking (AISP, read-only) — ESQUELETO.
//  NO tiene claves ni hace llamadas: documenta el mapeo a la API real para que
//  el salto desde el mock sea solo de transporte + credenciales del usuario.
//
//  Enable Banking (https://enablebanking.com):
//   - Autenticación de app: JWT firmado con la clave privada de la aplicación
//     (registrada en el panel) → Bearer para todas las llamadas.
//   - Tier "Restricted Production" GRATIS para desarrollo (solo cuentas propias).
//   - Producción multi-cliente: contrato + KYB (de pago) → activar con >20-30
//     clientes de pago (ver decisión en memoria decision-connectors-presupuesto).
//
//  Endpoints usados (base https://api.enablebanking.com):
//   GET  /aspsps?country=ES                → listBanks
//   POST /auth                             → inicia consentimiento (devuelve url)
//   GET  /sessions/{id}                    → estado de la sesión tras el consentimiento
//   GET  /accounts/{id}/balances
//   GET  /accounts/{id}/transactions?date_from=YYYY-MM-DD  → transacciones
//
//  Las credenciales (APP_ID + clave privada) NUNCA van en el cliente: la firma
//  del JWT y las llamadas se harán desde una Edge Function (patrón sync-connector).
// ============================================================================

const NOT_CONFIGURED =
  'Enable Banking aún no está conectado. Requiere registrar la app (APP_ID + clave privada) ' +
  'y una Edge Function que firme el JWT. De momento usa el banco demo (sandbox).';

export const enableBankingProvider = {
  id: 'enablebanking',
  label: 'Enable Banking',
  sandbox: false,

  async listBanks(/* country */) { throw new Error(NOT_CONFIGURED); },
  async startSession(/* bankId */) { throw new Error(NOT_CONFIGURED); },
  async getAccounts(/* sessionId */) { throw new Error(NOT_CONFIGURED); },
  async getTransactions(/* sessionId, accountId, opts */) { throw new Error(NOT_CONFIGURED); },
};

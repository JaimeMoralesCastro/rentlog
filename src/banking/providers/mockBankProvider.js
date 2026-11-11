// ============================================================================
//  Proveedor de banca MOCK / SANDBOX (Fase D).
//  Simula el flujo de un AISP (Enable Banking): lista de bancos españoles →
//  sesión de consentimiento inmediata → cuentas → transacciones de ejemplo
//  típicas de un anfitrión. TODO son DATOS DE PRUEBA, claramente etiquetados;
//  no hay conexión real ni credenciales.
// ============================================================================

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const BANKS = [
  { id: 'bbva',       name: 'BBVA',       country: 'ES' },
  { id: 'caixabank',  name: 'CaixaBank',  country: 'ES' },
  { id: 'santander',  name: 'Santander',  country: 'ES' },
  { id: 'sabadell',   name: 'Banco Sabadell', country: 'ES' },
];

// Transacciones de ejemplo (relativas a hoy). amount<0 = cargo (gasto).
// Mezclamos cargos de gastos del alquiler + un abono (payout Airbnb) + un cargo
// personal (para demostrar que el mapper solo importa gastos del alquiler).
function sampleTransactions() {
  const today = new Date();
  const d = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  return [
    { id: 'tx-1', date: d(2),  amount: -64.30,  currency: 'EUR', counterparty: 'IBERDROLA CLIENTES SAU',   description: 'Recibo luz vivienda alquiler' },
    { id: 'tx-2', date: d(4),  amount: -39.99,  currency: 'EUR', counterparty: 'MOVISTAR',                  description: 'Cuota fibra e internet' },
    { id: 'tx-3', date: d(6),  amount: -120.00, currency: 'EUR', counterparty: 'CLEANPRO LIMPIEZAS SL',     description: 'Servicio limpieza pisos turísticos' },
    { id: 'tx-4', date: d(9),  amount: -18.50,  currency: 'EUR', counterparty: 'MERCADONA',                 description: 'Amenities acogida huéspedes gel champú' },
    { id: 'tx-5', date: d(11), amount: -85.00,  currency: 'EUR', counterparty: 'FONTANERIA GARCIA',         description: 'Reparación grifo cocina' },
    { id: 'tx-6', date: d(13), amount: -42.00,  currency: 'EUR', counterparty: 'COMUNIDAD PROPIETARIOS',    description: 'Cuota comunidad mensual' },
    { id: 'tx-7', date: d(14), amount: 512.40,  currency: 'EUR', counterparty: 'AIRBNB PAYMENTS',           description: 'Payout reserva' },        // abono → no es gasto
    { id: 'tx-8', date: d(16), amount: -73.20,  currency: 'EUR', counterparty: 'SUPERCOR',                  description: 'Compra supermercado casa' }, // gasto personal → "Otros"
  ];
}

export const mockBankProvider = {
  id: 'mock',
  label: 'Banco demo (sandbox)',
  sandbox: true,

  async listBanks() {
    await delay(200);
    return BANKS;
  },

  async startSession(bankId) {
    await delay(400); // en real: redirección al banco para el consentimiento
    const bank = BANKS.find((b) => b.id === bankId);
    if (!bank) throw new Error('Banco no disponible en el sandbox.');
    return { sessionId: `mock-session-${bankId}-${Date.now()}`, authUrl: null };
  },

  async getAccounts() {
    await delay(300);
    return [
      { id: 'acc-1', name: 'Cuenta alquileres', iban: 'ES91 •••• •••• •••• 1234' },
    ];
  },

  async getTransactions(_sessionId, _accountId, { from } = {}) {
    await delay(500);
    const txs = sampleTransactions();
    if (!from) return txs;
    return txs.filter((t) => t.date >= from);
  },
};

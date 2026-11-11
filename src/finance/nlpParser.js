// ============================================================================
//  Parser NLP de gastos — motor heredado de Gastolens.
//  Convierte lenguaje natural ("250 euros de limpieza") en un gasto estructurado.
//  Números en palabras + multidivisa + clasificación por keywords.
// ============================================================================
import { CATEGORIES } from './categoryConfig.js';
import { isDeductible } from './fiscalSpain.js';

// ─── Números en palabras ────────────────────────────────────────────────────
const WORD_NUMS = {
  'cero': 0, 'un': 1, 'uno': 1, 'una': 1,
  'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 'seis': 6,
  'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
  'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
  'dieciséis': 16, 'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
  'veinte': 20, 'veintiuno': 21, 'veintidós': 22, 'veintidos': 22,
  'veintitrés': 23, 'veintitres': 23, 'veinticuatro': 24, 'veinticinco': 25,
  'veintiséis': 26, 'veintiseis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29,
  'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60,
  'setenta': 70, 'ochenta': 80, 'noventa': 90,
  'cien': 100, 'ciento': 100,
  'doscientos': 200, 'doscientas': 200, 'trescientos': 300, 'trescientas': 300,
  'cuatrocientos': 400, 'cuatrocientas': 400, 'quinientos': 500, 'quinientas': 500,
  'seiscientos': 600, 'seiscientas': 600, 'setecientos': 700, 'setecientas': 700,
  'ochocientos': 800, 'ochocientas': 800, 'novecientos': 900, 'novecientas': 900,
  'mil': 1000,
};

// ─── Divisas ────────────────────────────────────────────────────────────────
const TO_EUR = { EUR: 1, USD: 0.9259, GBP: 1.18 };
const CURRENCY_SYMBOL = { EUR: '€', USD: '$', GBP: '£' };
const CURRENCY_DETECTORS = [
  { regex: /(?:\$|\b(?:dólares?|dolares?)\b)/i, code: 'USD' },
  { regex: /(?:£|\b(?:libras?)\b)/i,            code: 'GBP' },
];

const MONEY_WORD_SRC = '€|\\$|£|euros?|eurazos?|pavos?|pavo|dólares?|dolares?|libras?';

function detectCurrency(text) {
  for (const { regex, code } of CURRENCY_DETECTORS) if (regex.test(text)) return code;
  return 'EUR';
}

function normalizeNumbers(text) {
  let t = text.toLowerCase();
  const words = Object.keys(WORD_NUMS).sort((a, b) => b.length - a.length);
  const wp = words.join('|');

  const compound = new RegExp(`\\b(${wp})\\s+y\\s+(${wp})\\b`, 'gi');
  t = t.replace(compound, (_, a, b) => {
    const va = WORD_NUMS[a.toLowerCase()];
    const vb = WORD_NUMS[b.toLowerCase()];
    return va !== undefined && vb !== undefined ? String(va + vb) : `${a} y ${b}`;
  });

  t = t.replace(/\bmil\b/gi, '1000');

  const single = new RegExp(`\\b(${words.filter(w => w !== 'mil').join('|')})\\b`, 'gi');
  t = t.replace(single, m => {
    const v = WORD_NUMS[m.toLowerCase()];
    return v !== undefined ? String(v) : m;
  });
  return t;
}

function extractRawAmount(normalizedText) {
  const mw = MONEY_WORD_SRC;
  const patterns = [
    new RegExp(`(\\d{1,6}[.,]\\d{1,2})\\s*(?:${mw})`, 'i'),
    new RegExp(`(\\d{1,6})\\s*(?:${mw})`, 'i'),
    new RegExp(`(?:${mw})\\s*(\\d{1,6}[.,]\\d{1,2})`, 'i'),
    new RegExp(`(?:${mw})\\s*(\\d{1,6})`, 'i'),
    /\b(\d{1,6}[.,]\d{1,2})\b/,
    /\b(\d{1,6})\b/,
  ];
  for (const p of patterns) {
    const m = normalizedText.match(p);
    if (m) return parseFloat(m[1].replace(',', '.'));
  }
  return 0;
}

function classifyExpense(text) {
  const lower = text.toLowerCase();
  let best = { category: 'Otros', subcategory: 'General', score: 0 };
  for (const [cat, data] of Object.entries(CATEGORIES)) {
    for (const [sub, keywords] of Object.entries(data.subcategories)) {
      const score = keywords.reduce((s, kw) => (lower.includes(kw) ? s + kw.length : s), 0);
      if (score > best.score) best = { category: cat, subcategory: sub, score };
    }
  }
  return { category: best.category, subcategory: best.subcategory };
}

// ─── API pública ─────────────────────────────────────────────────────────────
export function parseExpenseText(text) {
  const currency = detectCurrency(text);
  const normalized = normalizeNumbers(text);
  const originalAmount = extractRawAmount(normalized);
  const amount = parseFloat((originalAmount * (TO_EUR[currency] ?? 1)).toFixed(2));
  const { category, subcategory } = classifyExpense(text);

  return {
    amount,
    originalAmount,
    currency,
    category,
    subcategory,
    description: `${category} · ${subcategory}`,
    rawText: text.trim(),
    isDeductible: isDeductible(category, subcategory),
    date: new Date().toISOString(),
  };
}

// Clasifica una descripción libre (p. ej. el concepto de un cargo bancario) en
// categoría/subcategoría, sin extraer importe ni fecha. Lo usa el mapeo de
// transacciones bancarias (Fase D) para sugerir la categoría de cada gasto.
export function classifyDescription(text) {
  return classifyExpense(text || '');
}

export { CURRENCY_SYMBOL, TO_EUR };

// ============================================================================
//  ANÁLISIS DE SENTIMIENTO DE RESEÑAS (español)
//  Clasifica cada reseña por ASPECTO (limpieza, ubicación, descanso/ruido,
//  comunicación, wifi, equipamiento, precio) y calcula el sentimiento de cada
//  uno (-1 negativo … +1 positivo). Léxico curado + análisis por frases +
//  negación básica. Sin API externa.
// ============================================================================

// ── Aspectos y sus palabras clave ───────────────────────────────────────────
export const ASPECTS = {
  Limpieza:      { keywords: ['limpio', 'limpia', 'limpieza', 'sucio', 'sucia', 'impecable', 'polvo', 'mancha', 'manchas', 'higiene', 'aseado', 'pelos', 'cochambre'] },
  Ubicación:     { keywords: ['ubicación', 'ubicacion', 'ubicado', 'céntrico', 'centrico', 'centro', 'zona', 'localización', 'localizacion', 'situado', 'cerca', 'lejos', 'comunicado', 'transporte', 'metro', 'playa', 'restaurantes'] },
  Comunicación:  { keywords: ['comunicación', 'comunicacion', 'anfitrión', 'anfitrion', 'atento', 'atenta', 'responde', 'respuesta', 'amable', 'trato', 'ayuda', 'disponible', 'pendiente', 'facilidades', 'check-in', 'checkin'] },
  Descanso:      { keywords: ['cama', 'colchón', 'colchon', 'dormir', 'descansar', 'descanso', 'almohada', 'sueño', 'ruido', 'ruidoso', 'ruidos', 'silencioso', 'tranquilo', 'tranquila', 'silencio', 'ronquidos', 'calle'] },
  Wifi:          { keywords: ['wifi', 'internet', 'conexión', 'conexion', 'fibra', 'cobertura', 'router'] },
  Equipamiento:  { keywords: ['equipado', 'equipada', 'cocina', 'electrodomésticos', 'electrodomesticos', 'toallas', 'menaje', 'completo', 'completa', 'falta', 'faltaba', 'vajilla', 'cafetera', 'lavadora', 'aire acondicionado', 'calefacción', 'calefaccion'] },
  Precio:        { keywords: ['precio', 'caro', 'cara', 'barato', 'barata', 'económico', 'economico', 'relación calidad', 'relacion calidad', 'vale la pena', 'merece', 'calidad-precio'] },
};

// ── Léxico de polaridad ─────────────────────────────────────────────────────
const POSITIVE = ['genial', 'perfecto', 'perfecta', 'excelente', 'estupendo', 'estupenda', 'increíble', 'increible', 'encantador', 'encantadora', 'cómodo', 'comodo', 'cómoda', 'acogedor', 'acogedora', 'recomendable', 'recomendado', 'impecable', 'limpio', 'limpia', 'amable', 'tranquilo', 'tranquila', 'fantástico', 'fantastico', 'maravilloso', 'maravillosa', 'bien', 'bueno', 'buena', 'agradable', 'espacioso', 'espaciosa', 'luminoso', 'luminosa', 'nuevo', 'ideal', 'fácil', 'facil', 'silencioso', 'céntrico', 'centrico', 'atento', 'atenta', 'rápido', 'rapido', 'barato', 'económico', 'economico', 'repetiría', 'repetiria', 'volvería', 'volveria', 'encantó', 'encanto', 'spotless'];

const NEGATIVE = ['sucio', 'sucia', 'ruidoso', 'ruidosa', 'ruido', 'ruidos', 'frío', 'frio', 'caro', 'cara', 'pequeño', 'pequeña', 'pequeno', 'viejo', 'vieja', 'roto', 'rota', 'mal', 'malo', 'mala', 'problema', 'problemas', 'falta', 'faltaba', 'faltaban', 'decepción', 'decepcion', 'decepcionante', 'incómodo', 'incomodo', 'incómoda', 'lejos', 'escaso', 'escasa', 'antiguo', 'antigua', 'olor', 'mancha', 'manchas', 'polvo', 'pelos', 'lamentable', 'horrible', 'pésimo', 'pesimo', 'nunca', 'cochambre', 'estropeado', 'estropeada', 'no funciona'];

const NEGATORS = ['no', 'nunca', 'sin', 'tampoco', 'poco', 'nada', 'ni'];

function normalize(s) {
  return (s || '').toLowerCase();
}

function deaccent(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Polaridad de una frase: suma de palabras positivas/negativas con negación
function sentencePolarity(sentence) {
  const words = normalize(sentence).split(/[^a-záéíóúüñ]+/i).filter(Boolean);
  let score = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const negated = i > 0 && NEGATORS.includes(words[i - 1]);
    if (POSITIVE.includes(w)) score += negated ? -1 : 1;
    else if (NEGATIVE.includes(w)) score += negated ? 1 : -1;
  }
  return score;
}

function aspectsInSentence(sentence) {
  const s = deaccent(normalize(sentence));
  const found = [];
  for (const [aspect, { keywords }] of Object.entries(ASPECTS)) {
    if (keywords.some(kw => s.includes(deaccent(kw)))) found.push(aspect);
  }
  return found;
}

// Sentimiento de una valoración (1..5) → -1..1
function ratingSentiment(rating) {
  if (rating == null) return null;
  return Math.max(-1, Math.min(1, (Number(rating) - 3) / 2));
}

function clamp(n) { return Math.max(-1, Math.min(1, n)); }

/**
 * Analiza una reseña → sentimiento global + sentimiento por aspecto.
 * @returns { sentiment: -1..1, aspects: { Aspecto: score }, mentioned: [Aspecto] }
 */
export function analyzeReview(text = '', rating = null) {
  const sentences = String(text).split(/[.!?\n;]+/).map(s => s.trim()).filter(Boolean);
  const aspectScores = {};   // aspecto → suma de polaridad
  const aspectCounts = {};   // aspecto → nº frases que lo mencionan
  let textScore = 0, textWords = 0;

  for (const sentence of sentences) {
    const pol = sentencePolarity(sentence);
    textScore += pol;
    textWords += sentence.split(/\s+/).length;
    const asp = aspectsInSentence(sentence);
    for (const a of asp) {
      // Si la frase no tiene polaridad explícita, hereda el signo de la valoración
      const base = pol !== 0 ? pol : (ratingSentiment(rating) ?? 0) * 1.5;
      aspectScores[a] = (aspectScores[a] || 0) + base;
      aspectCounts[a] = (aspectCounts[a] || 0) + 1;
    }
  }

  // Sentimiento global: mezcla de polaridad del texto y de la valoración
  const textSent = textWords > 0 ? clamp(textScore / Math.max(Math.sqrt(textWords), 1)) : 0;
  const rSent = ratingSentiment(rating);
  const sentiment = rSent != null ? clamp(0.55 * rSent + 0.45 * textSent) : textSent;

  const aspects = {};
  for (const a of Object.keys(aspectScores)) {
    aspects[a] = clamp(aspectScores[a] / Math.max(aspectCounts[a], 1) / 1.5);
  }

  return { sentiment, aspects, mentioned: Object.keys(aspects) };
}

/**
 * Agrega un conjunto de reseñas: sentimiento por aspecto, valoración media,
 * mejor aspecto y principal problema recurrente.
 */
export function aggregateReviews(reviews = []) {
  const analyzed = reviews.map(r => ({
    ...r,
    analysis: analyzeReview(r.text, r.rating),
  }));

  const ratings = reviews.map(r => Number(r.rating)).filter(n => Number.isFinite(n));
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const overallSentiment = analyzed.length
    ? analyzed.reduce((s, r) => s + r.analysis.sentiment, 0) / analyzed.length
    : 0;

  // Agregado por aspecto
  const acc = {};
  for (const r of analyzed) {
    for (const [a, score] of Object.entries(r.analysis.aspects)) {
      if (!acc[a]) acc[a] = { aspect: a, mentions: 0, sum: 0, neg: 0, pos: 0 };
      acc[a].mentions += 1;
      acc[a].sum += score;
      if (score < -0.15) acc[a].neg += 1;
      else if (score > 0.15) acc[a].pos += 1;
    }
  }
  const byAspect = Object.values(acc)
    .map(a => ({
      aspect: a.aspect,
      mentions: a.mentions,
      sentiment: a.sum / a.mentions,
      negPct: Math.round((a.neg / a.mentions) * 100),
      posPct: Math.round((a.pos / a.mentions) * 100),
    }))
    .sort((a, b) => b.mentions - a.mentions);

  const ranked = [...byAspect].sort((a, b) => b.sentiment - a.sentiment);
  const topPositive = ranked[0]?.sentiment > 0.15 ? ranked[0] : null;
  // Problema recurrente: el aspecto con más % de menciones negativas (aunque su
  // media salga neutra por mezclarse con reseñas positivas). Capta quejas como
  // "el ruido" aunque otras reseñas elogien el descanso.
  const topIssue = [...byAspect]
    .filter(a => a.mentions >= 2 && (a.negPct >= 25 || a.sentiment < -0.1))
    .sort((a, b) => b.negPct - a.negPct || a.sentiment - b.sentiment)[0] || null;

  return { count: reviews.length, avgRating, overallSentiment, byAspect, topPositive, topIssue, analyzed };
}

export function sentimentLabel(score) {
  if (score > 0.3) return 'positivo';
  if (score < -0.2) return 'negativo';
  return 'neutro';
}

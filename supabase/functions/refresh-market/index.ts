// ============================================================================
//  Supabase Edge Function · refresh-market
//  Refresca el snapshot de datos de mercado desde la API REAL del INE
//  (pernoctaciones nacionales en alojamientos turísticos) y recalcula el
//  índice de estacionalidad. Guarda el resultado en la tabla market_data.
//
//  Pensada para ejecutarse con un cron (p. ej. mensual):
//    supabase functions deploy refresh-market
//    (y programar con pg_cron o un scheduler externo)
//
//  Fuente: INE wstempus — DATOS_TABLA/2941 (serie EOT, pernoctaciones).
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const INE_URL = 'https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/2941';

Deno.serve(async () => {
  try {
    const year = new Date().getFullYear() - 1; // último año completo
    const res = await fetch(`${INE_URL}?date=${year}0101:${year}1231`);
    if (!res.ok) return json({ error: `INE respondió ${res.status}` }, 502);
    const data = await res.json();

    // Localiza la serie nacional de pernoctaciones totales (EOT25)
    const serie = Array.isArray(data)
      ? data.find((s: any) => /pernoctaciones/i.test(s.Nombre) && /total/i.test(s.Nombre) && !/resident/i.test(s.Nombre))
      : null;
    if (!serie?.Data?.length) return json({ error: 'No se encontró la serie de pernoctaciones', raw: !!data }, 500);

    // Ordena por mes y toma los 12 valores del año
    const byMonth = new Array(12).fill(null);
    for (const d of serie.Data) {
      const m = (d.FK_Periodo ?? d.Mes ?? 0) - 1; // 1..12 → 0..11
      if (m >= 0 && m < 12 && d.Anyo === year) byMonth[m] = d.Valor;
    }
    const values = byMonth.filter((v) => v != null);
    if (values.length < 12) return json({ error: 'Año incompleto en INE', got: values.length }, 500);

    const mean = byMonth.reduce((a, b) => a + b, 0) / 12;
    const seasonality = byMonth.map((v) => Math.round((v / mean) * 1000) / 1000);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await supabase.from('market_data').upsert({
      id: 'spain',
      seasonality,
      source: 'INE — Pernoctaciones en alojamientos turísticos (EOT)',
      period: String(year),
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, year, seasonality });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

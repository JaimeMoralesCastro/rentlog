import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase.js';
import { parseExpenseText } from '../finance/nlpParser.js';
import { parseIcal } from '../finance/icalParser.js';
import { SAMPLE_ICAL } from '../lib/sampleIcal.js';
import { DEMO_PROPERTIES, DEMO_RESERVATIONS, DEMO_EXPENSES, DEMO_HISTORY, DEMO_REVIEWS } from '../lib/demoData.js';
import { analyzeReview } from '../finance/reviewSentiment.js';

// Hook central: carga propiedades, reservas y gastos del usuario.
// En modo demo devuelve los datos de ejemplo y opera en memoria.
export function useRentlogData(userId) {
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!isConfigured) {
      setProperties(DEMO_PROPERTIES);
      setReservations([...DEMO_RESERVATIONS, ...DEMO_HISTORY]);
      setExpenses(DEMO_EXPENSES);
      setReviews(DEMO_REVIEWS);
      setLoading(false);
      return;
    }
    if (!userId) return;
    const [p, r, e, rv] = await Promise.all([
      supabase.from('properties').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('reservations').select('*').eq('user_id', userId),
      supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('reviews').select('*').eq('user_id', userId).order('review_date', { ascending: false }),
    ]);
    const err = p.error || r.error || e.error || rv.error;
    if (err) setDbError(err.message); else setDbError(null);
    setProperties(p.data ?? []);
    setReservations(r.data ?? []);
    setExpenses(e.data ?? []);
    setReviews(rv.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Añadir gasto desde texto/voz (usa el parser NLP de Gastolens)
  const addExpenseFromText = async (text, propertyId) => {
    const parsed = parseExpenseText(text);
    const row = {
      property_id: propertyId ?? null,
      amount: parsed.amount,
      original_amount: parsed.originalAmount,
      currency: parsed.currency,
      category: parsed.category,
      subcategory: parsed.subcategory,
      description: parsed.description,
      raw_text: parsed.rawText,
      is_deductible: parsed.isDeductible,
      date: parsed.date,
    };

    if (!isConfigured) {
      setExpenses(prev => [{ id: crypto.randomUUID(), ...row }, ...prev]);
      return parsed;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...row, user_id: userId })
      .select()
      .single();
    if (error) { setDbError(error.message); return null; }
    setExpenses(prev => [data, ...prev]);
    return parsed;
  };

  const deleteExpense = async (id) => {
    if (isConfigured) await supabase.from('expenses').delete().eq('id', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Importación en lote de gastos (p. ej. desde banca — Fase D). `source` y
  // `bank_tx_id` son columnas reales de `expenses` (schema-phase-d): se persisten
  // ambas. `bank_tx_id` con índice único garantiza el dedupe al reconectar.
  const importExpenses = async (rows = []) => {
    if (!isConfigured) {
      const created = rows.map(r => ({ id: crypto.randomUUID(), ...r }));
      setExpenses(prev => [...created, ...prev]);
      return { inserted: created.length, error: null };
    }
    const payload = rows.map(r => ({ ...r, user_id: userId }));
    const { data, error } = await supabase.from('expenses').insert(payload).select();
    if (error) { setDbError(error.message); return { inserted: 0, error: error.message }; }
    setExpenses(prev => [...(data ?? []), ...prev]);
    return { inserted: data?.length ?? 0, error: null };
  };

  // ── Propiedades (CRUD) ──────────────────────────────────────────────────
  const saveProperty = async (prop) => {
    if (!isConfigured) {
      if (prop.id) {
        setProperties(prev => prev.map(p => (p.id === prop.id ? { ...p, ...prop } : p)));
        return prop;
      }
      const created = { ...prop, id: crypto.randomUUID() };
      setProperties(prev => [...prev, created]);
      return created;
    }

    if (prop.id) {
      const { id, ...rest } = prop;
      const { data, error } = await supabase.from('properties').update(rest).eq('id', id).select().single();
      if (error) { setDbError(error.message); return null; }
      setProperties(prev => prev.map(p => (p.id === id ? data : p)));
      return data;
    }
    const { data, error } = await supabase.from('properties').insert({ ...prop, user_id: userId }).select().single();
    if (error) { setDbError(error.message); return null; }
    setProperties(prev => [...prev, data]);
    return data;
  };

  const deleteProperty = async (id) => {
    if (isConfigured) await supabase.from('properties').delete().eq('id', id);
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  // ── Reservas (alta manual e importación) ────────────────────────────────
  const saveReservation = async (res) => {
    const nights = Math.max(
      Math.round((new Date(res.check_out) - new Date(res.check_in)) / 86400000), 0
    );
    const row = { ...res, nights };

    if (!isConfigured) {
      if (res.id) {
        setReservations(prev => prev.map(r => (r.id === res.id ? { ...r, ...row } : r)));
        return row;
      }
      const created = { ...row, id: crypto.randomUUID() };
      setReservations(prev => [created, ...prev]);
      return created;
    }

    if (res.id) {
      const { id, nights: _n, ...rest } = row; // nights es columna generada en BBDD
      const { data, error } = await supabase.from('reservations').update(rest).eq('id', id).select().single();
      if (error) { setDbError(error.message); return null; }
      setReservations(prev => prev.map(r => (r.id === id ? data : r)));
      return data;
    }
    const { nights: _n, ...insert } = row;
    const { data, error } = await supabase.from('reservations').insert({ ...insert, user_id: userId }).select().single();
    if (error) { setDbError(error.message); return null; }
    setReservations(prev => [data, ...prev]);
    return data;
  };

  const deleteReservation = async (id) => {
    if (isConfigured) await supabase.from('reservations').delete().eq('id', id);
    setReservations(prev => prev.filter(r => r.id !== id));
  };

  // Importación en lote (CSV / iCal). Inserta todas y refresca.
  const importReservations = async (rows) => {
    const withNights = rows.map(r => ({
      ...r,
      nights: Math.max(Math.round((new Date(r.check_out) - new Date(r.check_in)) / 86400000), 0),
    }));

    if (!isConfigured) {
      const created = withNights.map(r => ({ ...r, id: crypto.randomUUID() }));
      setReservations(prev => [...created, ...prev]);
      return { inserted: created.length, error: null };
    }

    const payload = withNights.map(({ nights, ...r }) => ({ ...r, user_id: userId }));
    const { data, error } = await supabase.from('reservations').insert(payload).select();
    if (error) { setDbError(error.message); return { inserted: 0, error: error.message }; }
    setReservations(prev => [...(data ?? []), ...prev]);
    return { inserted: data?.length ?? 0, error: null };
  };

  // ── Sincronización de calendarios (iCal) ────────────────────────────────
  // Trae las reservas automáticamente desde Airbnb/Booking. Dedupe por
  // external_uid: re-sincronizar no crea duplicados.
  const syncProperty = async (property) => {
    if (!property?.ical_airbnb_url && !property?.ical_booking_url) {
      return { inserted: 0, error: 'Esta propiedad no tiene ningún calendario conectado.' };
    }

    // Producción: una Edge Function hace el fetch (el navegador no puede por CORS)
    if (isConfigured) {
      const { data, error } = await supabase.functions.invoke('sync-ical', {
        body: { property_id: property.id },
      });
      if (error) { setDbError(error.message); return { inserted: 0, error: error.message }; }
      await fetchAll();
      return { inserted: data?.inserted ?? 0, error: null };
    }

    // Demo: parseamos un iCal de ejemplo (simula el de Airbnb) en memoria.
    const parsed = parseIcal(SAMPLE_ICAL, { source: 'Airbnb', propertyId: property.id });
    const existing = new Set(reservations.map(r => r.external_uid).filter(Boolean));
    const nuevas = parsed
      .filter(r => !existing.has(r.external_uid))
      .map(r => ({
        ...r,
        id: crypto.randomUUID(),
        nights: Math.max(Math.round((new Date(r.check_out) - new Date(r.check_in)) / 86400000), 0),
        guest_name: r.guest_name || 'Reserva Airbnb',
      }));

    if (nuevas.length) setReservations(prev => [...nuevas, ...prev]);
    setProperties(prev => prev.map(p => (p.id === property.id ? { ...p, last_sync_at: new Date().toISOString() } : p)));
    return { inserted: nuevas.length, error: null };
  };

  // ── Reseñas ─────────────────────────────────────────────────────────────
  const saveReview = async (review) => {
    const analysis = analyzeReview(review.text, review.rating);
    const row = {
      property_id: review.property_id ?? null,
      guest_name: review.guest_name ?? '',
      rating: review.rating != null ? Number(review.rating) : null,
      text: review.text ?? '',
      aspects: analysis.aspects,
      sentiment: analysis.sentiment,
      review_date: review.review_date ?? new Date().toISOString().slice(0, 10),
    };

    if (!isConfigured) {
      const created = { id: crypto.randomUUID(), ...row };
      setReviews(prev => [created, ...prev]);
      return created;
    }
    const { data, error } = await supabase.from('reviews').insert({ ...row, user_id: userId }).select().single();
    if (error) { setDbError(error.message); return null; }
    setReviews(prev => [data, ...prev]);
    return data;
  };

  const deleteReview = async (id) => {
    if (isConfigured) await supabase.from('reviews').delete().eq('id', id);
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  // Importación masiva de reseñas (pegar varias / subir archivo). Analiza cada
  // una al vuelo y las inserta todas.
  const importReviews = async (items) => {
    const rows = items
      .filter(it => (it.text || '').trim())
      .map(it => {
        const analysis = analyzeReview(it.text, it.rating ?? null);
        return {
          property_id: it.property_id ?? null,
          guest_name: it.guest_name ?? '',
          rating: it.rating != null ? Number(it.rating) : null,
          text: it.text.trim(),
          aspects: analysis.aspects,
          sentiment: analysis.sentiment,
          review_date: it.review_date ?? new Date().toISOString().slice(0, 10),
        };
      });
    if (rows.length === 0) return { inserted: 0, error: null };

    if (!isConfigured) {
      const created = rows.map(r => ({ id: crypto.randomUUID(), ...r }));
      setReviews(prev => [...created, ...prev]);
      return { inserted: created.length, error: null };
    }
    const { data, error } = await supabase.from('reviews').insert(rows.map(r => ({ ...r, user_id: userId }))).select();
    if (error) { setDbError(error.message); return { inserted: 0, error: error.message }; }
    setReviews(prev => [...(data ?? []), ...prev]);
    return { inserted: data?.length ?? 0, error: null };
  };

  return {
    properties, reservations, expenses, reviews, loading, dbError,
    addExpenseFromText, deleteExpense, importExpenses,
    saveProperty, deleteProperty,
    saveReservation, deleteReservation, importReservations,
    syncProperty,
    saveReview, deleteReview, importReviews,
    refetch: fetchAll,
  };
}

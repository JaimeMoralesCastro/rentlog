// ============================================================================
//  Premium · flag is_premium + checkout
//
//  Demo (sin Supabase): flag en localStorage, activable desde el propio
//  paywall con "Probar Premium" para validar el flujo end-to-end.
//
//  Producción: is_premium vive en `profiles` (ver schema-connector.sql) y lo
//  activa la Edge Function stripe-webhook al completarse el checkout. El
//  checkout usa un Stripe Payment Link (sin backend propio): URL en
//  VITE_STRIPE_PAYMENT_LINK. ⚠ Requiere claves de Stripe del usuario.
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from './supabase.js';

const LS_KEY = 'rentlog_premium';

export function useIsPremium(userId) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isConfigured) {
      setIsPremium(localStorage.getItem(LS_KEY) === '1');
      setLoading(false);
      return;
    }
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('is_premium').eq('user_id', userId).maybeSingle();
    setIsPremium(Boolean(data?.is_premium));
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Solo demo: simula la activación para probar el flujo completo sin Stripe.
  const activateDemo = () => {
    localStorage.setItem(LS_KEY, '1');
    setIsPremium(true);
  };

  return { isPremium, loading, refresh, activateDemo };
}

// Lanza el checkout de Stripe (Payment Link). En demo no hay URL → null.
export function startCheckout() {
  const url = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
  if (!url) return null;
  window.open(url, '_blank', 'noopener');
  return url;
}

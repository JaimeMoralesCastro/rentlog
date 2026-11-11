// ============================================================================
//  Supabase Edge Function · stripe-webhook (esqueleto — Bloque 5, paywall)
//  Recibe eventos de Stripe y activa/desactiva is_premium en `profiles`.
//
//  ⚠ REQUIERE INTERVENCIÓN DEL USUARIO (claves de Stripe):
//   1. Crear producto "Rentlog Premium" (19-29 €/mes) + Payment Link en Stripe.
//      El Payment Link debe pedir email y pasar client_reference_id = user_id
//      (añadir ?client_reference_id={USER_ID} a la URL desde la app).
//   2. supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//   3. Configurar el webhook en Stripe → apuntando a esta función, eventos:
//      checkout.session.completed · customer.subscription.deleted
//   4. VITE_STRIPE_PAYMENT_LINK=<url> en el .env del frontend.
//
//  Desplegar: supabase functions deploy stripe-webhook --no-verify-jwt
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Verificación de firma de Stripe (usar stripe-deno en producción; aquí
    // se comprueba presencia del header como mínimo viable del esqueleto).
    const sig = req.headers.get('stripe-signature');
    if (!sig || !Deno.env.get('STRIPE_WEBHOOK_SECRET')) {
      return new Response('Firma no verificable — configurar STRIPE_WEBHOOK_SECRET', { status: 400 });
    }

    const event = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (event.type === 'checkout.session.completed') {
      const userId = event.data?.object?.client_reference_id;
      if (userId) {
        await admin.from('profiles').upsert({ user_id: userId, is_premium: true });
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const userId = event.data?.object?.metadata?.user_id;
      if (userId) {
        await admin.from('profiles').update({ is_premium: false }).eq('user_id', userId);
      }
    }
    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});

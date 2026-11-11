// ============================================================================
//  Crea 5 USUARIOS DE PRUEBA que entran a la app sin necesitar un buzón real y
//  ven la misma demo completa (3 pisos, reservas, gastos, reseñas, guías).
//
//  El "email" es solo el identificador de login: usamos alias de tu Gmail
//  (tester+N@example.com), válidos pero que los testers no necesitan
//  abrir. Los usuarios se crean CONFIRMADOS para que entren directos.
//
//  Uso:  node scripts/seed-testers.mjs
//  Requisitos en .env:
//    · VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (siempre)
//    · SUPABASE_SERVICE_ROLE_KEY (recomendado): crea los usuarios ya confirmados
//      vía Admin API, funcione o no el "Confirm email".
//    · Sin service role, se usa el método anón: SOLO funciona si "Confirm email"
//      está DESACTIVADO en Supabase (Authentication → Sign In / Providers → Email).
//
//  Idempotente: re-ejecutar reutiliza los usuarios y vuelve a sembrar limpio.
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import { loadEnv, seedForUser } from './lib/seedDataset.mjs';

const PASSWORD = process.env.SEED_PASSWORD || 'ChangeMe2026';
const TESTERS = [1, 2, 3, 4, 5].map(n => ({
  email: `tester${n}@rentlog.app`,
  name: `Tester ${n}`,
}));

class NeedsConfirm extends Error {}

// Busca el id de un usuario por email recorriendo las páginas de la Admin API.
async function findUserIdByEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const u = data.users.find(x => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (data.users.length < 200) break;
  }
  return null;
}

// ── Vía Admin API (service role): crea/actualiza el usuario ya confirmado ────
async function ensureUserAdmin(admin, t) {
  const { data, error } = await admin.auth.admin.createUser({
    email: t.email, password: PASSWORD, email_confirm: true,
    user_metadata: { display_name: t.name },
  });
  if (!error) return data.user.id;
  if (/already|exists|registered/i.test(error.message)) {
    const id = await findUserIdByEmail(admin, t.email);
    if (id) await admin.auth.admin.updateUserById(id, { password: PASSWORD, email_confirm: true });
    return id;
  }
  throw new Error(`crear ${t.email}: ${error.message}`);
}

// ── Vía anón (sin service role): registra/inicia sesión como el tester ───────
async function ensureUserAnon(supa, t) {
  const signIn = await supa.auth.signInWithPassword({ email: t.email, password: PASSWORD });
  if (!signIn.error) return signIn.data.user.id;
  if (/Email not confirmed/i.test(signIn.error.message)) throw new NeedsConfirm();

  const signUp = await supa.auth.signUp({
    email: t.email, password: PASSWORD, options: { data: { display_name: t.name } },
  });
  if (signUp.error) throw new Error(`registrar ${t.email}: ${signUp.error.message}`);
  if (!signUp.data.session) throw new NeedsConfirm();
  return signUp.data.user.id;
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) {
    console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env');
    process.exit(1);
  }

  const useAdmin = Boolean(service);
  console.log(useAdmin
    ? '→ Modo Admin API (service role): los usuarios se crean confirmados.'
    : '→ Modo anón: requiere "Confirm email" DESACTIVADO en Supabase.');

  const admin = useAdmin
    ? createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  const supa = useAdmin ? null : createClient(url, anon, { auth: { persistSession: false } });

  for (const t of TESTERS) {
    try {
      let userId, client;
      if (useAdmin) {
        userId = await ensureUserAdmin(admin, t);
        client = admin;                 // service role: escribe saltándose RLS
      } else {
        userId = await ensureUserAnon(supa, t);
        client = supa;                  // sesión del propio tester: RLS OK
      }
      if (!userId) throw new Error(`no pude obtener el id de ${t.email}`);

      const s = await seedForUser(client, userId);
      console.log(`  ✔ ${t.email} → ${s.properties} pisos · ${s.reservations} reservas · ${s.expenses} gastos · ${s.reviews} reseñas · ${s.guidebooks} guías`);

      if (!useAdmin) await supa.auth.signOut();
    } catch (e) {
      if (e instanceof NeedsConfirm) {
        console.error(`\n⛔ ${t.email}: Supabase exige CONFIRMAR el email.`);
        console.error('   Opción A: desactiva "Confirm email" (Authentication → Sign In / Providers → Email) y reejecuta.');
        console.error('   Opción B: añade SUPABASE_SERVICE_ROLE_KEY al .env (Project Settings → API) y reejecuta.\n');
        process.exit(2);
      }
      console.error(`Error con ${t.email}:`, e.message);
      process.exit(1);
    }
  }

  console.log('\n✅ 5 usuarios de prueba listos. Reparte estas credenciales:');
  for (const t of TESTERS) console.log(`   ${t.email}   ·   ${PASSWORD}`);
  console.log('\n   Cada uno ve su propia copia de la demo (3 pisos y todas las prestaciones).');
}

main().catch(err => { console.error(err); process.exit(1); });

// Envía un correo de recuperación de contraseña para probar el SMTP + plantilla.
// Uso: node scripts/test-reset-email.mjs [email]
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const email = process.argv[2] || 'demo@example.com';
const supa = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const { error } = await supa.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://rentlog-two.vercel.app',
});
if (error) {
  console.error('⛔ Error al enviar:', error.message);
  process.exit(1);
}
console.log(`✅ Solicitud de recuperación enviada a ${email}. Revisa la bandeja (y spam).`);

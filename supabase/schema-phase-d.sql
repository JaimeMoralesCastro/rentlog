-- ============================================================================
--  Fase D — Gastos por Open Banking (AISP, Enable Banking) · "listo para conectar"
--  En modo demo/sandbox todo va en memoria + localStorage (qué transacciones se
--  importaron, para dedupe). Estas piezas son el destino en producción.
--
--  Requiere schema.sql (tabla `expenses`). Ejecutar en el SQL Editor cuando el
--  proyecto Supabase esté activo. La conexión real de Enable Banking NO se hace
--  desde el cliente: una Edge Function firma el JWT con la clave privada de la
--  app (patrón de sync-connector). Aquí no hay ninguna credencial.
-- ============================================================================

-- ── Dedupe de cargos bancarios ─────────────────────────────────────────────
-- Marca de qué transacción bancaria vino un gasto, para no importarla dos veces.
alter table public.expenses add column if not exists source text;         -- 'manual' | 'voice' | 'bank'
alter table public.expenses add column if not exists bank_tx_id text;     -- id de la transacción en el banco

-- Un mismo cargo no puede importarse dos veces para el mismo usuario.
create unique index if not exists expenses_user_bank_tx_uidx
  on public.expenses (user_id, bank_tx_id)
  where bank_tx_id is not null;

-- ── Consentimientos AISP (una fila por banco conectado) ────────────────────
-- El token/sesión de Enable Banking es sensible: se guarda cifrado y solo lo
-- lee la Edge Function (mismo patrón que connector_accounts de la Fase B).
create table if not exists public.bank_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null default 'enablebanking',
  bank_id       text,                    -- aspsp (p. ej. 'bbva')
  bank_name     text,
  session_ref   text,                    -- referencia de sesión/consentimiento
  consent_expires_at timestamptz,        -- Enable Banking: consentimiento 90 días
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  unique (user_id, provider, bank_id)
);
alter table public.bank_connections enable row level security;
create policy "bank_connections_owner_all" on public.bank_connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nota: el refresh/registro de consentimiento y la firma JWT viven en una Edge
-- Function con la clave privada de la app en secretos de Supabase, nunca aquí.

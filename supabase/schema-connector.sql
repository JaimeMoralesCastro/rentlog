-- ============================================================================
--  RENTLOG · Extensión de esquema — Connector (Fase B) + Premium
--  Ejecutar en Supabase → SQL Editor DESPUÉS de schema.sql.
-- ============================================================================

-- ── PROFILES — flags por usuario (paywall Premium) ──────────────────────────
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  is_premium  boolean default false,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own_profile_select" on public.profiles;
create policy "own_profile_select" on public.profiles for select using (auth.uid() = user_id);
-- is_premium solo lo escribe el servidor (stripe-webhook con service role); sin policy de insert/update.

-- ── CONNECTOR_ACCOUNTS — cuenta del channel manager por usuario ─────────────
--  El refresh token se guarda CIFRADO (pgp_sym_encrypt) con una clave que solo
--  conocen las Edge Functions (secret CONNECTOR_ENC_KEY). El cliente jamás lo lee.
create table if not exists public.connector_accounts (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  provider           text not null,                    -- 'beds24' | ...
  refresh_token_enc  bytea not null,                   -- pgp_sym_encrypt(token, key)
  connected_at       timestamptz default now(),
  last_sync_at       timestamptz
);
alter table public.connector_accounts enable row level security;
-- Sin policies para anon/authenticated: SOLO service role (Edge Functions) accede.
drop policy if exists "own_connector_meta" on public.connector_accounts;
create policy "own_connector_meta" on public.connector_accounts
  for select using (auth.uid() = user_id);
-- (el select del cliente solo sirve para saber si hay conexión; el token es bytea cifrado)

-- ── PROPERTIES — columnas del connector ─────────────────────────────────────
alter table public.properties add column if not exists connected_via         text;  -- 'Beds24' → badge UI
alter table public.properties add column if not exists external_property_id  text;  -- '<provider>-<id>' (dedupe)
create unique index if not exists uq_properties_external
  on public.properties(user_id, external_property_id) where external_property_id is not null;

-- ── RPCs de cifrado (usadas por la Edge Function sync-connector) ────────────
--  security definer: solo ejecutables vía service role; el cliente no las llama.
create or replace function public.connector_store_token(p_user_id uuid, p_provider text, p_token text, p_key text)
returns void language sql security definer set search_path = public as $$
  insert into public.connector_accounts (user_id, provider, refresh_token_enc)
  values (p_user_id, p_provider, pgp_sym_encrypt(p_token, p_key))
  on conflict (user_id) do update
    set provider = excluded.provider, refresh_token_enc = excluded.refresh_token_enc;
$$;
revoke execute on function public.connector_store_token from public, anon, authenticated;

create or replace function public.connector_read_token(p_user_id uuid, p_key text)
returns table(provider text, token text) language sql security definer set search_path = public as $$
  select provider, pgp_sym_decrypt(refresh_token_enc, p_key)
  from public.connector_accounts where user_id = p_user_id;
$$;
revoke execute on function public.connector_read_token from public, anon, authenticated;

-- ============================================================================
--  RENTLOG · Extensión de esquema — Puente "Conecta tu correo" (Gmail)
--  Ejecutar en Supabase → SQL Editor DESPUÉS de schema.sql.
--
--  El refresh token de Gmail se guarda CIFRADO (pgp_sym_encrypt) con una clave
--  que solo conocen las Edge Functions (secret GMAIL_ENC_KEY). El navegador
--  jamás lo lee: solo sabe si hay conexión y con qué correo.
-- ============================================================================
create extension if not exists pgcrypto;

-- ── GMAIL_ACCOUNTS — cuenta de correo conectada por usuario ──────────────────
create table if not exists public.gmail_accounts (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  email              text,                              -- buzón conectado (para mostrar)
  refresh_token_enc  bytea not null,                    -- pgp_sym_encrypt(refresh_token, key)
  connected_at       timestamptz default now(),
  last_sync_at       timestamptz
);
alter table public.gmail_accounts enable row level security;
-- El cliente puede VER si hay conexión y BORRARLA (desconectar); el token va cifrado.
drop policy if exists "own_gmail_select" on public.gmail_accounts;
create policy "own_gmail_select" on public.gmail_accounts for select using (auth.uid() = user_id);
drop policy if exists "own_gmail_delete" on public.gmail_accounts;
create policy "own_gmail_delete" on public.gmail_accounts for delete using (auth.uid() = user_id);
-- El token SOLO lo escribe el servidor (service role) vía RPC: sin policy de insert/update.

-- ── GMAIL_OAUTH_STATES — anti-CSRF + mapa state→usuario para el callback ─────
create table if not exists public.gmail_oauth_states (
  state       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz default now()
);
alter table public.gmail_oauth_states enable row level security;
-- El usuario crea su propio state antes de abrir el consentimiento de Google.
drop policy if exists "own_state_insert" on public.gmail_oauth_states;
create policy "own_state_insert" on public.gmail_oauth_states
  for insert with check (auth.uid() = user_id);
-- El callback (service role) lo lee y lo borra; sin policy de select/delete para el cliente.

-- ── RPCs de cifrado (usadas por las Edge Functions gmail-*) ──────────────────
create or replace function public.gmail_store_token(p_user_id uuid, p_email text, p_token text, p_key text)
returns void language sql security definer set search_path = public as $$
  insert into public.gmail_accounts (user_id, email, refresh_token_enc)
  values (p_user_id, p_email, pgp_sym_encrypt(p_token, p_key))
  on conflict (user_id) do update
    set email = excluded.email, refresh_token_enc = excluded.refresh_token_enc, connected_at = now();
$$;
revoke execute on function public.gmail_store_token from public, anon, authenticated;

create or replace function public.gmail_read_token(p_user_id uuid, p_key text)
returns table(email text, token text) language sql security definer set search_path = public as $$
  select email, pgp_sym_decrypt(refresh_token_enc, p_key)
  from public.gmail_accounts where user_id = p_user_id;
$$;
revoke execute on function public.gmail_read_token from public, anon, authenticated;

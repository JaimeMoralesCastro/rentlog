-- ============================================================================
--  Fase C — Persistencia de las features de absorción.
--  En modo demo todo esto vive en localStorage; estas tablas son el destino
--  "listo para conectar" cuando el proyecto Supabase esté activo.
--  (El calendario de limpieza tiene su propio archivo: schema-cleaning.sql.)
--
--  Ejecutar en el SQL Editor de Supabase. Requiere que schema.sql ya exista
--  (properties, reservations, reviews).
-- ============================================================================

-- ── C3 · Guidebook por piso ────────────────────────────────────────────────
create table if not exists public.guidebooks (
  property_id  uuid primary key references public.properties(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  content      jsonb not null default '{}',   -- estructura de finance/guidebook.js
  public_slug  text unique,                    -- rentlog.app/g/<slug>
  is_published boolean not null default false,
  updated_at   timestamptz not null default now()
);
alter table public.guidebooks enable row level security;
create policy "guidebooks_owner_all" on public.guidebooks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Lectura pública solo de las guías publicadas (para la URL del huésped):
create policy "guidebooks_public_read" on public.guidebooks for select
  using (is_published = true);

-- ── C4 · Plantillas de mensajería ──────────────────────────────────────────
create table if not exists public.message_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  moment     text,                              -- cuándo enviarla (para automatizar)
  body       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.message_templates enable row level security;
create policy "message_templates_owner_all" on public.message_templates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── C2 · Tarifas por noche (overrides del anfitrión) ───────────────────────
create table if not exists public.nightly_rates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  night       date not null,
  price       numeric(10,2) not null,
  source      text not null default 'manual',   -- manual | suggested | pushed
  updated_at  timestamptz not null default now(),
  unique (property_id, night)
);
alter table public.nightly_rates enable row level security;
create policy "nightly_rates_owner_all" on public.nightly_rates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists nightly_rates_prop_night_idx on public.nightly_rates (property_id, night);

-- ── C5 · Web / landing por piso ────────────────────────────────────────────
-- Reutiliza properties + guidebooks + reviews. Solo añade estado de publicación.
alter table public.properties add column if not exists landing_published boolean not null default false;
alter table public.properties add column if not exists landing_slug text unique;
alter table public.properties add column if not exists min_rate numeric(10,2);  -- suelo de precio (C2)

-- La reserva directa con pago (Stripe) es un paso posterior: requiere el
-- Payment Link / Checkout del usuario. Ver stripe-webhook (Fase B) como base.

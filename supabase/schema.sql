-- ============================================================================
--  RENTLOG · Esquema unificado (Postgres / Supabase)
--  Absorbe el modelo `expenses` de Gastolens y lo conecta a propiedades.
--  Ejecutar en: Supabase → SQL Editor.
-- ============================================================================

-- ── Extensiones ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ============================================================================
--  PROPERTIES — los pisos del anfitrión
-- ============================================================================
create table if not exists public.properties (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  address             text,
  city                text,
  bedrooms            smallint default 1,
  capacity            smallint default 2,
  zone_type           text default 'Ciudad',          -- Playa | Ciudad | Montaña | Rural (estacionalidad de pricing)
  platform            text default 'Airbnb',          -- Airbnb | Booking | Vrbo | Directo
  fixed_monthly_cost  numeric(10,2) default 0,         -- hipoteca/comunidad/seguro (para break-even)
  base_rate           numeric(10,2) default 0,         -- tarifa por noche de referencia
  -- ── Overrides de estimación de costes (NULL = usar estimación automática) ──
  est_cleaning_per_stay     numeric(10,2),             -- limpieza por estancia
  est_maintenance_per_night numeric(10,2),             -- conservación por noche
  est_consumables_per_stay  numeric(10,2),             -- consumibles por estancia
  est_utilities_per_night   numeric(10,2),             -- suministros por noche
  -- ── Conexión de canales (sincronización automática de reservas) ──
  ical_airbnb_url     text,                            -- URL de exportación iCal de Airbnb
  ical_booking_url    text,                            -- URL de exportación iCal de Booking
  last_sync_at        timestamptz,                     -- última sincronización de calendarios
  active              boolean default true,
  created_at          timestamptz default now()
);

-- ============================================================================
--  RESERVATIONS — reservas (importadas por CSV o canal)
-- ============================================================================
create table if not exists public.reservations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  property_id     uuid not null references public.properties(id) on delete cascade,
  external_uid    text,                                 -- UID del evento iCal (dedupe al sincronizar)
  guest_name      text,
  source          text default 'Airbnb',               -- canal de la reserva
  check_in        date not null,
  check_out       date not null,
  nights          integer generated always as (greatest((check_out - check_in), 0)) stored,
  gross_income    numeric(10,2) default 0,              -- ingreso bruto cobrado al huésped
  channel_fee     numeric(10,2) default 0,              -- comisión de la plataforma
  cleaning_fee    numeric(10,2) default 0,              -- limpieza cobrada al huésped
  status          text default 'confirmed',             -- confirmed | cancelled | completed
  created_at      timestamptz default now()
);

-- ============================================================================
--  EXPENSES — tabla heredada de Gastolens + vínculo a propiedad
--  (columnas originales conservadas para reutilizar el parser NLP tal cual)
-- ============================================================================
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  property_id     uuid references public.properties(id) on delete set null, -- ◄ NUEVO
  reservation_id  uuid references public.reservations(id) on delete set null, -- gasto ligado a reserva (opcional)
  amount          numeric(10,2) not null,
  original_amount numeric(10,2),
  currency        text default 'EUR',
  category        text,
  subcategory     text,
  description     text,
  raw_text        text,
  is_deductible   boolean default true,                 -- ◄ NUEVO (informe fiscal)
  date            timestamptz default now(),
  created_at      timestamptz default now()
);

-- ============================================================================
--  REVIEWS — reseñas para analítica de sentimiento
-- ============================================================================
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  property_id     uuid not null references public.properties(id) on delete cascade,
  reservation_id  uuid references public.reservations(id) on delete set null,
  rating          numeric(2,1),                          -- 1.0 .. 5.0
  text            text,
  aspects         jsonb default '{}'::jsonb,             -- {limpieza: 5, ubicacion: 4, ...}
  sentiment       numeric(3,2),                          -- -1.0 .. 1.0 (calculado)
  review_date     date default now(),
  created_at      timestamptz default now()
);

-- ── Índices ─────────────────────────────────────────────────────────────────
create index if not exists idx_reservations_property on public.reservations(property_id);
create index if not exists idx_reservations_dates    on public.reservations(check_in, check_out);
-- Evita reservas duplicadas al re-sincronizar el mismo evento de iCal
create unique index if not exists uq_reservations_external on public.reservations(user_id, external_uid) where external_uid is not null;
create index if not exists idx_expenses_property     on public.expenses(property_id);
create index if not exists idx_expenses_date         on public.expenses(date);
create index if not exists idx_reviews_property      on public.reviews(property_id);

-- ============================================================================
--  ROW LEVEL SECURITY — cada usuario sólo ve lo suyo (multi-tenant)
-- ============================================================================
alter table public.properties   enable row level security;
alter table public.reservations enable row level security;
alter table public.expenses     enable row level security;
alter table public.reviews      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['properties','reservations','expenses','reviews'] loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);

    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id);', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ============================================================================
--  MARKET_DATA — snapshot de datos de mercado del INE (refrescado por la
--  Edge Function refresh-market). Fila única global compartida por todos.
-- ============================================================================
create table if not exists public.market_data (
  id           text primary key default 'spain',
  seasonality  jsonb,                 -- índice estacional nacional (12 meses)
  anchors      jsonb,                 -- { adr, revpar, occupancy }
  source       text,
  period       text,
  updated_at   timestamptz default now()
);
alter table public.market_data enable row level security;
drop policy if exists "market_read" on public.market_data;
create policy "market_read" on public.market_data for select using (true); -- lectura pública (datos agregados, no personales)

-- ============================================================================
--  VISTA — KPIs mensuales por propiedad (ocupación, ADR, ingresos)
--  Sirve de base para el dashboard sin recalcular en el cliente.
-- ============================================================================
create or replace view public.monthly_property_kpis as
select
  r.user_id,
  r.property_id,
  date_trunc('month', r.check_in)::date            as month,
  count(*)                                          as bookings,
  coalesce(sum(r.nights), 0)                        as booked_nights,
  coalesce(sum(r.gross_income), 0)                  as gross_income,
  coalesce(sum(r.channel_fee), 0)                   as channel_fees,
  case when sum(r.nights) > 0
       then round(sum(r.gross_income) / sum(r.nights), 2)
       else 0 end                                   as adr
from public.reservations r
where r.status <> 'cancelled'
group by r.user_id, r.property_id, date_trunc('month', r.check_in);

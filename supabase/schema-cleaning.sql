-- ============================================================================
--  C1 — Calendario de limpieza (sustituye a Turno).
--  Las tareas de limpieza se DERIVAN de las reservas en el cliente
--  (src/finance/cleaning.js). Esta tabla solo persiste lo que el anfitrión
--  edita: estado (hecha/pendiente), limpiador asignado y notas. Así, si cambia
--  una reserva, la agenda se recalcula sola y el estado guardado se re-asocia
--  por reservation_id.
--
--  Ejecutar en el SQL Editor de Supabase cuando el proyecto esté activo.
-- ============================================================================

create table if not exists public.cleaning_tasks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  property_id    uuid references public.properties(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'done')),
  cleaner        text,
  notes          text,
  done_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, reservation_id)
);

alter table public.cleaning_tasks enable row level security;

create policy "cleaning_tasks_owner_all"
  on public.cleaning_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists cleaning_tasks_user_idx on public.cleaning_tasks (user_id);

-- Futuro: acceso del equipo de limpieza (rol 'cleaner') con una tabla puente
-- property_cleaners(user_id, cleaner_email) + política que permita leer/confirmar
-- solo las tareas de las propiedades asignadas. Fuera del alcance del MVP.

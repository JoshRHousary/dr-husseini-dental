-- Dr. Jihad S. Husseini — booking backend schema.
-- Paste the whole file into the Supabase SQL editor of THIS PROJECT'S OWN
-- Supabase project and run it once. Safe to re-run.

-- ── Status vocabulary ───────────────────────────────────────────────────────
do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

-- ── Requests ────────────────────────────────────────────────────────────────
create table if not exists public.appointment_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  slot_date   date not null,
  slot_time   time not null,

  name        text not null check (length(btrim(name)) between 2 and 120),
  phone       text not null check (length(btrim(phone)) between 6 and 40),
  service     text          check (service in ('cosmetic', 'endodontic', 'implant', 'checkup', 'other')),
  notes       text          check (notes is null or length(notes) <= 1000),
  lang        text not null default 'en' check (lang in ('en', 'ar', 'fr')),

  status      appointment_status not null default 'pending',

  -- A slot can only be held once while it is live. Declined/cancelled rows drop
  -- out of the index so the slot frees up again.
  constraint slot_not_in_past check (slot_date >= date '2026-01-01')
);

create unique index if not exists appointment_requests_live_slot
  on public.appointment_requests (slot_date, slot_time)
  where status in ('pending', 'confirmed');

create index if not exists appointment_requests_slot_date
  on public.appointment_requests (slot_date);

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.appointment_requests enable row level security;

-- anon may create a request...
drop policy if exists anon_insert_request on public.appointment_requests;
create policy anon_insert_request
  on public.appointment_requests
  for insert to anon
  with check (
    status = 'pending'
    and slot_date >= current_date
    and slot_date <= current_date + interval '180 days'
  );

-- ...and read nothing at all from the table itself. Availability comes from the
-- view below, which carries no identifying columns.
drop policy if exists anon_read_slots on public.appointment_requests;
create policy anon_read_slots
  on public.appointment_requests
  for select to anon
  using (false);

-- ── Public availability: date + time only, never patient data ───────────────
-- anon cannot select the table, so availability comes from a security-definer
-- function that returns the two non-identifying columns, wrapped in a view so
-- the site can filter it over plain REST.
create or replace function public.booked_slots_in_range(from_date date, to_date date)
  returns table (slot_date date, slot_time time)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select a.slot_date, a.slot_time
  from public.appointment_requests a
  where a.status in ('pending', 'confirmed')
    and a.slot_date between from_date and to_date;
$$;

revoke all on function public.booked_slots_in_range(date, date) from public;
grant execute on function public.booked_slots_in_range(date, date) to anon, authenticated;

drop view if exists public.booked_slots;
create view public.booked_slots as
  select slot_date, slot_time
  from public.booked_slots_in_range(current_date, (current_date + interval '180 days')::date);

grant select on public.booked_slots to anon, authenticated;

-- ── Clinic notification ─────────────────────────────────────────────────────
-- Fires the Edge Function in backend/supabase/functions/notify-booking/ on each
-- new request. Needs the pg_net extension and two settings; see README.md.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_booking()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  fn_url  text := current_setting('app.notify_url', true);
  fn_key  text := current_setting('app.notify_key', true);
begin
  if fn_url is null or fn_key is null then
    return new; -- not configured yet: never block the insert
  end if;
  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || fn_key),
    body    := to_jsonb(new)
  );
  return new;
end $$;

drop trigger if exists trg_notify_new_booking on public.appointment_requests;
create trigger trg_notify_new_booking
  after insert on public.appointment_requests
  for each row execute function public.notify_new_booking();

-- ── Contact messages ────────────────────────────────────────────────────────
-- The Contact page form. Same shape of protection as appointment_requests:
-- anon may insert and read nothing.
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (length(btrim(name)) between 2 and 120),
  phone      text not null check (length(btrim(phone)) between 6 and 40),
  message    text not null check (length(btrim(message)) between 2 and 2000),
  lang       text not null default 'en' check (lang in ('en', 'ar', 'fr')),
  handled    boolean not null default false
);

alter table public.contact_messages enable row level security;

drop policy if exists anon_insert_message on public.contact_messages;
create policy anon_insert_message
  on public.contact_messages
  for insert to anon
  with check (handled = false);

drop policy if exists anon_read_messages on public.contact_messages;
create policy anon_read_messages
  on public.contact_messages
  for select to anon
  using (false);

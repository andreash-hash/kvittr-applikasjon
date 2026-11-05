-- Funnel events for the iOS app.
--
-- profiles only holds the end state, so it cannot say where people drop off.
-- These rows can: prompt shown, scan started, scan succeeded, signup prompt,
-- paywall shown, purchase. Written by the app, read only with the service role
-- (SQL editor / dashboards), never by clients.
--
-- user_id is ON DELETE SET NULL so deleting an anonymous or deleted account
-- does not erase the funnel history. props.install_id links events that were
-- recorded before a session existed.

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event text not null check (char_length(event) <= 64),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_events_event_created_idx on public.app_events (event, created_at desc);
create index if not exists app_events_user_idx on public.app_events (user_id);

alter table public.app_events enable row level security;

-- Signed-in users (including anonymous ones) may only write events about themselves.
drop policy if exists "Authenticated users insert own events" on public.app_events;
create policy "Authenticated users insert own events"
  on public.app_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Before any session exists (the first screen), events carry no user id.
drop policy if exists "Anon role inserts events without a user" on public.app_events;
create policy "Anon role inserts events without a user"
  on public.app_events
  for insert
  to anon
  with check (user_id is null);

-- No select/update/delete policies: clients cannot read events back.

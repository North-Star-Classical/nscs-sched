-- NSCS Schedule Planner — shared plan storage (authenticated users only)

create table if not exists public.plans (
  id          text primary key,
  name        text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

create table if not exists public.plan_autosaves (
  plan_id     text primary key references public.plans(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.plans enable row level security;
alter table public.plan_autosaves enable row level security;

drop policy if exists plans_select on public.plans;
drop policy if exists plans_insert on public.plans;
drop policy if exists plans_update on public.plans;
drop policy if exists plans_delete on public.plans;
drop policy if exists autosave_all on public.plan_autosaves;

create policy plans_select on public.plans for select to authenticated using (true);
create policy plans_insert on public.plans for insert to authenticated with check (true);
create policy plans_update on public.plans for update to authenticated using (true);
create policy plans_delete on public.plans for delete to authenticated using (true);

create policy autosave_all on public.plan_autosaves for all to authenticated using (true) with check (true);

create index if not exists plans_updated_at_idx on public.plans (updated_at desc);

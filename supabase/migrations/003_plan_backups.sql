-- Named JSON snapshots for on-demand backup / restore from the Plans tab

create table if not exists public.plan_backups (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  exported_at timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  data        jsonb not null
);

alter table public.plan_backups enable row level security;

drop policy if exists plan_backups_all on public.plan_backups;
create policy plan_backups_all on public.plan_backups for all to authenticated using (true) with check (true);

create index if not exists plan_backups_exported_at_idx on public.plan_backups (exported_at desc);

-- Normalize blocks and teachers into relational tables (per plan)

create table if not exists public.plan_blocks (
  plan_id     text not null references public.plans(id) on delete cascade,
  id          text not null,
  band        text,
  course      text not null,
  subject     text,
  days        jsonb not null default '[]',
  start_min   int not null,
  end_min     int not null,
  teacher     text,
  teacher2    text,
  room        text,
  anchor      boolean not null default false,
  staff       boolean not null default false,
  split_group text,
  grades      jsonb,
  extra       jsonb not null default '{}',
  sort_order  int not null default 0,
  primary key (plan_id, id)
);

create table if not exists public.plan_teachers (
  plan_id      text not null references public.plans(id) on delete cascade,
  id           text not null,
  name         text not null,
  rate         numeric,
  flat         numeric,
  status       text,
  subjects     jsonb not null default '[]',
  allowed_days jsonb,
  windows      jsonb,
  max_classes  int,
  virtual      boolean not null default false,
  note         text,
  sort_order   int not null default 0,
  primary key (plan_id, id)
);

create index if not exists plan_blocks_plan_id_idx on public.plan_blocks (plan_id);
create index if not exists plan_blocks_plan_start_idx on public.plan_blocks (plan_id, start_min);
create index if not exists plan_teachers_plan_id_idx on public.plan_teachers (plan_id);

alter table public.plan_blocks enable row level security;
alter table public.plan_teachers enable row level security;

drop policy if exists plan_blocks_all on public.plan_blocks;
drop policy if exists plan_teachers_all on public.plan_teachers;

create policy plan_blocks_all on public.plan_blocks for all to authenticated using (true) with check (true);
create policy plan_teachers_all on public.plan_teachers for all to authenticated using (true) with check (true);

-- Migrate existing JSON blobs (idempotent — skip if already migrated)
insert into public.plan_blocks (
  plan_id, id, band, course, subject, days, start_min, end_min,
  teacher, teacher2, room, anchor, staff, split_group, grades, extra, sort_order
)
select
  p.id,
  b->>'id',
  b->>'band',
  b->>'course',
  coalesce(b->>'subject', ''),
  coalesce(b->'days', '[]'::jsonb),
  (b->>'start')::int,
  (b->>'end')::int,
  b->>'teacher',
  b->>'teacher2',
  b->>'room',
  coalesce((b->>'anchor')::boolean, false),
  coalesce((b->>'staff')::boolean, false),
  b->>'splitGroup',
  b->'grades',
  '{}'::jsonb,
  (ord - 1)::int
from public.plans p
cross join lateral jsonb_array_elements(coalesce(p.data->'blocks', '[]'::jsonb)) with ordinality as t(b, ord)
where jsonb_array_length(coalesce(p.data->'blocks', '[]'::jsonb)) > 0
on conflict (plan_id, id) do nothing;

insert into public.plan_teachers (
  plan_id, id, name, rate, flat, status, subjects, allowed_days, windows, max_classes, virtual, note, sort_order
)
select
  p.id,
  t->>'id',
  t->>'name',
  nullif(t->>'rate', '')::numeric,
  nullif(t->>'flat', '')::numeric,
  t->>'status',
  coalesce(t->'subjects', '[]'::jsonb),
  t->'allowedDays',
  t->'windows',
  nullif(t->>'maxClasses', '')::int,
  coalesce((t->>'virtual')::boolean, false),
  t->>'note',
  (ord - 1)::int
from public.plans p
cross join lateral jsonb_array_elements(coalesce(p.data->'teachers', '[]'::jsonb)) with ordinality as t(t, ord)
where jsonb_array_length(coalesce(p.data->'teachers', '[]'::jsonb)) > 0
on conflict (plan_id, id) do nothing;

-- Keep only plan metadata in plans.data
update public.plans
set data = data - 'blocks' - 'teachers'
where data ? 'blocks' or data ? 'teachers';

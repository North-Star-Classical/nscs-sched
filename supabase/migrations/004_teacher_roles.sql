-- Leadership / duty roles on teacher profiles (e.g. Math Lead with time window)

alter table public.plan_teachers
  add column if not exists roles jsonb not null default '[]';

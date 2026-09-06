-- A to-do list. Deliberately small: a line, an optional date, done or not.
-- The design note kept a task list out of this app because HQ v1 and v2
-- died trying to be everything; this one earns its place only because it
-- lives in the app Charlie already opens every day.
create table public.todos (
  id          uuid primary key default gen_random_uuid(),
  body        text not null,
  due_on      date,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index todos_open_idx on public.todos (done_at, due_on, created_at);

alter table public.todos enable row level security;
create policy "admin_all" on public.todos
  for all to authenticated using (true) with check (true);

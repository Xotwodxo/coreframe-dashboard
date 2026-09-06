-- Priority carried over from the vault's task hub (3 highest, 2 high,
-- 1 medium, 0 none or low), and where an imported item came from.
alter table public.todos
  add column priority smallint not null default 0 check (priority between 0 and 3),
  add column source text;

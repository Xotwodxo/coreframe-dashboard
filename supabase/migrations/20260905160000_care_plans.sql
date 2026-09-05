-- ---------------------------------------------------------------------------
-- Coreframe admin - phase 2: care plan clients, allowance ledger, requests
--
-- Tables follow Business/02-Strategy/coreframe-admin-system-design.md
-- section 4. Money is integer pence, time is integer minutes, everywhere.
-- ---------------------------------------------------------------------------

create table public.clients (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  name                   text not null,
  contact_name           text,
  contact_email          text,
  contact_phone          text,
  domain                 text,
  tier                   text not null
                           check (tier in ('essential', 'managed', 'growth',
                                           'workflow', 'local_visibility', 'friend')),
  -- 'pending' is agreed but not yet billing, e.g. a free period.
  plan_status            text not null default 'active'
                           check (plan_status in ('pending', 'active', 'past_due',
                                                  'paused', 'cancelled')),
  renews_on              date,
  price_pence            integer not null default 0 check (price_pence >= 0),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- Null means the plan carries no time allowance (friend rate, Local
  -- Visibility). Never a made-up figure to make the table look tidy.
  allowance_minutes      integer check (allowance_minutes >= 0),
  allowance_cap_minutes  integer check (allowance_cap_minutes >= 0),
  notes                  text,
  created_at             timestamptz not null default now()
);

create index clients_renews_on_idx on public.clients (renews_on);


-- ---------------------------------------------------------------------------
-- allowance_ledger: append only. Balance is stored on every row so nothing
-- ever has to sum history, and every change leaves a row saying why.
-- ---------------------------------------------------------------------------
create table public.allowance_ledger (
  id            uuid primary key default gen_random_uuid(),
  -- Monotonic ordering, because occurred_at can tie inside one transaction.
  seq           bigint generated always as identity,
  client_id     uuid not null references public.clients (id) on delete cascade,
  occurred_at   timestamptz not null default now(),
  type          text not null check (type in ('credit', 'debit', 'cap_expire')),
  -- Magnitude. The type gives the direction.
  minutes       integer not null check (minutes > 0),
  balance_after integer not null check (balance_after >= 0),
  ref_type      text check (ref_type in ('invoice', 'request', 'manual')),
  -- A Stripe invoice id, or a request uuid as text.
  ref_id        text,
  note          text
);

create index allowance_ledger_client_idx on public.allowance_ledger (client_id, seq desc);


-- ---------------------------------------------------------------------------
-- requests: change requests against the allowance. minutes_spent is the one
-- manual field in the whole system.
-- ---------------------------------------------------------------------------
create table public.requests (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  created_at    timestamptz not null default now(),
  description   text not null,
  status        text not null default 'new'
                  check (status in ('new', 'scheduled', 'done')),
  scheduled_for date,
  done_at       timestamptz,
  minutes_spent integer check (minutes_spent >= 0)
);

create index requests_client_idx on public.requests (client_id, created_at desc);
create index requests_status_idx on public.requests (status, scheduled_for);


-- ---------------------------------------------------------------------------
-- stripe_events: idempotency guard. Stripe retries; this makes a retry
-- harmless. Written only by the webhook, through the service role.
-- ---------------------------------------------------------------------------
create table public.stripe_events (
  id           text primary key,
  received_at  timestamptz not null default now(),
  type         text not null,
  processed_at timestamptz
);


-- Phase 1 left this column waiting for its key.
alter table public.enquiries
  add constraint enquiries_client_fk
  foreign key (client_id) references public.clients (id) on delete set null;


-- ---------------------------------------------------------------------------
-- apply_allowance: the only way minutes move.
--
-- Locks the client row, reads the last balance, writes the entry, and if a
-- credit takes the balance over the three-month cap writes a second
-- cap_expire row for the excess in the same transaction. Both the Stripe
-- webhook and the minutes-entry action call this, so the arithmetic lives
-- in exactly one place and the cap can never be forgotten.
--
-- Returns the new balance. Raises on a debit larger than the balance: work
-- beyond the allowance is quoted separately at the hourly rate, not borrowed.
-- ---------------------------------------------------------------------------
create or replace function public.apply_allowance(
  p_client_id uuid,
  p_type      text,
  p_minutes   integer,
  p_ref_type  text default null,
  p_ref_id    text default null,
  p_note      text default null
)
returns integer
language plpgsql
as $$
declare
  v_cap     integer;
  v_balance integer;
  v_new     integer;
begin
  if p_minutes is null or p_minutes <= 0 then
    raise exception 'minutes must be a positive whole number';
  end if;
  if p_type not in ('credit', 'debit') then
    raise exception 'type must be credit or debit; cap_expire rows are written by this function';
  end if;

  select allowance_cap_minutes into v_cap
    from public.clients where id = p_client_id for update;
  if not found then
    raise exception 'unknown client %', p_client_id;
  end if;

  select balance_after into v_balance
    from public.allowance_ledger
    where client_id = p_client_id
    order by seq desc
    limit 1;
  v_balance := coalesce(v_balance, 0);

  if p_type = 'credit' then
    v_new := v_balance + p_minutes;
  else
    v_new := v_balance - p_minutes;
    if v_new < 0 then
      raise exception 'only % minutes available, % requested', v_balance, p_minutes;
    end if;
  end if;

  insert into public.allowance_ledger
    (client_id, type, minutes, balance_after, ref_type, ref_id, note)
  values
    (p_client_id, p_type, p_minutes, v_new, p_ref_type, p_ref_id, p_note);

  if p_type = 'credit' and v_cap is not null and v_new > v_cap then
    insert into public.allowance_ledger
      (client_id, type, minutes, balance_after, ref_type, ref_id, note)
    values
      (p_client_id, 'cap_expire', v_new - v_cap, v_cap, p_ref_type, p_ref_id,
       'Over the three-month cap');
    v_new := v_cap;
  end if;

  return v_new;
end;
$$;


-- ---------------------------------------------------------------------------
-- Row Level Security. Same model as phase 1: anon nothing, authenticated
-- everything, with one exception. The ledger and the Stripe event log are
-- select and insert only. A history you can quietly rewrite is not a history.
--
-- IF A SECOND USER IS EVER ADDED, every policy here must be rewritten to
-- scope by user first.
-- ---------------------------------------------------------------------------
alter table public.clients          enable row level security;
alter table public.allowance_ledger enable row level security;
alter table public.requests         enable row level security;
alter table public.stripe_events    enable row level security;

create policy "admin_all" on public.clients
  for all to authenticated using (true) with check (true);

create policy "admin_all" on public.requests
  for all to authenticated using (true) with check (true);

create policy "admin_read" on public.allowance_ledger
  for select to authenticated using (true);
create policy "admin_append" on public.allowance_ledger
  for insert to authenticated with check (true);

create policy "admin_read" on public.stripe_events
  for select to authenticated using (true);

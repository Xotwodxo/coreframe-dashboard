-- ---------------------------------------------------------------------------
-- Coreframe admin - enquiries (the whole of phase 1)
--
-- Written by the public website via POST /api/enquiries. Storage is the
-- system of record; the notification email is the alert.
--
-- Column names follow Business/02-Strategy/coreframe-admin-system-design.md
-- section 4 so that phase 2 (clients, allowance_ledger, requests) is purely
-- additive. Nothing here may be renamed.
--
-- Option values (service_interest, budget, timing) are NOT constrained on
-- purpose: if the website form gains an option, the enquiry must be stored,
-- not rejected at the database.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table public.enquiries (
  id                uuid primary key default gen_random_uuid(),
  -- 'coreframe' for the marketing site. Phase 2 adds 'client_site'.
  source            text not null default 'coreframe',
  -- Null until phase 2 adds the clients table; the foreign key is added then.
  client_id         uuid null,
  received_at       timestamptz not null default now(),
  name              text not null,
  phone             text,
  email             text,
  message           text,
  -- The page the form was on, e.g. '/contact' or '/start'.
  page              text,
  -- The form's service dropdown.
  service_interest  text,
  -- The three below are what the /contact form actually asks. Added beyond the
  -- design note because dropping a lead's budget on the floor is a real loss.
  business_name     text,
  budget            text,
  timing            text,
  status            text not null default 'new'
                      check (status in ('new', 'replied', 'quoted', 'won', 'lost')),
  -- Written by the app on every status change.
  status_changed_at timestamptz,
  -- Reserved for the phase 2 reply nudge. Nothing writes it yet.
  nudge_sent_at     timestamptz
);

create index enquiries_received_at_idx on public.enquiries (received_at desc);
create index enquiries_status_idx on public.enquiries (status, received_at desc);


-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- One administrator, Charlie. So the isolation model is deliberately simple:
--
--   * RLS is enabled, which means the `anon` role - the key that ships in the
--     browser bundle - can read and write NOTHING. That is the property that
--     makes it safe for the anon key to be public.
--   * The `authenticated` role gets full access. With exactly one account,
--     "everything an authenticated user can see" and "Charlie's data" are the
--     same set.
--   * The service_role client (src/lib/supabase/admin.ts) bypasses RLS and is
--     used for exactly one thing: the public website posting an enquiry,
--     where there is no logged-in user to act as.
--
-- IF A SECOND USER IS EVER ADDED, this policy must be rewritten to scope by
-- user first. Adding an account without doing that gives them everything.
-- ---------------------------------------------------------------------------

alter table public.enquiries enable row level security;

create policy "admin_all" on public.enquiries
  for all to authenticated using (true) with check (true);

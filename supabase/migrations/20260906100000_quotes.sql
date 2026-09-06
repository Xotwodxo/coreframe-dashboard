-- ---------------------------------------------------------------------------
-- Coreframe admin - phase 4: quotes
--
-- A price list edited in the app, and quotes built from it. Lines are COPIED
-- from the price list at the time they are added, so a price change later
-- never rewrites a quote already sent. Money is integer pence.
-- ---------------------------------------------------------------------------

create table public.price_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  kind         text not null check (kind in ('one_off', 'monthly')),
  price_pence  integer not null check (price_pence >= 0),
  -- "from £1,250": the line is expected to be edited to the real figure.
  from_price   boolean not null default false,
  active       boolean not null default true,
  sort_order   integer not null default 0
);

create sequence public.quote_number_seq start 3;   -- QTE-001 and QTE-002 exist on paper

create table public.quotes (
  id            uuid primary key default gen_random_uuid(),
  number        text unique,
  enquiry_id    uuid references public.enquiries (id) on delete set null,
  client_id     uuid references public.clients (id) on delete set null,
  -- Who it is for, copied at creation so the quote reads the same forever.
  to_name       text not null,
  to_business   text,
  to_email      text,
  title         text not null,
  intro         text,
  -- [{ description, kind, unit_pence, quantity }]
  lines         jsonb not null default '[]'::jsonb,
  not_included  text,
  timeline      text,
  deposit_pct   integer not null default 50 check (deposit_pct between 0 and 100),
  valid_days    integer not null default 14,
  status        text not null default 'draft'
                  check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  sent_at       timestamptz,
  decided_at    timestamptz,
  pdf_path      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index quotes_enquiry_idx on public.quotes (enquiry_id, created_at desc);
create index quotes_client_idx on public.quotes (client_id, created_at desc);
create index quotes_status_idx on public.quotes (status, sent_at);

create or replace function public.set_quote_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.number is null then
    new.number = 'QTE-' || lpad(nextval('public.quote_number_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger quotes_set_number
  before insert on public.quotes
  for each row execute function public.set_quote_number();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- Private: a quote carries a name and prices. The lead gets a signed link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotes', 'quotes', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "quotes_admin_read" on storage.objects
  for select to authenticated using (bucket_id = 'quotes');
create policy "quotes_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'quotes');
create policy "quotes_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'quotes');
create policy "quotes_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'quotes');

alter table public.price_items enable row level security;
alter table public.quotes      enable row level security;

create policy "admin_all" on public.price_items
  for all to authenticated using (true) with check (true);
create policy "admin_all" on public.quotes
  for all to authenticated using (true) with check (true);

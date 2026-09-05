-- ---------------------------------------------------------------------------
-- Coreframe admin - phase 3: the reply kit
--
-- Notes and a quoted amount on enquiries, a shelf of hosted documents, and a
-- settings table for the reply wording so Charlie can edit it in the app.
-- ---------------------------------------------------------------------------

alter table public.enquiries
  add column quoted_pence integer check (quoted_pence >= 0),
  add column quoted_at    timestamptz;

-- Append only. What was said, when. Never edited, never deleted.
create table public.enquiry_notes (
  id          uuid primary key default gen_random_uuid(),
  enquiry_id  uuid not null references public.enquiries (id) on delete cascade,
  created_at  timestamptz not null default now(),
  body        text not null
);

create index enquiry_notes_enquiry_idx on public.enquiry_notes (enquiry_id, created_at desc);

-- The shelf. Replacing the file keeps the row, so links already sent to a
-- lead keep working. for_services is a comma-separated list of the form's
-- service options this document is offered for; blank means offered to all.
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text,
  storage_path  text not null,
  for_services  text,
  sort_order    integer not null default 0,
  updated_at    timestamptz not null default now()
);

-- Key/value settings. Today: the reply wording and the booking link.
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Public read: these are the guides already emailed to strangers, and the
-- whole point is a link that opens on a phone. Agreements and anything with
-- a client's name in it do not go in here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', true, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "documents_public_read" on storage.objects
  for select using (bucket_id = 'documents');
create policy "documents_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');
create policy "documents_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'documents');
create policy "documents_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');

alter table public.enquiry_notes enable row level security;
alter table public.documents     enable row level security;
alter table public.settings      enable row level security;

create policy "admin_read" on public.enquiry_notes
  for select to authenticated using (true);
create policy "admin_append" on public.enquiry_notes
  for insert to authenticated with check (true);

create policy "admin_all" on public.documents
  for all to authenticated using (true) with check (true);

create policy "admin_all" on public.settings
  for all to authenticated using (true) with check (true);

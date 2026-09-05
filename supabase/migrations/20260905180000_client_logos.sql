-- ---------------------------------------------------------------------------
-- Client logos, so a row can be recognised at a glance.
--
-- Stored in Supabase Storage. The bucket is public-read because a client's
-- logo is already on their public website; there is nothing to protect and
-- a public URL means no signing on every render. Writes are limited to the
-- one signed-in administrator.
-- ---------------------------------------------------------------------------

alter table public.clients
  add column logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-logos',
  'client-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "client_logos_public_read" on storage.objects
  for select using (bucket_id = 'client-logos');

create policy "client_logos_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'client-logos');

create policy "client_logos_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'client-logos');

create policy "client_logos_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'client-logos');

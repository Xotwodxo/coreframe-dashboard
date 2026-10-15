-- ---------------------------------------------------------------------------
-- Admin membership (15 Oct 2026)
--
-- Until now every policy said "any authenticated user can do everything",
-- which is only safe while sign-up is off and there is exactly one account.
-- Same fix as Floor Fitter Wales (16 Sep 2026): a membership table that only
-- the service role can write, a helper the app and the policies both call,
-- and a RESTRICTIVE policy on every table so membership is required on top
-- of whatever the existing permissive policies allow.
--
-- After applying: insert Charlie's auth.uid() into public.admin_members.
-- Until that row exists, the app signs everyone out at requireUser().
-- ---------------------------------------------------------------------------

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admin_members enable row level security;
revoke all on public.admin_members from public, anon, authenticated;
grant all on public.admin_members to service_role;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_members where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Restrictive policies intersect with the existing permissive ones.
do $$
declare t text;
begin
  foreach t in array array[
    'enquiries', 'clients', 'allowance_ledger', 'requests', 'stripe_events',
    'enquiry_notes', 'documents', 'settings', 'price_items', 'quotes', 'todos'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'create policy verified_admin_only on public.%I as restrictive for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
        t
      );
    end if;
  end loop;
end $$;

-- Storage: the three buckets this app writes to. Public reads of client-logos
-- and documents are unchanged; writes need membership.
create policy verified_admin_storage on storage.objects
  as restrictive for all to authenticated
  using (
    bucket_id not in ('client-logos', 'documents', 'quotes')
    or (select public.is_admin())
  )
  with check (
    bucket_id not in ('client-logos', 'documents', 'quotes')
    or (select public.is_admin())
  );

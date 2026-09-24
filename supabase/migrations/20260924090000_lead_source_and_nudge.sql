-- ---------------------------------------------------------------------------
-- Lead systems, build 2 (24 Sep 2026)
--
--   1. lead_source: where a lead came from. Values mirror the Lead Sources
--      list in the business tracker. Not constrained, same rule as the
--      website's option fields: store it, never reject it.
--   2. first_replied_at: stamped by a trigger the first time an enquiry
--      leaves `new` for a stage that means Charlie answered. Every code path
--      (reply kit, status buttons, quotes) goes through the trigger, so the
--      time-to-first-reply number cannot drift from what actually happened.
--   3. The reply nudge: pg_cron runs every 15 minutes inside Supabase, so it
--      works with the Mac off. Any enquiry still at `new` after 2 hours gets
--      one Telegram message, sent 08:00 to 21:30 London time only.
--      The message carries no personal data, just a count and a link.
--
-- The Telegram token and chat id live in Supabase Vault, added by hand:
--   select vault.create_secret('<token>', 'telegram_bot_token');
--   select vault.create_secret('<chat id>', 'telegram_chat_id');
-- Until both exist the nudge does nothing.
-- ---------------------------------------------------------------------------

alter table public.enquiries
  add column lead_source      text not null default 'Website enquiry',
  add column first_replied_at timestamptz;

create or replace function public.stamp_first_reply()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'new'
     and new.status in ('replied', 'quoted', 'won')
     and new.first_replied_at is null then
    new.first_replied_at := now();
  end if;
  return new;
end;
$$;

create trigger enquiries_first_reply
  before update of status on public.enquiries
  for each row execute function public.stamp_first_reply();

-- History is not nudged: anything already waiting counts as seen.
update public.enquiries
  set nudge_sent_at = now()
  where status = 'new' and nudge_sent_at is null;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function public.send_reply_nudges()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  token   text;
  chat    text;
  waiting integer;
  london  time := (now() at time zone 'Europe/London')::time;
begin
  if london < time '08:00' or london > time '21:30' then
    return 0;
  end if;

  select decrypted_secret into token from vault.decrypted_secrets where name = 'telegram_bot_token';
  select decrypted_secret into chat  from vault.decrypted_secrets where name = 'telegram_chat_id';
  if token is null or chat is null then
    return 0;
  end if;

  with due as (
    update public.enquiries
      set nudge_sent_at = now()
      where status = 'new'
        and nudge_sent_at is null
        and received_at < now() - interval '2 hours'
      returning id
  )
  select count(*) into waiting from due;

  if waiting = 0 then
    return 0;
  end if;

  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || token || '/sendMessage',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object(
      'chat_id', chat,
      'text', case when waiting = 1
        then 'Nudge: 1 enquiry has waited over 2 hours with no reply.'
        else 'Nudge: ' || waiting || ' enquiries have waited over 2 hours with no reply.'
      end || E'\nhttps://admin.coreframedigital.co.uk/enquiries?status=new'
    )
  );

  return waiting;
end;
$$;

revoke all on function public.send_reply_nudges() from public, anon, authenticated;

select cron.schedule('reply-nudge', '*/15 * * * *', 'select public.send_reply_nudges()');

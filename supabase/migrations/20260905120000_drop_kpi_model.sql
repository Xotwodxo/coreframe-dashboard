-- ---------------------------------------------------------------------------
-- Coreframe admin - retire the manual-entry KPI model
--
-- coreframe-dashboard originally modelled businesses, metric_entries and
-- goals for a KPI dashboard that was never used. The Supabase project that
-- held them no longer exists, so on the new project these statements are
-- no-ops. They are checked in anyway so the history says plainly that the
-- old model was dropped on purpose, not forgotten.
-- ---------------------------------------------------------------------------

drop table if exists public.goals;
drop table if exists public.metric_entries;
drop table if exists public.businesses;

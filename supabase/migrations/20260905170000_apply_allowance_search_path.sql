-- Pin the function's search_path so a caller cannot redirect its table
-- references by changing their own. Raised by the Supabase security advisor
-- (function_search_path_mutable) after the phase 2 migration.
alter function public.apply_allowance(uuid, text, integer, text, text, text)
  set search_path = public;

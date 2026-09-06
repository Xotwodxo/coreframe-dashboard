-- When Charlie last asked a client for a review, so he does not ask twice.
-- Enquiries record the same thing as a note, since they already have a thread.
alter table public.clients
  add column review_requested_at timestamptz;

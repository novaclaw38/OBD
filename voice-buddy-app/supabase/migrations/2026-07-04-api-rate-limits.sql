-- Per-user rate limiting for paid API endpoints (/api/chat, /api/tts).
-- Run in the Supabase SQL editor.
--
-- One row per (user, endpoint, window-start). The RPC atomically increments
-- and returns the new count; the API rejects when it exceeds the limit.
--
-- NOTE (2026-07-30): this migration existed in the repo but had never
-- actually been applied to the production project — meaning bump_api_usage
-- didn't exist and every allowRequest() call in api/_auth.js was failing
-- open (RPC not found → caught → returns true), silently disabling the
-- 20/min and 500/day rate limits and the new 10/day free-chat limit added
-- alongside this note. Applied via Supabase MCP on 2026-07-30.

create table if not exists public.api_usage (
  user_id      uuid        not null,
  endpoint     text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (user_id, endpoint, window_start)
);

alter table public.api_usage enable row level security;
-- No policies: only the service role touches this table.

create or replace function public.bump_api_usage(
  p_user_id  uuid,
  p_endpoint text,
  p_window_seconds integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  new_count integer;
begin
  insert into api_usage (user_id, endpoint, window_start, count)
  values (p_user_id, p_endpoint, w, 1)
  on conflict (user_id, endpoint, window_start)
  do update set count = api_usage.count + 1
  returning count into new_count;
  return new_count;
end $$;

revoke all on function public.bump_api_usage(uuid, text, integer) from public, anon, authenticated;

-- Optional housekeeping: old windows are harmless but can be purged, e.g.
--   delete from api_usage where window_start < now() - interval '2 days';

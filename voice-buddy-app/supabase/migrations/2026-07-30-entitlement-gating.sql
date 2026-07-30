-- Server-side entitlement gating for Pro-only features that previously had
-- no DB-level check at all: parent voice messages and the live camera.
-- Applied directly to the dubz-buddy project via Supabase MCP; mirrored
-- here for tracking. Run in the Supabase SQL editor if replaying elsewhere.
--
-- Context: the pricing page advertises "Live camera" and "Parent voice
-- messages" as Pro-only, but:
--   - public.parent_messages only had "Users manage own messages" (ALL,
--     auth.uid() = user_id) — any signed-in free user could insert rows.
--   - the parent-audio storage bucket only checked folder ownership, not
--     entitlement.
--   - the camera_realtime_authorization policies (2026-06-29) only checked
--     that the topic belongs to the requesting user, not entitlement.
--
-- is_entitled() takes no argument and only ever checks auth.uid() — an
-- earlier version took a uid parameter, but the Supabase security advisor
-- flagged that as callable via /rest/v1/rpc/is_entitled with an arbitrary
-- user_id, letting any signed-in user probe another account's Pro status.
create or replace function public.is_entitled()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid()
      and (
        (s.status = 'trial'  and s.trial_end        is not null and s.trial_end        > now()) or
        (s.status = 'active' and s.subscription_end is not null and s.subscription_end > now())
      )
  );
$$;

revoke all on function public.is_entitled() from public, anon;
grant execute on function public.is_entitled() to authenticated;

-- RESTRICTIVE policies AND with existing permissive ones rather than
-- replacing them, so the pre-existing ownership checks still apply —
-- these only add the missing "and entitled" requirement.

create policy "parent_messages_insert_requires_entitlement"
  on public.parent_messages
  as restrictive
  for insert
  with check ( public.is_entitled() );

-- Scoped with an OR-guard so this never affects any bucket other than
-- parent-audio, present or future.
create policy "parent_audio_insert_requires_entitlement"
  on storage.objects
  as restrictive
  for insert
  with check ( bucket_id <> 'parent-audio' or public.is_entitled() );

-- Scoped with an OR-guard so this never affects any realtime topic other
-- than camera-*, present or future.
create policy "camera_send_requires_entitlement"
  on realtime.messages
  as restrictive
  for insert
  with check ( left(realtime.topic(), 7) <> 'camera-' or public.is_entitled() );

create policy "camera_receive_requires_entitlement"
  on realtime.messages
  as restrictive
  for select
  using ( left(realtime.topic(), 7) <> 'camera-' or public.is_entitled() );

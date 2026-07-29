-- Custom bedtime story requests (Pro feature). Run in the Supabase SQL editor.
--
-- A parent leaves a short theme/prompt from the dashboard; Buddy offers it
-- to the child next session (ask-first, same pattern as parent_messages —
-- never auto-plays). Text only, so unlike parent_messages this needs no
-- storage bucket, and — like lesson_completions — the owning account can
-- read/write its own rows directly (no service role needed).

create table if not exists public.story_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  prompt_text  text not null,
  delivered    boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.story_requests enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'story_requests'
  loop
    execute format('drop policy %I on public.story_requests', p.policyname);
  end loop;
end $$;

create policy "story_requests_select_own" on public.story_requests
  for select using (auth.uid() = user_id);

create policy "story_requests_insert_own" on public.story_requests
  for insert with check (auth.uid() = user_id);

create policy "story_requests_update_own" on public.story_requests
  for update using (auth.uid() = user_id);

create index if not exists story_requests_user_undelivered_idx
  on public.story_requests (user_id, delivered, created_at);

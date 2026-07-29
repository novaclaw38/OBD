-- Multi-child profiles (Pro feature: free accounts get 1 child, Pro gets
-- several). Run in the Supabase SQL editor.
--
-- `children` is the cloud source of truth for WHO exists (name, avatar,
-- buddy name) and lets the parent dashboard list/switch/add/remove kids.
-- Day-to-day preferences (routines, PIN, voice/speech settings) stay in
-- localStorage as before, now namespaced per child id on the client —
-- this table doesn't need to know about them.

create table if not exists public.children (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  buddy_name   text not null default 'Buddy',
  avatar_type  text not null default 'bear',
  avatar_color text not null default '#7c3aed',
  created_at   timestamptz not null default now()
);

alter table public.children enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'children'
  loop
    execute format('drop policy %I on public.children', p.policyname);
  end loop;
end $$;

-- Each parent account manages only its own children — client writes go
-- through the normal authenticated session (no service role needed here,
-- unlike subscriptions/trials which must not be client-writable).
create policy "children_select_own" on public.children
  for select using (auth.uid() = user_id);

create policy "children_insert_own" on public.children
  for insert with check (auth.uid() = user_id);

create policy "children_update_own" on public.children
  for update using (auth.uid() = user_id);

create policy "children_delete_own" on public.children
  for delete using (auth.uid() = user_id);

-- Scope lesson progress per child. Existing rows have child_id = null —
-- the client falls back to matching those against the first/legacy child
-- so pre-existing single-child accounts don't lose their history.
alter table public.lesson_completions
  add column if not exists child_id uuid references public.children(id) on delete cascade;

create index if not exists lesson_completions_child_id_idx
  on public.lesson_completions (child_id);

-- The pre-multi-child unique constraint was (user_id, course_id, lesson_id) —
-- too coarse now that two siblings can each complete the same lesson under
-- the same account. Replace it with a 4-column constraint that includes
-- child_id, which the app's upsert (onConflict) now targets. All writes
-- going forward always carry a real child_id (set client-side before any
-- lesson can be marked complete), so this only affects new rows; existing
-- null-child_id rows are untouched and still read fine via the OR fallback
-- in useCompletions.js.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.lesson_completions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%user_id%course_id%lesson_id%'
      and pg_get_constraintdef(oid) not ilike '%child_id%'
  loop
    execute format('alter table public.lesson_completions drop constraint %I', c.conname);
  end loop;
end $$;

create unique index if not exists lesson_completions_user_course_lesson_child_key
  on public.lesson_completions (user_id, course_id, lesson_id, child_id);

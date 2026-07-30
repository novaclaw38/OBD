-- Adds mastery scoring to lesson completions so progress reflects how well
-- a child did, not just that they clicked through. See
-- docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §4.
--
-- Both columns are nullable so existing rows (from before mastery scoring
-- existed) keep reading fine — the client treats a missing score as full
-- marks for legacy lessons that don't yet have scored steps.
alter table public.lesson_completions
  add column if not exists mastery_score smallint,
  add column if not exists completed_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.lesson_completions'::regclass
      and conname = 'lesson_completions_mastery_score_range'
  ) then
    alter table public.lesson_completions
      add constraint lesson_completions_mastery_score_range
      check (mastery_score is null or (mastery_score >= 0 and mastery_score <= 100));
  end if;
end $$;

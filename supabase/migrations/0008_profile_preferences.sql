-- LOCKED IN — Phase 1 (Behavioral engine): promote the four psychological
-- profile signals out of the `survey` jsonb blob into first-class columns on
-- user_profile so they're queryable for segmentation / plan generation.
--
--   • theme_preference — which visual system the deck renders in
--   • streak_model     — how the streak is scored (and how a miss is handled)
--   • stake_preference — the accountability model the user opted into
--   • stake_target     — jsonb metadata for that stake (Stripe id, phone, etc.)
--
-- text + CHECK (not a pg enum): enum values can't be removed and can't be added
-- inside a transaction; a CHECK is trivially editable in a later migration and
-- matches the "enum or text" latitude. Columns inherit user_profile's RLS owner
-- policy and the lww_guard trigger (0001/0006) — no new policy/trigger needed.

alter table public.user_profile
  add column if not exists theme_preference text
    check (theme_preference in ('terminal', 'zen', 'night_ops')),
  add column if not exists streak_model text
    check (streak_model in ('avoidance', 'accumulation', 'engagement')),
  add column if not exists stake_preference text
    check (stake_preference in ('financial', 'social', 'friction', 'none')),
  add column if not exists stake_target jsonb not null default '{}'::jsonb;

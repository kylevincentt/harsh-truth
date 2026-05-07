-- 2026-05-07b: Soft-delete the lead-post slur, add audit-trail columns
--
-- Adds removed_at + removal_reason so future editorial removals leave a
-- trace instead of disappearing silently. The frontend already hides any
-- post whose post_text matches the (unavailable) tombstone heuristic
-- (see isUnavailable() in app/page.js and lib/twitter.js) — setting
-- post_text to '(unavailable)' here is what makes the row disappear from
-- the public feed.
--
-- Targeted removal: @PubWanghaf "Hey. Faggot." was the lead post on the
-- home feed. Per Kyle's content-strategy review (memory: project_harsh
-- _truth_content_strategy), context-free slurs fail the "receipts,
-- organized" editorial bar and should not be the first thing visitors
-- see. We do NOT hard-delete — the row stays so the audit trail (when
-- it was removed, why) remains queryable.
--
-- Run this once in the Supabase SQL editor. Idempotent: safe to re-run;
-- the COALESCE on removed_at preserves the original removal timestamp.

begin;

------------------------------------------------------------
-- 1. Schema: add audit-trail columns (idempotent)
------------------------------------------------------------
alter table approved_posts
  add column if not exists removed_at timestamptz,
  add column if not exists removal_reason text;

create index if not exists approved_posts_removed_at_idx
  on approved_posts (removed_at)
  where removed_at is not null;

------------------------------------------------------------
-- 2. Soft-delete: clear text + media so isUnavailable() filter
--    hides the row. Keep handle / category / post_url / created_at
--    intact for the audit trail.
------------------------------------------------------------
update approved_posts
set post_text = '(unavailable)',
    image_url = null,
    video_url = null,
    removed_at = coalesce(removed_at, now()),
    removal_reason = coalesce(
      removal_reason,
      'Context-free slur, no receipt. Fails the "receipts, organized" editorial bar; was the lead post on /. (Audit C1, 2026-05-07)'
    )
where handle = '@PubWanghaf'
  and post_text ilike '%faggot%';

------------------------------------------------------------
-- 3. Sanity check (read-only — uncomment to verify)
------------------------------------------------------------
-- select id, handle, post_text, removed_at, removal_reason
--   from approved_posts where removed_at is not null;

commit;

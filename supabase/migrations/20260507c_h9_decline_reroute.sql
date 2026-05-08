-- Audit H9 (2026-05-07) — the "Other" category was hiding the largest
-- unlabeled cluster: explicit civilizational-decline posts (urban decay,
-- demographic decline, immigration consequences). Audit found these
-- belonged in the new Decline category, but the original importer
-- defaulted ambiguous posts to Other.
--
-- This migration reroutes the eight clearest cases. We deliberately leave
-- ambiguous or politically charged posts in Other for editorial review,
-- per the audit constraint: "only re-route obvious misfits."
--
-- Apply manually in Supabase SQL editor (no CI/CD migration runner).
-- Idempotent — re-running has no effect once the rows are already in
-- Decline.

UPDATE public.approved_posts
SET category = 'Decline'
WHERE category = 'Other'
  AND id IN (
    -- @newstart_2024 — Religious vs secular kids happiness gap (Haidt, post-2012)
    '8515385a-4f4d-4a4d-be03-2f602c0129f4',
    -- @LargeFamDad — Childless 42yo with $300K/2 vacations vs family men
    '1207cc67-2b29-4649-8405-07c6ef0bf2fe',
    -- @ArlineL0 — Beaches/theaters/malls "ruined, ruined, ruined"
    '0ef11692-2d3f-4c6c-bbb2-94a6fdb53d8b',
    -- @benwehrman — Booysens Station Road, 2009 vs 2025 (urban decay, ZA)
    'a635a66e-9c7d-4f5b-a45a-0dd231673abc',
    -- @TheOnlyDSC — Section 8 housing as a "factory producing killers"
    '3e25b3cc-309d-46c1-8cb1-2ef466dfb04a',
    -- @ericmmatheny — "How can this be a street in America?" (post-apocalyptic)
    '368579db-f30d-4b33-92f0-fc01934ae9e2',
    -- @MagneticNorse — Dallas TX Walgreens chaos
    'a6c26c8d-65c7-4885-a058-43b9c29fecd8',
    -- @benwehrman — White countries opened doors, received crime/rapes/murders
    '7bef7f31-9468-483a-8a85-c89a5b1d7524'
  );

-- Verification: should return 8 rows after running.
-- SELECT id, handle, substring(post_text, 1, 60) AS snippet, category
-- FROM public.approved_posts
-- WHERE id IN (
--   '8515385a-4f4d-4a4d-be03-2f602c0129f4',
--   '1207cc67-2b29-4649-8405-07c6ef0bf2fe',
--   '0ef11692-2d3f-4c6c-bbb2-94a6fdb53d8b',
--   'a635a66e-9c7d-4f5b-a45a-0dd231673abc',
--   '3e25b3cc-309d-46c1-8cb1-2ef466dfb04a',
--   '368579db-f30d-4b33-92f0-fc01934ae9e2',
--   'a6c26c8d-65c7-4885-a058-43b9c29fecd8',
--   '7bef7f31-9468-483a-8a85-c89a5b1d7524'
-- )
-- ORDER BY handle;

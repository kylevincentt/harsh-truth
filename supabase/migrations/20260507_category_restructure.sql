-- 2026-05-07 Category restructure
--
-- Implements Kyle's content-strategy decisions:
--   - Rename Judiciary → Crime & Courts (and absorb Crime Stats into it)
--   - Rename LGBTQ → Gender Ideology
--   - Rename Election Integrity → Rigged (and tighten editorial intake)
--   - Drop Foreign Policy entirely (route posts thoughtfully)
--   - Drop Economy entirely (route the 1 post)
--   - Add Schools, Decline (empty for now)
--   - Fix the Media / Bias slash bug — unify on canonical "Media"
--
-- Run this once in the Supabase SQL editor. The per-URL UPDATEs are idempotent
-- but pointless to re-run after success.

begin;

------------------------------------------------------------
-- 1. Per-post moves: Foreign Policy → various
------------------------------------------------------------

update approved_posts set category = 'Other'   where post_url = 'https://x.com/TRobinsonNewEra/status/2011015381213643202';
update approved_posts set category = 'Other'   where post_url = 'https://x.com/Breaking911/status/2034635865637453897';
update approved_posts set category = 'Other'   where post_url = 'https://x.com/its_The_Dr/status/2034015264795152700';
update approved_posts set category = 'Other'   where post_url = 'https://x.com/CoolHotdogDad/status/2023603751375040851';
update approved_posts set category = 'Decline' where post_url = 'https://x.com/CapitanBitcoin/status/2042195789871501583';
update approved_posts set category = 'Other'   where post_url = 'https://x.com/LaNativePatriot/status/2047343849778143537';
update approved_posts set category = 'Other'   where post_url = 'https://x.com/garbagehuman24/status/2042246434423197931?s=46';

-- Defensive: anything still tagged Foreign Policy goes to Other.
update approved_posts set category = 'Other' where category = 'Foreign Policy';

------------------------------------------------------------
-- 2. Per-post moves: Economy → Other
------------------------------------------------------------

update approved_posts set category = 'Other' where category = 'Economy';

------------------------------------------------------------
-- 3. Per-post moves: Election Integrity → various
--    Only actual election-mechanics posts stay (and become Rigged below).
------------------------------------------------------------

-- 11 movers (the 2 keepers will get bulk-renamed to Rigged in step 5):
update approved_posts set category = 'Democrats'       where post_url = 'https://x.com/libsoftiktok/status/2047076739642184014';
update approved_posts set category = 'Gender Ideology' where post_url = 'https://x.com/libsoftiktok/status/2047023622254964946';
update approved_posts set category = 'Schools'         where post_url = 'https://x.com/libsoftiktok/status/2047431749626413348';
update approved_posts set category = 'Schools'         where post_url = 'https://x.com/DeAngelisCorey/status/2047402703702159669';
update approved_posts set category = 'Immigration'     where post_url = 'https://x.com/christopherrufo/status/2046997770993570270';
update approved_posts set category = 'Decline'         where post_url = 'https://x.com/WallStreetApes/status/2047402652548608372';
update approved_posts set category = 'Democrats'       where post_url = 'https://x.com/libsoftiktok/status/2047097761837834528';
update approved_posts set category = 'Democrats'       where post_url = 'https://x.com/BamaSaltyMarine/status/2047120840227954929';
update approved_posts set category = 'Democrats'       where post_url = 'https://x.com/WallStreetApes/status/2047476915351757174';
update approved_posts set category = 'Media'           where post_url = 'https://x.com/libsoftiktok/status/2047797791624241588';

-- The "every institution that called itself a guardian of democracy" rhetorical
-- post — too vague to keep Rigged tight. Route to Other. (post_url is empty, so
-- target by id.)
update approved_posts set category = 'Other' where id = 'e806e219-e211-47e8-84af-813fcf28b03a';

------------------------------------------------------------
-- 4. Bulk renames for the clean lanes
------------------------------------------------------------

update approved_posts set category = 'Crime & Courts'  where category = 'Judiciary';
update approved_posts set category = 'Crime & Courts'  where category = 'Crime Stats';
update approved_posts set category = 'Gender Ideology' where category = 'LGBTQ';
update approved_posts set category = 'Media'           where category in ('Media / Bias', 'Media Bias');

------------------------------------------------------------
-- 5. Whatever is still tagged Election Integrity → Rigged
--    (the 2 election-mechanics keepers, plus anything new since the data pull)
------------------------------------------------------------

update approved_posts set category = 'Rigged' where category = 'Election Integrity';

------------------------------------------------------------
-- 6. Update the categories table itself
------------------------------------------------------------

-- Renames in-place (preserve UUIDs)
update categories set name = 'Crime & Courts',  sort_order = 2 where name = 'Judiciary';
update categories set name = 'Gender Ideology', sort_order = 5 where name = 'LGBTQ';
update categories set name = 'Media',           sort_order = 3 where name = 'Media Bias';
update categories set name = 'Rigged',          sort_order = 9 where name = 'Election Integrity';

-- Drops
delete from categories where name = 'Foreign Policy';
delete from categories where name = 'Economy';
delete from categories where name = 'Crime Stats';

-- Adds (Schools and Decline don't have posts yet but appear in sidebar)
insert into categories (name, sort_order) values
  ('Schools', 4),
  ('Decline', 7)
on conflict (name) do nothing;

-- Re-sort the rows that kept their names so the sidebar reads in editorial order
update categories set sort_order = 1  where name = 'Immigration';
update categories set sort_order = 6  where name = 'Islam';
update categories set sort_order = 8  where name = 'Democrats';
update categories set sort_order = 99 where name = 'Other';

------------------------------------------------------------
-- 7. Sanity check (read-only — uncomment to verify)
------------------------------------------------------------

-- select category, count(*) from approved_posts group by category order by 2 desc;
-- select name, sort_order from categories order by sort_order;

commit;

# Deploy: media-import bug fix (videos + tombstones)

This PR fixes three bugs visible in the Foreign Policy category on prod:

1. **@TRobinsonNewEra** — body showed literal `(unavailable)` because the
   syndication API returned a tombstone for a deleted/suspended tweet and
   the importer stored that placeholder as `post_text`.
2. **@Breaking911** — the post had a video, but the importer only knew how to
   capture photo URLs. The video was silently dropped.
3. **@its_The_Dr** — same as Breaking911: a Challenger-disaster video that
   imported as text-only.

## What changed

New:
- `lib/twitter.js` — shared tweet-fetch helper. Handles oEmbed + syndication,
  detects `__typename === "TweetTombstone"`, picks the best mp4 variant from
  `mediaDetails[i].video_info.variants`, returns
  `{ status, text, mediaType, imageUrl, videoUrl, likeCount, repostCount, viewCount }`.
- `app/api/admin/backfill-media/route.js` — admin-only POST that re-fetches
  text + media for already-approved posts. Two modes:
  - "Backfill all missing media" (skips rows that already have an image/video)
  - "Backfill these handles" (forces refetch for a comma-separated list)
- `supabase/migrations/20260426_add_video_columns.sql` — adds `video_url` and
  `media_type` columns to `approved_posts`.

Modified:
- `app/api/admin/approve/route.js` — uses `fetchTweetData` from `lib/twitter.js`,
  refuses to approve unavailable tweets (returns 422 with a clear message),
  inserts video columns when present.
- `app/page.js` — new `<PostMedia>` component renders `<video controls>` for
  video posts (with `image_url` as poster) or `<img>` for photo posts.
  `isUnavailable()` filter hides tombstone rows from the public feed.
- `app/admin/page.js` — surfaces backend approve errors verbatim, adds a
  fourth "Backfill" tab with both bulk and per-handle controls.
- `app/globals.css` — `.post-video` styling.

## Steps to ship

1. **Push the code.** From this folder:

   ```
   git add -A
   git commit -m "Fix X import: capture video URLs, detect tombstones, backfill route"
   git push origin main
   ```

   If `.git` is broken (OneDrive permission issues), use the clean-clone
   workaround documented in earlier DEPLOY notes.

2. **Run the migration.** Open the Supabase SQL editor for project
   `harsh-truth` and run:

   ```sql
   ALTER TABLE public.approved_posts
     ADD COLUMN IF NOT EXISTS video_url text,
     ADD COLUMN IF NOT EXISTS media_type text;
   ```

   (Same as `supabase/migrations/20260426_add_video_columns.sql`.)

3. **Wait for Vercel to redeploy** (~1–2 min after push).

4. **Backfill the 3 broken posts** at https://harshtruth.us/admin → Backfill tab:

   - Paste into the handles box: `@TRobinsonNewEra, @Breaking911, @its_The_Dr`
   - Click **Backfill these handles**.
   - The results panel will show what was updated. For @TRobinsonNewEra you
     should see `unavailable` (tweet's gone — row will now be hidden from
     the public feed). For the other two you should see `updated` with
     `video_url, media_type` in the fields list.

5. **Verify on prod.** Visit https://harshtruth.us → Foreign Policy. Expected:
   - `@TRobinsonNewEra` no longer appears (filtered as unavailable).
   - `@Breaking911` and `@its_The_Dr` now show inline videos with controls.

6. **Optional follow-up:** click **Backfill all posts missing media (up to 200)**
   on the same admin tab to retroactively pick up any other videos missed by
   the old importer. Safe to run repeatedly — it skips rows that already have
   media.

## Why the importer missed videos

The old `/api/admin/approve` route only inspected `data.photos[0]` and
`data.mediaDetails.find(m => m.type === 'photo')`. Videos and animated GIFs
live under `mediaDetails[i].video_info.variants[]` (the syndication API
mirrors X's internal media envelope) — the new helper picks the best mp4
variant (second-highest bitrate, matching `vercel/react-tweet`'s heuristic)
and stores `media_url_https` as the poster.

## Why `(unavailable)` appeared as text

When the author's account is suspended (Tommy Robinson has been suspended +
restored multiple times), the syndication endpoint returns
`{ "__typename": "TweetTombstone" }` and the oEmbed endpoint either 404s or
returns placeholder HTML. The previous code didn't recognize either, so the
fallback chain `tweetText || submission.note || 'Post approved from submission.'`
landed on whatever string the API surfaced. The new helper detects both
tombstone shapes (404, empty object, `TweetTombstone` typename, and any
literal text matching `unavailable`/`tweet unavailable`/etc.) and refuses
to overwrite valid text with junk.

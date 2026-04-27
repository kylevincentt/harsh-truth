# Harsh Truth — repo orientation for AI assistants

This is the public-facing repo for **harshtruth.us**, a curated platform where
users submit X (Twitter) posts, an admin approves them, and approved posts
appear in a public categorized feed. Tagline: *"No algorithm. Just curation."*

## Stack

- **Next.js 14.2.15** (App Router, **plain JavaScript — no TypeScript**)
- **React 18.3.1**, no UI library, plain global CSS with custom properties
- **Supabase** (`@supabase/supabase-js` 2.45.0, `@supabase/ssr` 0.10.0)
- **Vercel** for hosting (auto-deploys from `main` on push)
- No linter, no formatter, no test suite

Three Supabase clients, one per context:
- `lib/supabase-browser.js` — client components (anon key)
- `lib/supabase-server.js` — server components / route handlers (anon + cookies)
- `lib/supabase.js` — admin operations (service role, bypasses RLS)

Required env vars (set in Vercel + locally in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(server-only, never expose)*

## Conventions

- Plain JavaScript. **Do not introduce TypeScript.**
- No Tailwind, no CSS modules — global CSS in `app/globals.css` with CSS
  custom properties for theming.
- No external component library — React + CSS only.
- **Don't split components into separate files.** Each `page.js` contains all
  its components inline. The codebase deliberately uses big single-file pages.
- Admin status is stored in DB (`profiles.is_admin`), not auth metadata.
- Tweet data is scraped from public Twitter oEmbed + syndication APIs — no
  Twitter API key required, no auth.

## Database (Supabase, project `harsh-truth`)

| Table              | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `profiles`         | Mirror of `auth.users` with `is_admin` flag                  |
| `categories`       | Sidebar categories (sortable, renamable in admin UI)         |
| `submissions`      | User submissions awaiting review (status: pending/approved/rejected) |
| `approved_posts`   | The public feed                                              |
| `themes`           | Site themes (live-switchable from admin UI)                  |

Key columns on `approved_posts`:
- `handle`, `post_url`, `post_text`, `category`, `date_label`, `created_at`
- `image_url` — photo URL or video poster (added 2026-04-02)
- `video_url` — best mp4 variant for video posts (added 2026-04-26)
- `media_type` — `photo | video | animated_gif | NULL` (added 2026-04-26)
- `like_count`, `repost_count`, `view_count` — metrics from syndication API

All migrations live in `supabase/migrations/` and must be run **manually** in
the Supabase SQL editor (no CI/CD migration runner).

## The X import flow (most-asked-about subsystem)

There is **no Twitter API key**. Everything is scraped from two free,
undocumented endpoints used by X's own embed widgets:

1. **oEmbed** — `https://publish.twitter.com/oembed?url={post_url}` returns
   `{ html: "<blockquote>...<p>tweet text</p>..." }`. We extract the `<p>`
   contents for `post_text`.

2. **Syndication** — `https://cdn.syndication.twimg.com/tweet-result?id={id}&token={token}`
   returns the full tweet JSON: `mediaDetails[]`, `favorite_count`,
   `retweet_count`, etc. The `token` is computed from the tweet ID via
   the formula in `lib/twitter.js` (mirrors `vercel/react-tweet`).

The orchestration lives in `lib/twitter.js` → `fetchTweetData(postUrl)`. It:
- Fires both endpoints in parallel
- Detects tombstones (404, empty body, `__typename === "TweetTombstone"`,
  literal "(unavailable)" text)
- Picks the best mp4 variant from `mediaDetails[i].video_info.variants`
  (second-highest bitrate, to avoid huge files)
- Returns `{ status: 'ok' | 'unavailable' | 'error', text, mediaType,
  imageUrl, videoUrl, likeCount, repostCount, viewCount }`

Used by:
- `app/api/admin/approve/route.js` — on approval, fetches and inserts into
  `approved_posts`. Returns 422 if the tweet is unavailable.
- `app/api/admin/backfill-media/route.js` — admin-only POST that re-fetches
  text + media for already-approved posts. Triggered from the admin UI's
  **Backfill** tab.

### Known failure modes

| Symptom                                 | Cause                                                       | Fix |
| --------------------------------------- | ----------------------------------------------------------- | --- |
| `post_text` shows `(unavailable)`       | Tweet was deleted/suspended/private at import time          | Frontend `isUnavailable()` filter hides it. Admin Backfill tab can re-flag. |
| Video post shows as text-only           | Pre-2026-04-26 importer only captured photos                | Run admin Backfill → "all posts missing media" |
| `image_url` 404s after months           | X media URLs eventually rotate / expire                     | Re-run backfill on affected handles. (Long-term: download to Supabase Storage — not implemented yet.) |
| `(unavailable)` post still showing      | Frontend cache / Vercel ISR                                 | Hard-refresh; the page is `force-dynamic` so SSR is fresh, but client cache may briefly persist. |

### Backfilling

Two ways to trigger:

1. **Admin UI** (preferred): https://harshtruth.us/admin → **Backfill** tab.
   - "Backfill all missing media" — bulk, skips rows with existing media.
   - "Backfill these handles" — comma-separated list, forces refetch.

2. **Direct API** (for scripts): `POST /api/admin/backfill-media` with admin
   session cookie. Body shape documented in the route file.

## Auth + admin

- Supabase Auth handles users. Email+password and Google OAuth.
- Admin = `profiles.is_admin = true`. Only `kylevcrum@gmail.com` is admin.
- RLS enforced everywhere — public read on `approved_posts` and `categories`,
  authenticated insert on `submissions`, service role for everything else.
- The `Users cannot self-promote` policy explicitly blocks authenticated
  UPDATEs on `profiles` so users can't promote themselves to admin.
- Admin promotion must be done manually in the Supabase SQL editor.

## Theme system

8 CSS custom properties on `:root` (`--bg`, `--bg-card`, `--bg-card-hover`,
`--text`, `--text-muted`, `--red`, `--gold`, `--border`). `app/ThemeLoader.js`
fetches `/api/theme` on mount and applies the active theme. Switching themes
in the admin UI is **live** — no rebuild needed.

Fonts (loaded in `app/layout.js`): Bebas Neue (headings), IBM Plex Mono
(UI/labels), Libre Baskerville (body).

## Deployment

Push to `main` → Vercel auto-deploys. Staging environment = Vercel preview
URLs from PRs. Migrations run manually in Supabase SQL editor (not part of
the Vercel deploy).

# HARSH TRUTH — Project Documentation

**Domain:** harshtruth.io
**Tagline:** "No algorithm. Just curation."

A curated content platform where users submit X/Twitter posts, admins approve or reject them, and approved posts appear in a categorized public feed.

## Tech Stack

- **Framework:** Next.js 14.2.15 (App Router, plain JavaScript — no TypeScript)
- **React:** 18.3.1
- **Backend/Auth/DB:** Supabase (`@supabase/supabase-js` 2.45.0, `@supabase/ssr` 0.10.0)
- **Styling:** Global CSS with CSS custom properties (no Tailwind, no CSS modules)
- **Fonts:** Bebas Neue (headings), IBM Plex Mono (UI/labels), Libre Baskerville (body)
- **Deployment:** (pending — domain `harshtruth.io` purchased, not yet connected)

## Directory Structure

```
harsh-truth/
├── app/
│   ├── layout.js              # Root layout — metadata, fonts, ThemeLoader
│   ├── page.js                # Home page — feed, sidebar, auth modal, submission modal
│   ├── globals.css            # All styles + CSS custom properties
│   ├── ThemeLoader.js         # Client component — fetches active theme, applies CSS vars
│   ├── admin/
│   │   └── page.js            # Admin panel — 3 tabs: Queue, Categories, Themes
│   ├── auth/
│   │   └── callback/
│   │       └── route.js       # OAuth callback handler (Google)
│   └── api/
│       ├── theme/
│       │   └── route.js       # GET active theme colors (public)
│       └── admin/
│           ├── submissions/
│           │   └── route.js   # GET pending submissions (admin-only)
│           ├── approve/
│           │   └── route.js   # POST approve submission → fetch tweet data → publish
│           ├── reject/
│           │   └── route.js   # POST reject submission
│           ├── categories/
│           │   ├── route.js   # GET/POST categories
│           │   └── [id]/
│           │       └── route.js   # PUT/DELETE category by ID
│           └── themes/
│               ├── route.js   # GET/POST themes
│               └── [id]/
│                   ├── route.js       # PUT/DELETE theme by ID
│                   └── activate/
│                       └── route.js   # PUT activate theme
├── lib/
│   ├── supabase.js            # Admin client (service role key, bypasses RLS)
│   ├── supabase-browser.js    # Browser client (anon key, @supabase/ssr)
│   ├── supabase-server.js     # Server client (SSR with cookies)
│   └── admin-auth.js          # getAdminUser() — checks session + profiles.is_admin
├── middleware.js               # Refreshes Supabase session on every request
├── next.config.js              # { reactStrictMode: true }
├── package.json                # Dependencies + scripts (dev/build/start)
└── supabase/
    └── migrations/
        ├── 001_create_categories.sql
        ├── 002_auth_setup.sql
        ├── 003_create_themes.sql
        └── 20260402_add_image_url.sql
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonymous/public key
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role key (server-side only, bypasses RLS)
```

## Database Schema

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User metadata + admin flag | `id` (FK → auth.users), `email`, `is_admin`, `created_at` |
| `categories` | Post categories | `id` (uuid), `name` (unique), `sort_order`, `created_at` |
| `submissions` | Pending user submissions | `id`, `post_url`, `category`, `submitter_handle`, `note`, `status` (pending/approved/rejected), `user_id`, `created_at` |
| `approved_posts` | Published posts (public feed) | `id`, `post_url`, `handle`, `post_text`, `category`, `date_label`, `image_url`, `created_at` |
| `themes` | Site color themes | `id`, `name` (unique), `is_active`, `colors` (JSONB), `created_at` |

### RLS Policies

- **categories:** Public read, service role write
- **profiles:** Users read own profile, service role full access
- **submissions:** Authenticated users insert own, service role full access
- **approved_posts:** Public read, service role write
- **themes:** Public read, service role write

### Triggers

- `handle_new_user()` — auto-creates a `profiles` row when a new user signs up via auth

### Seeded Data

- **Categories:** Judiciary, Media / Bias, Immigration, Election Integrity, Economy, Foreign Policy, Other
- **Themes:** "Original Dark" (inactive), "Warm Earth" (active)

### Admin Setup

Admin is controlled by `profiles.is_admin`. To grant admin:
```sql
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'kylevcrum@gmail.com';
```

## Authentication Flow

1. Users sign in via email/password or Google OAuth
2. OAuth redirects to `/auth/callback` to exchange code for session
3. `middleware.js` refreshes session cookies on every request
4. Three Supabase clients serve different contexts:
   - `lib/supabase-browser.js` — client-side (anon key)
   - `lib/supabase-server.js` — server components/API routes (anon key + cookies)
   - `lib/supabase.js` — admin operations (service role key, bypasses RLS)
5. `lib/admin-auth.js` — `getAdminUser()` checks session cookie then `profiles.is_admin`

## Page Architecture

### Home Page (`app/page.js`)

Single `'use client'` file containing all components:
- **Home** — main component with state for posts, categories, auth, modals
- **PostCard** — renders individual approved post with handle, category, text, image, link
- **AuthModal** — sign in/sign up with email+password or Google OAuth
- **SubmissionModal** — submit X post URL with category, handle, note
- **GoogleIcon** — inline SVG for Google sign-in button

Key behaviors:
- `pendingSubmit` ref — if user clicks "Submit" while logged out, opens auth modal first, then auto-opens submission modal after sign-in
- Category filtering with live post counts
- Fallback categories array if API fetch fails

### Admin Page (`app/admin/page.js`)

Single `'use client'` file with three tabs:
- **Queue** — view pending submissions, approve/reject
- **Categories** — add, rename, delete (protected "Other" category)
- **Themes** — create, edit colors (color pickers), duplicate, activate, delete

Includes `ThemePreview` and `ThemeColorEditor` helper components inline.

### Theme System

8 CSS custom properties drive the entire color scheme:
- `--bg`, `--bg-card`, `--bg-card-hover` (backgrounds)
- `--text`, `--text-muted` (typography)
- `--red` (accent), `--gold` (accent)
- `--border`

`ThemeLoader.js` fetches `/api/theme` on mount and applies colors to `:root`. Admin can change the live theme instantly via the Themes tab.

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/theme` | GET | Public | Returns active theme colors |
| `/api/admin/submissions` | GET | Admin | List pending submissions |
| `/api/admin/approve` | POST | Admin | Approve submission, fetch tweet text+image via Twitter APIs, insert to `approved_posts` |
| `/api/admin/reject` | POST | Admin | Reject submission (updates status) |
| `/api/admin/categories` | GET | Public | List all categories |
| `/api/admin/categories` | POST | Admin | Create category |
| `/api/admin/categories/[id]` | PUT | Admin | Rename category (updates posts too) |
| `/api/admin/categories/[id]` | DELETE | Admin | Delete category (moves posts to "Other") |
| `/api/admin/themes` | GET | Admin | List all themes |
| `/api/admin/themes` | POST | Admin | Create theme |
| `/api/admin/themes/[id]` | PUT | Admin | Update theme name/colors |
| `/api/admin/themes/[id]` | DELETE | Admin | Delete theme (cannot delete active) |
| `/api/admin/themes/[id]/activate` | PUT | Admin | Set theme as active |

### Tweet Data Extraction (`/api/admin/approve`)

When a post is approved:
1. Fetches tweet text via Twitter oEmbed API (`publish.twitter.com`)
2. Fetches tweet image via Twitter syndication API (token-based)
3. Falls back gracefully to submitter's note if APIs fail

## Styling (`app/globals.css`)

All styles in one CSS file using CSS custom properties. Key sections:
- CSS variable declarations (theme colors, fonts)
- Header (sticky, hamburger menu on mobile)
- Sidebar (category list, collapsible on mobile)
- Feed + PostCard (animated entrance)
- Modals (auth, submission, confirmation dialogs)
- Admin panel (tabs, queue items, category management, theme editor)
- Toast notifications
- Responsive breakpoints

## Development

```bash
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm run start  # Start production server
```

No linter, formatter, or test suite configured.

## GitHub Repository

`kylevincentt/harsh-truth` — branch `main`

## Key Design Decisions

- Everything is plain JavaScript (no TypeScript)
- No external UI library — all components built with React + CSS
- No component file splitting — `page.js` files contain all components for that page
- CSS custom properties enable runtime theme switching without rebuilds
- Supabase RLS handles authorization at the database level
- Admin status is stored in `profiles.is_admin`, not in Supabase auth metadata
- Tweet data is scraped from public Twitter APIs (oEmbed + syndication), no Twitter API key needed

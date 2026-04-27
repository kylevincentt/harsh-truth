-- Add video + media-type columns to approved_posts so the import flow can
-- capture videos and animated GIFs (not just photos).
--
-- video_url           — best mp4 variant from the syndication API. NULL for
--                       photo-only or text-only posts.
-- media_type          — one of 'photo' | 'video' | 'animated_gif' | NULL.
-- image_url already exists (via 20260402_add_image_url.sql) and is reused
-- here as the video poster/thumbnail when media_type IN ('video','animated_gif').
--
-- Run once in the Supabase SQL editor.

ALTER TABLE public.approved_posts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS media_type text;

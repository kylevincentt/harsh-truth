-- Add repost + view count columns to approved_posts.
-- Run once in the Supabase SQL editor.

ALTER TABLE public.approved_posts
  ADD COLUMN IF NOT EXISTS repost_count integer,
  ADD COLUMN IF NOT EXISTS view_count integer;

-- Add like_count column to approved_posts so we can sort by Popular (X likes).
-- Run this once in the Supabase SQL editor.

ALTER TABLE public.approved_posts
  ADD COLUMN IF NOT EXISTS like_count integer;

-- Helpful index when users switch to the "Popular" tab.
CREATE INDEX IF NOT EXISTS approved_posts_like_count_idx
  ON public.approved_posts (like_count DESC NULLS LAST, created_at DESC);

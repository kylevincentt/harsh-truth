-- Add image_url column to approved_posts to store tweet images
ALTER TABLE approved_posts ADD COLUMN IF NOT EXISTS image_url text;

-- =========================================================
-- Security Hardening: Admin privilege fixes
-- Run in Supabase SQL editor
-- =========================================================

-- 1. Reset any incorrectly-granted admin privileges.
--    Only kylevcrum@gmail.com should have is_admin = true.
UPDATE public.profiles
  SET is_admin = FALSE
  WHERE email != 'kylevcrum@gmail.com'
    AND is_admin = TRUE;

-- 2. Ensure is_admin defaults to false (defensive, already set in table def).
ALTER TABLE public.profiles
  ALTER COLUMN is_admin SET DEFAULT FALSE;

-- 3. Explicitly block authenticated users from updating their own profile.
--    (No authenticated UPDATE policy exists, so this is already denied by RLS,
--     but we add an explicit policy to make the intent clear and prevent accidents.)
DROP POLICY IF EXISTS "Users cannot self-promote" ON public.profiles;
CREATE POLICY "Users cannot self-promote"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (false);

-- Note: Only the service_role (used by admin API routes) can update profiles.
-- Admin promotion must go through a server-side API route that validates
-- the requesting user is already an admin before setting is_admin = true.

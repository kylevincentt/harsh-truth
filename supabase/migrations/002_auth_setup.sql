-- =========================================================
-- Harsh Truth Auth Migration
-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/drrcsrpmnixrgckidttg/sql
-- =========================================================

-- 1. Create profiles table (user metadata + admin flag)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Service role has full access (used by admin API routes)
CREATE POLICY "Service role full access"
  ON public.profiles FOR ALL
  TO service_role
  USING (true);

-- 4. Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Add user_id to submissions to track who submitted
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- =========================================================
-- RLS for submissions: logged-in users can insert their own
-- =========================================================
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can submit
CREATE POLICY "Authenticated users can submit"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role has full access (admin panel uses service key)
CREATE POLICY "Service role full access on submissions"
  ON public.submissions FOR ALL
  TO service_role
  USING (true);

-- =========================================================
-- RLS for approved_posts: public reads, service role writes
-- =========================================================
ALTER TABLE public.approved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved_posts"
  ON public.approved_posts FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on approved_posts"
  ON public.approved_posts FOR ALL
  TO service_role
  USING (true);

-- =========================================================
-- Grant Kyle admin privileges
-- Run AFTER kylevcrum@gmail.com signs up for the first time:
-- =========================================================
-- UPDATE public.profiles
--   SET is_admin = TRUE
--   WHERE email = 'kylevcrum@gmail.com';

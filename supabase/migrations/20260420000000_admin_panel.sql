/*
  # Admin Panel Support

  ## Changes
  - profiles table: mirrors auth.users with role field (user | admin)
  - Trigger: auto-create profile on signup
  - is_admin() function: safe RLS helper (SECURITY DEFINER avoids recursion)
  - RLS policies: admin full access to courses, modules, lessons, profiles
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function avoids RLS recursion when checking admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (public.is_admin());

-- Admin policies for courses (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can insert courses"
  ON courses FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update courses"
  ON courses FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete courses"
  ON courses FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admin policies for modules
CREATE POLICY "Admins can manage modules"
  ON modules FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin policies for lessons
CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger: auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users (run once)
INSERT INTO public.profiles (id, full_name, email)
SELECT
  u.id,
  u.raw_user_meta_data->>'full_name',
  u.email
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

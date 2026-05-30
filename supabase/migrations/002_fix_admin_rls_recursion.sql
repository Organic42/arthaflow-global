-- ArthaFlow Global — Fix infinite recursion in admin RLS policies
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
--
-- PROBLEM: The admin policies queried public.profiles from within a policy
-- ON public.profiles, causing "infinite recursion detected in policy" (42P17).
-- Every profile/product read returned HTTP 500.
--
-- FIX: Use a SECURITY DEFINER helper function. Because it runs with the
-- definer's privileges, it bypasses RLS and does not re-trigger the policy.

-- 1. Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;

-- 2. Helper that checks the current user's role WITHOUT triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Recreate admin policies using the helper (no recursion)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all documents" ON public.documents
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all inquiries" ON public.inquiries
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all shipments" ON public.shipments
  FOR SELECT USING (public.is_admin());

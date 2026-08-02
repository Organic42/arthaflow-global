-- ============================================================
-- 006: Pin search_path on handle_new_user()
--
-- handle_new_user() (001_initial_schema.sql) is SECURITY DEFINER but was
-- created without a search_path pin — the one SECURITY DEFINER function in
-- this project that missed it (is_admin() in 002 sets it to `public`;
-- trade_cache_cleanup() in 005 sets it to '' and explains why). Without a
-- pin, an unqualified reference inside the function body resolves against
-- whatever search_path the CALLER has in effect, not the definer's — the
-- standard SECURITY DEFINER privilege-escalation vector.
--
-- Re-running CREATE OR REPLACE FUNCTION with the same signature updates the
-- function in place; it does not need to be dropped first, and the trigger
-- that references it (on_auth_user_created) keeps pointing at it unchanged.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

-- Same hardening already proven necessary for trade_cache_cleanup() in 005:
-- Supabase grants EXECUTE to anon/authenticated at function creation time,
-- separate from (and surviving) a REVOKE ... FROM PUBLIC. This function is
-- only ever meant to run via the AFTER INSERT ON auth.users trigger, never
-- as a direct RPC call.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

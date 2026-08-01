-- ============================================================
-- 005: UN Comtrade response cache
-- Trade data updates monthly; cache aggressively to preserve
-- free-tier API quota (500 requests/day).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trade_cache (
  cache_key   TEXT PRIMARY KEY,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS trade_cache_expires_idx
  ON public.trade_cache (expires_at);

-- Enable RLS. Only server-side clients (service role) read/write this;
-- no manufacturer user should touch it directly.
ALTER TABLE public.trade_cache ENABLE ROW LEVEL SECURITY;

-- Deny all reads/writes for anon and authenticated roles.
--
-- IMPORTANT: the service role bypasses RLS, so app code reaches this table
-- ONLY via a client built with SUPABASE_SERVICE_ROLE_KEY — see
-- src/lib/supabase/admin.ts. The ordinary anon-key client (lib/supabase/
-- server.ts) is subject to these policies and will silently read/write
-- nothing. If SUPABASE_SERVICE_ROLE_KEY is unset, caching is simply
-- disabled and every lookup hits the upstream API.
--
-- Deliberately NOT opening this to anon: the anon key ships to the browser,
-- and a publicly writable cache lets anyone seed false trade figures that
-- Saathi would then repeat as fact.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trade_cache'
      AND policyname = 'trade_cache_deny_all'
  ) THEN
    CREATE POLICY "trade_cache_deny_all" ON public.trade_cache
      FOR ALL USING (FALSE) WITH CHECK (FALSE);
  END IF;
END $$;

-- Optional: cleanup helper (call periodically or via cron).
--
-- SECURITY DEFINER because it must delete from a table that RLS denies to
-- everyone. That makes the search_path a privilege-escalation vector: without
-- pinning it, a caller could point `public` at a schema of their own and have
-- this function run their DELETE with the owner's rights. Pinning it to the
-- empty string forces every reference to be schema-qualified, which is why the
-- table name below is fully qualified.
CREATE OR REPLACE FUNCTION public.trade_cache_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.trade_cache WHERE expires_at < NOW();
END;
$$;

-- Functions are executable by PUBLIC by default. This one only removes expired
-- rows, but a SECURITY DEFINER function should never be broader than it needs.
REVOKE EXECUTE ON FUNCTION public.trade_cache_cleanup() FROM PUBLIC;

-- REVOKE ... FROM PUBLIC is not enough on its own: applying this against the
-- live project showed Supabase grants EXECUTE directly to anon and
-- authenticated at creation time, a separate grant that survives revoking
-- PUBLIC. Confirmed via information_schema.role_routine_grants — without this
-- line the function remained callable with the anon key. The same pattern
-- already existed on handle_new_user and is_admin in this project.
REVOKE EXECUTE ON FUNCTION public.trade_cache_cleanup() FROM anon, authenticated;

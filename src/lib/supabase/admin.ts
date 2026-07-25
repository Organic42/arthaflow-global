/**
 * Service-role Supabase client — SERVER ONLY.
 *
 * ⚠️ NEVER import this from a client component, and never expose
 * SUPABASE_SERVICE_ROLE_KEY to the browser (no NEXT_PUBLIC_ prefix). The
 * service role bypasses Row Level Security entirely; leaking it would hand
 * anyone full read/write access to every table.
 *
 * Why it exists: `trade_cache` is deliberately locked down with a deny-all RLS
 * policy, because the anon key is public and a writable cache is a poisoning
 * vector (an attacker could seed false trade figures that Saathi would then
 * state as fact). So the cache is reachable only by a role that bypasses RLS.
 *
 * If the key isn't configured this returns null and callers simply skip
 * caching — every query still works, it just hits the upstream API each time.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function createAdminClient(): SupabaseClient | null {
  // Memoise across requests in the same process; `undefined` = not yet tried.
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    cached = null;
    return null;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** True when a service-role key is configured (i.e. caching is available). */
export function hasAdminClient(): boolean {
  return createAdminClient() !== null;
}

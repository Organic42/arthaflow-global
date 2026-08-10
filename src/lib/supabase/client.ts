import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — memoised per tab.
 *
 * WHY A SINGLETON: this used to return a fresh client on every call. Two
 * consequences, both bad. Supabase warns when more than one GoTrue auth
 * client exists in the same browser context, because they race each other
 * refreshing the same session token. And because every render produced a
 * new object identity, `supabase` could never be listed in a hook's
 * dependency array without causing an infinite re-fetch loop — so every
 * caller silently omitted it and ate an exhaustive-deps warning.
 *
 * A module-level instance fixes both: one auth client per tab, and a
 * reference stable enough to sit honestly in a dependency array.
 *
 * Browser only. Server code uses ./server.ts, service-role uses ./admin.ts.
 */

// The singleton is typed off THIS concrete factory, not off
// `typeof createBrowserClient`. createBrowserClient is generic, so
// ReturnType of its signature resolves the type parameters to their
// constraints and hands back a widened client whose query rows degrade to
// `any` — which silently strips type-checking from every caller.
function makeBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let browserClient: ReturnType<typeof makeBrowserClient> | undefined;

export function createClient() {
  browserClient ??= makeBrowserClient();
  return browserClient;
}

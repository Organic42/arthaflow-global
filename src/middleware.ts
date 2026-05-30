import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = ["/", "/pricing", "/blog", "/login"];
const onboardingRoute = "/onboarding";

// Routes that require onboarding to be complete
const dashboardRoutes = [
  "/dashboard",
  "/products",
  "/documents",
  "/inquiries",
  "/shipments",
  "/mobile",
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always refresh session first
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Allow static assets and API routes through always
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return supabaseResponse;
  }

  // ── Unauthenticated ─────────────────────────────────────────────────
  if (!user) {
    // Public routes are fine
    if (publicRoutes.includes(pathname) || pathname === onboardingRoute) {
      return supabaseResponse;
    }
    // Everything else → login with redirect
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ── Authenticated ───────────────────────────────────────────────────

  // Redirect away from login if already signed in
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Check onboarding status for dashboard routes
  const isDashboardRoute = dashboardRoutes.some((r) => pathname.startsWith(r));

  if (isDashboardRoute || pathname === onboardingRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, onboarding_step")
      .eq("id", user.id)
      .single();

    const completed = profile?.onboarding_completed === true;

    // If on onboarding but already completed → go to dashboard
    if (pathname === onboardingRoute && completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // If on dashboard routes but onboarding not done → go to onboarding
    if (isDashboardRoute && !completed) {
      const url = request.nextUrl.clone();
      url.pathname = onboardingRoute;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

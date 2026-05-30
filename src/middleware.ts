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

  // For /login and any route that needs onboarding check, fetch profile once
  const needsCheck =
    pathname === "/login" ||
    pathname === onboardingRoute ||
    dashboardRoutes.some((r) => pathname.startsWith(r));

  if (needsCheck) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    const completed = profile?.onboarding_completed === true;

    // Authenticated user on /login → send to the right place in one hop
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = completed ? "/dashboard" : onboardingRoute;
      return NextResponse.redirect(url);
    }

    // Completed onboarding but visiting /onboarding → dashboard
    if (pathname === onboardingRoute && completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Dashboard route but onboarding not done → onboarding
    const isDashboardRoute = dashboardRoutes.some((r) => pathname.startsWith(r));
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

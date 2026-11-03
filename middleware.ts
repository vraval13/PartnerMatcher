import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Pure routing decision — no I/O. Returns the redirect path or null (allow).
 * Exported so the routing rules can be unit-tested without a Next.js environment.
 */
export function resolveRoute(user: boolean, onboarded: boolean, pathname: string): string | null {
  const isAuthPage = pathname === "/signin" || pathname === "/signup";
  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");

  if (!user && (isDashboard || isOnboarding)) return "/signin";
  if (user && (isDashboard || isAuthPage || isOnboarding)) {
    if (!onboarded && !isOnboarding) return "/onboarding";
    if (onboarded && (isAuthPage || isOnboarding)) return "/dashboard";
  }
  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
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

  // Refresh session — do NOT remove this
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Fast path: no user — decide without a DB round-trip
  const fastRedirect = resolveRoute(!!user, true, pathname);
  if (!user && fastRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = fastRedirect;
    return NextResponse.redirect(url);
  }

  // User exists — check onboarding state for relevant routes
  const isAuthPage = pathname === "/signin" || pathname === "/signup";
  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  if (user && (isDashboard || isAuthPage || isOnboarding)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("user_id", user.id)
      .single();

    const onboarded = !!profile?.onboarded_at;
    const redirect = resolveRoute(true, onboarded, pathname);
    if (redirect) {
      const url = request.nextUrl.clone();
      url.pathname = redirect;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

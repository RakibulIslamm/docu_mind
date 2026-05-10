import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard"]
const AUTH_ROUTES = new Set(["/login"])

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Only protect routes we actually need to check. Everything else (landing,
  // /api, static) bypasses Supabase entirely so a flaky network can't 500
  // an unrelated page.
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.has(pathname)
  if (!isProtected && !isAuthRoute) return supabaseResponse

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    // Misconfigured env — let the page render its own fallback rather than 500.
    return supabaseResponse
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  let user: { id: string } | null = null
  let authCheckFailed = false
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    // Network/Supabase outage. Don't conflate this with "logged out".
    authCheckFailed = true
  }

  // Optimistic session check: if the auth API was unreachable but the
  // browser has a session cookie, assume the user is logged in and let
  // them through. The page can render its own degraded state if its data
  // fetch also fails — see app/dashboard/error.tsx.
  if (authCheckFailed) {
    if (hasSessionCookie(request)) {
      return supabaseResponse
    }
    if (isProtected) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = "/login"
      redirect.searchParams.set("next", pathname)
      return NextResponse.redirect(redirect)
    }
    return supabaseResponse
  }

  if (!user && isProtected) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = "/login"
    redirect.searchParams.set("next", pathname)
    return NextResponse.redirect(redirect)
  }

  if (user && pathname === "/login") {
    const redirect = request.nextUrl.clone()
    redirect.pathname = "/dashboard"
    return NextResponse.redirect(redirect)
  }

  return supabaseResponse
}

// @supabase/ssr stores the session as `sb-<ref>-auth-token` (sometimes
// chunked as `…auth-token.0`, `…auth-token.1`). Presence of any of those
// = "there's a session here, even if we can't validate it right now".
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))
}

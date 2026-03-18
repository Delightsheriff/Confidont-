// ─────────────────────────────────────────────
// proxy.ts  (Next.js 16 request proxy)
//
// Runs on every request before the page renders.
// Two jobs:
//   1. Refresh the Supabase auth session (token renewal)
//   2. Route guards — redirect at the edge so pages
//      never receive users that shouldn't be there.
//      This prevents the client-side "checking…" spinner
//      pattern on guarded pages.
//
// Guards defined here (authenticated users only — guests
// depend on localStorage which is client-side only):
//
//   /            + authenticated  → /home
//   /session     + authenticated, no Supabase profile → /
//   /session     + authenticated, free cap reached    → /home
// ─────────────────────────────────────────────

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { updateSession } from "./lib/supabase/proxy"
import { FREE_SESSION_LIMIT } from "./configs/tiers"

const GUARDED = new Set(["/", "/session"])

export async function proxy(request: NextRequest) {
  // Step 1 — refresh auth tokens (must happen first so subsequent
  //           getClaims() reads a valid, up-to-date session)
  const response = await updateSession(request)

  const { pathname } = request.nextUrl
  if (!GUARDED.has(pathname)) return response

  // Step 2 — read-only auth check (getClaims is in-memory after refresh)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // refresh already handled by updateSession above
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── / (landing) — authenticated users belong at /home ────────────
  if (pathname === "/" && user) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  // ── /session — authenticated users need a profile + free cap ─────
  if (pathname === "/session" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)

    if ((count ?? 0) >= FREE_SESSION_LIMIT) {
      return NextResponse.redirect(new URL("/home", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

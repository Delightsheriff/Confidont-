// ─────────────────────────────────────────────
// app/auth/callback/route.ts
//
// Handles OAuth + magic link redirects.
// Uses server client — cookies() is async in Next.js 15+.
// Uses getClaims() not getSession() per Supabase SSR docs.
//
// This route ONLY exchanges the code for a session and
// redirects. All profile/progress routing is handled
// client-side by /home (which checks localStorage + Supabase).
// ─────────────────────────────────────────────
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/home"

  if (!code) {
    console.error("[auth/callback] Missing code param")
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error(
      "[auth/callback] exchangeCodeForSession error:",
      error.message
    )
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  // Validate session with getClaims (not getSession)
  const { data, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError || !data?.claims) {
    console.error("[auth/callback] getClaims error:", claimsError?.message)
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  // Session established — redirect to app
  // /home handles profile check (localStorage → Supabase → onboarding)
  return NextResponse.redirect(`${origin}${next}`)
}


// ─────────────────────────────────────────────
// app/auth/callback/route.ts
//
// Handles OAuth + magic link redirects.
// Uses server client — cookies() is async in Next.js 15+.
// Uses getClaims() not getSession() per Supabase SSR docs.
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

  const userId = data.claims.sub

  // New user? Send to onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single()

  const destination = profile ? next : "/onboarding"
  return NextResponse.redirect(`${origin}${destination}`)
}

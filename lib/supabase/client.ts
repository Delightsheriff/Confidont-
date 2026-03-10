// ─────────────────────────────────────────────
// lib/supabase/client.ts
//
// Two Supabase client instances:
// - browser() — for client components
// - server() — for server components and API routes
//
// Uses @supabase/ssr for cookie-based session handling.
// This is the correct approach for Next.js App Router.
// ─────────────────────────────────────────────

import { createBrowserClient } from "@supabase/ssr"

export function browser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

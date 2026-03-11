// ─────────────────────────────────────────────
// proxy.ts  (Next.js 16 request proxy)
//
// Runs on every request. Refreshes the Supabase
// auth session so tokens don't expire mid-visit.
// ─────────────────────────────────────────────
import { type NextRequest } from "next/server"
import { updateSession } from "./lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

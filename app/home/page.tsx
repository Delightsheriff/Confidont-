"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import JourneyMap from "@/components/home/JourneyMap"
import {
  hasCompletedOnboarding,
  getProfileFromSupabase,
} from "@/lib/storage/user"
import { useAuth } from "@/hooks/useAuth"

// ─────────────────────────────────────────────
// /home
//
// On mount, three scenarios:
//
// 1. Has local profile → render JourneyMap
// 2. No local profile, authenticated → pull from
//    Supabase (new device / cleared browser)
//    - Found → render JourneyMap
//    - Not found → send to /onboarding
// 3. No local profile, not authenticated → /onboarding
//
// Also syncs session progress from Supabase
// whenever authenticated.
// ─────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { user, isInitialized } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isInitialized) return

    const init = async () => {
      // Has local profile — fast path
      if (hasCompletedOnboarding()) {
        setReady(true)
        return
      }

      // No local profile — check Supabase if authenticated
      // (new device / cleared browser scenario)
      if (user) {
        const profile = await getProfileFromSupabase()
        if (profile) {
          // Found on Supabase — hydrated into localStorage by getProfileFromSupabase
          setReady(true)
          return
        }
      }

      // No profile anywhere — needs onboarding
      router.replace("/onboarding")
    }

    init()
  }, [user, isInitialized, router])

  // Show loading while checking auth (should be instant with SSR)
  if (!isInitialized || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <JourneyMap />
}

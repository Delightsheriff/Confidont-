"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import JourneyMap from "@/components/home/JourneyMap"
import { Spinner } from "@/components/ui/spinner"
import {
  getProfile,
  getProfileFromSupabase,
  pushProfileToSupabase,
  clearProfile,
} from "@/lib/storage/user"
import {
  getProgress,
  fetchProgressFromSupabase,
  syncProgressFromSupabase,
  clearProgress,
} from "@/lib/storage/session"
import { clearGuestSessionCount } from "@/lib/storage/guestSessions"
import { useAuth } from "@/hooks/useAuth"
import type { UserProfile } from "@/types/user"
import type { UserProgress } from "@/lib/storage/session"

// ─────────────────────────────────────────────
// /home
//
// Auth user — Supabase is always the source of truth:
//   - Profile exists in Supabase → returning user.
//     Discard any local onboarding data (could be a re-onboard
//     after sign-out), push guest sessions, then load from Supabase.
//   - No Supabase profile → new user finishing onboarding.
//     Push local profile + sessions to Supabase, then load.
//   - Neither → redirect to /onboarding
//
// Guest user — localStorage only:
//   - Has local profile → render
//   - No profile → redirect to /
// ─────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { user, isInitialized } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [initError, setInitError] = useState(false)

  useEffect(() => {
    if (!isInitialized) return

    const init = async () => {
      setInitError(false)
      try {
      // ── Authenticated user ────────────────────
      if (user) {
        const supabaseProfile = await getProfileFromSupabase()

        if (supabaseProfile) {
          // Returning user — Supabase wins, discard any local re-onboard data
          clearProfile()
          // Still push any guest sessions they completed before signing in
          await syncProgressFromSupabase()
          clearProgress()
          clearGuestSessionCount()
        } else {
          // New user — push their onboarding profile and guest sessions
          const localProfile = getProfile()
          if (!localProfile) {
            // Authenticated but no profile anywhere → they skipped onboarding
            // (e.g. signed in with Google before completing it)
            router.replace("/onboarding")
            return
          }
          await pushProfileToSupabase()
          await syncProgressFromSupabase()
          clearProfile()
          clearProgress()
          clearGuestSessionCount()
        }

        const resolvedProfile = supabaseProfile ?? (await getProfileFromSupabase())
        if (!resolvedProfile) {
          // Profile push may have failed — send back to onboarding to retry
          router.replace("/onboarding")
          return
        }

        const resolvedProgress = await fetchProgressFromSupabase()
        setProfile(resolvedProfile)
        setProgress(resolvedProgress)
        return
      }

      // ── Guest user ────────────────────────────
      const localProfile = getProfile()
      if (localProfile) {
        setProfile(localProfile)
        setProgress(getProgress())
        return
      }

      // No profile anywhere → back to landing
      router.replace("/")
      } catch (err) {
        console.error("[home] init failed:", err)
        setInitError(true)
      }
    }

    init()
  }, [user, isInitialized, router])

  if (initError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="font-mono text-sm text-muted-foreground text-center">
          Something went wrong loading your profile.
        </p>
        <button
          onClick={() => { setInitError(false); setProfile(null); setProgress(null) }}
          className="font-mono text-xs text-primary underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!isInitialized || !profile || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-5" />
      </div>
    )
  }

  return <JourneyMap profile={profile} progress={progress} />
}

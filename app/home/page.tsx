"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import JourneyMap from "@/components/home/JourneyMap"
import { getProfile, getProfileFromSupabase } from "@/lib/storage/user"
import {
  getProgress,
  fetchProgressFromSupabase,
  syncProgressFromSupabase,
} from "@/lib/storage/session"
import { clearGuestSessionCount } from "@/lib/storage/guestSessions"
import { useAuth } from "@/hooks/useAuth"
import type { UserProfile } from "@/types/user"
import type { UserProgress } from "@/lib/storage/session"

// ─────────────────────────────────────────────
// /home
//
// Three scenarios on mount:
//
// 1. Guest with local profile → pass localStorage data to JourneyMap
// 2. Authenticated user → fetch profile + progress from Supabase,
//    pass as props. localStorage is NOT used for auth user data.
//    - If no profile found → redirect to /
// 3. No local profile, not authenticated → redirect to /
// ─────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { user, isInitialized } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [progress, setProgress] = useState<UserProgress | null>(null)

  useEffect(() => {
    if (!isInitialized) return

    const init = async () => {
      // ── Authenticated user ────────────────────
      if (user) {
        // Push any guest sessions to Supabase (guest → auth transition)
        await syncProgressFromSupabase()
        clearGuestSessionCount()

        // Fetch profile — prefer local onboarding data (just signed up),
        // fall back to Supabase (returning user on new device)
        const localProfile = getProfile()
        const resolvedProfile = localProfile ?? (await getProfileFromSupabase())

        if (!resolvedProfile) {
          router.replace("/")
          return
        }

        // Fetch progress from Supabase — never from localStorage for auth users
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
    }

    init()
  }, [user, isInitialized, router])

  if (!isInitialized || !profile || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <JourneyMap profile={profile} progress={progress} />
}

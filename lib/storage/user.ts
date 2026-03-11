// ─────────────────────────────────────────────
// lib/storage/user.ts
//
// Profile persistence — localStorage cache + Supabase.
//
// saveProfile()           — write on onboarding complete
// getProfile()            — fast sync read, localStorage only
// getProfileFromSupabase()— full read for new device / cleared browser
// hasCompletedOnboarding()— gate check
// clearProfile()          — dev/testing only
// ─────────────────────────────────────────────

import type { UserProfile, OnboardingAnswers } from "@/types/user"
import { createClient } from "@/lib/supabase/client"

const PROFILE_KEY = "confidont_profile"

export async function saveProfile(
  answers: OnboardingAnswers
): Promise<{ profile: UserProfile; supabaseSaved: boolean }> {
  const profile: UserProfile = {
    ...answers,
    completedAt: new Date().toISOString(),
  }

  // Always write localStorage first — never blocks
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }

  // Upsert to Supabase if authenticated
  let supabaseSaved = false
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: answers.name,
        pronouns: answers.pronouns,
        goal: answers.goal,
        camera_confidence: answers.cameraConfidence,
        sessions_per_day: answers.sessionsPerDay,
        persona_id: answers.personaId,
        completed_at: profile.completedAt,
      })

      if (error) {
        console.error("[saveProfile] Supabase upsert error:", error.message)
      } else {
        supabaseSaved = true
      }
    }
  } catch (err) {
    console.error("[saveProfile] Unexpected error:", err)
  }

  return { profile, supabaseSaved }
}

// Full read from Supabase — call on app load when authenticated
// but local cache is empty (new device, cleared browser)
export async function getProfileFromSupabase(): Promise<UserProfile | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error || !data) return null

    const profile: UserProfile = {
      name: data.name,
      pronouns: data.pronouns,
      goal: data.goal,
      cameraConfidence: data.camera_confidence,
      sessionsPerDay: data.sessions_per_day,
      personaId: data.persona_id,
      completedAt: data.completed_at,
    }

    // Hydrate local cache
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    return profile
  } catch (err) {
    console.error("[getProfileFromSupabase] error:", err)
    return null
  }
}

// Fast sync read — localStorage only
export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export function hasCompletedOnboarding(): boolean {
  return getProfile() !== null
}

export function clearProfile(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PROFILE_KEY)
  }
}

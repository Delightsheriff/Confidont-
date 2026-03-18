// ─────────────────────────────────────────────
// lib/storage/user.ts
//
// Profile persistence.
//
// saveProfile()           — onboarding complete → localStorage only
// pushProfileToSupabase() — called post-auth → Supabase upsert
// getProfileFromSupabase()— new device / cleared browser recovery
// getProfile()            — fast sync read, localStorage only
// hasCompletedOnboarding()— gate check
// clearProfile()          — dev/testing only
// ─────────────────────────────────────────────

import type { UserProfile, OnboardingAnswers } from "@/types/user"
import { createClient } from "@/lib/supabase/client"

const PROFILE_KEY = "confidont_profile_v1"

// ── Called at end of onboarding ───────────────
// localStorage only — user has no account yet
export function saveProfile(answers: OnboardingAnswers): UserProfile {
  const profile: UserProfile = {
    ...answers,
    completedAt: new Date().toISOString(),
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }
  return profile
}

// ── Called post-auth (after sign-in) ──────────
// Pushes locally saved profile up to Supabase
// Called from useAuth after user transitions null → authenticated
export async function pushProfileToSupabase(): Promise<boolean> {
  const profile = getProfile()
  if (!profile) return false

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase.from("profiles").upsert({
      id:                  user.id,
      name:                profile.name,
      pronouns:            profile.pronouns,
      goal:                profile.goal,
      camera_confidence:   profile.cameraConfidence,
      success_definition:  goalToSuccessDefinition(profile.goal),
      sessions_per_day:    profile.sessionsPerDay,
      persona_id:          profile.personaId,
      completed_at:        profile.completedAt,
    })

    if (error) {
      console.error("[pushProfileToSupabase] error:", error.message)
      return false
    }

    return true
  } catch (err) {
    console.error("[pushProfileToSupabase] unexpected error:", err)
    return false
  }
}

// Map goal → success_definition for Supabase NOT NULL column
function goalToSuccessDefinition(goal: string): string {
  const map: Record<string, string> = {
    "job-interviews": "Feel confident and prepared in video interviews",
    "presentations": "Deliver presentations naturally on camera",
    "video-calls": "Be comfortable and engaged on video calls",
    "content-creation": "Show up authentically on camera for content",
    "general-comfort": "Feel at ease whenever the camera is on",
  }
  return map[goal] ?? "Build confidence on camera"
}

// ── Called on home load for new device ────────
// Authenticated but no local profile — pull from Supabase
export async function getProfileFromSupabase(): Promise<UserProfile | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error || !data) return null

    const profile: UserProfile = {
      name:             data.name,
      pronouns:         data.pronouns,
      goal:             data.goal,
      cameraConfidence: data.camera_confidence,
      sessionsPerDay:   data.sessions_per_day,
      personaId:        data.persona_id,
      completedAt:      data.completed_at,
    }

    // Write to localStorage so the rest of the app can read it synchronously
    // for this session. Cleared on sign-out — not a persistent cross-session cache.
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    return profile
  } catch (err) {
    console.error("[getProfileFromSupabase] error:", err)
    return null
  }
}

// ── Fast sync read ─────────────────────────────
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

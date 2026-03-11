// ─────────────────────────────────────────────
// lib/storage/user.ts
//
// User profile persistence.
// Stub — localStorage now, Supabase later.
// Swap internals only. Nothing that imports changes.
// ─────────────────────────────────────────────

import type { UserProfile, OnboardingAnswers } from "@/types/user"
import { createClient } from "@/lib/supabase/client"

const PROFILE_KEY = "confidont_profile"

// Save to localStorage (fast cache), then upsert to Supabase when authenticated
export async function saveProfile(
  answers: OnboardingAnswers
): Promise<UserProfile> {
  const profile: UserProfile = {
    ...answers,
    completedAt: new Date().toISOString(),
  }

  // Always write to localStorage first
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }

  // Upsert to Supabase when authenticated
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        name: answers.name,
        pronouns: answers.pronouns,
        goal: answers.goal,
        camera_confidence: answers.cameraConfidence,
        success_definition: answers.successDefinition,
        sessions_per_day: answers.sessionsPerDay,
        persona_id: answers.personaId,
        completed_at: profile.completedAt,
      })
    }
  } catch (err) {
    console.error("Supabase profile upsert failed:", err)
  }

  return profile
}

// STUB — swap for Supabase select when ready
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

// For dev/testing only
export function clearProfile(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PROFILE_KEY)
  }
}

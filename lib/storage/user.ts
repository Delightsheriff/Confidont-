// ─────────────────────────────────────────────
// lib/storage/user.ts
//
// User profile persistence.
// Stub — localStorage now, Supabase later.
// Swap internals only. Nothing that imports changes.
// ─────────────────────────────────────────────

import type { UserProfile, OnboardingAnswers } from "@/types/user"

const PROFILE_KEY = "confidont_profile"

// STUB — swap for Supabase upsert when ready
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

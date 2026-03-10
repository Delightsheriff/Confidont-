// ─────────────────────────────────────────────
// lib/logic/dailyLimit.ts
// ─────────────────────────────────────────────
//
// Two distinct situations:
//
// A) isFreeCapReached — used all 4 free sessions total.
//    Hard stop. Must upgrade to continue.
//    Card shows "come back tomorrow" + upgrade prompt.
//
// B) isAtDailyLimit — hit today's chosen limit (e.g. 2/day)
//    but still has free sessions remaining.
//    Soft nudge only. User can always choose to keep going.
//
// Premium users: only situation B ever applies (no ceiling).

import { FREE_SESSION_LIMIT } from "@/configs/tiers"
import type { UserProgress } from "@/lib/storage/session"
import type { UserProfile } from "@/types/user"

export interface DailyStatus {
  sessionsUsedToday: number
  limitForToday: number
  isAtDailyLimit: boolean // hit soft daily preference — nudge, not block
  isFreeCapReached: boolean // used all free sessions — hard stop
  canStartSession: boolean // false only when isFreeCapReached
  nextUnlockDate: string
}

export function getDailyStatus(
  progress: UserProgress,
  profile: UserProfile,
  isPremium: boolean
): DailyStatus {
  const todayStr = new Date().toISOString().split("T")[0]
  const sessionsToday = progress.sessions.filter((s) =>
    s.date.startsWith(todayStr)
  ).length

  const limitForToday = profile.sessionsPerDay
  const isAtDailyLimit = sessionsToday >= limitForToday

  // Only free users have a ceiling
  const isFreeCapReached =
    !isPremium && progress.totalSessions >= FREE_SESSION_LIMIT

  // Hard block only at ceiling — daily limit never blocks
  const canStartSession = !isFreeCapReached

  const midnight = getMidnight()

  return {
    sessionsUsedToday: sessionsToday,
    limitForToday,
    isAtDailyLimit,
    isFreeCapReached,
    canStartSession,
    nextUnlockDate: getNextUnlockLabel(midnight),
  }
}

function getMidnight(): Date {
  const d = new Date()
  d.setHours(24, 0, 0, 0)
  return d
}

function getNextUnlockLabel(midnight: Date): string {
  const diffH = (midnight.getTime() - Date.now()) / 3600000
  if (diffH <= 12) return "tomorrow"
  return midnight.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  })
}

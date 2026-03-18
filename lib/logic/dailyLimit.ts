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

  // Unlock time = 24h after the last session, not midnight
  const lastSessionDate = progress.lastSessionDate

  return {
    sessionsUsedToday: sessionsToday,
    limitForToday,
    isAtDailyLimit,
    isFreeCapReached,
    canStartSession,
    nextUnlockDate: getNextUnlockLabel(lastSessionDate),
  }
}

// 24h after the last session timestamp
function getNextUnlockLabel(lastSessionDate: string | null): string {
  if (!lastSessionDate) return "tomorrow"

  const unlockAt = new Date(
    new Date(lastSessionDate).getTime() + 24 * 60 * 60 * 1000
  )
  const now = new Date()

  if (unlockAt <= now) return "now"

  const timeStr = unlockAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const todayStr = now.toDateString()
  const tomorrowStr = new Date(now.getTime() + 86400000).toDateString()

  if (unlockAt.toDateString() === todayStr) return `at ${timeStr} today`
  if (unlockAt.toDateString() === tomorrowStr) return `at ${timeStr} tomorrow`
  return (
    unlockAt.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
    }) + ` at ${timeStr}`
  )
}

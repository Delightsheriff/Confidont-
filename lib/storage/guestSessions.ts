// ─────────────────────────────────────────────
// lib/storage/guestSessions.ts
//
// Tracks how many sessions a guest user has
// completed without signing in.
//
// Used to decide when to show the auth prompt.
// Cleared when user authenticates and syncs.
// ─────────────────────────────────────────────

const KEY = "confidont_guest_sessions"

export function getGuestSessionCount(): number {
  if (typeof window === "undefined") return 0
  return parseInt(localStorage.getItem(KEY) ?? "0", 10)
}

export function incrementGuestSessionCount(): number {
  const next = getGuestSessionCount() + 1
  localStorage.setItem(KEY, String(next))
  return next
}

export function clearGuestSessionCount(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY)
  }
}

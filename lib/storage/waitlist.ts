// ─────────────────────────────────────────────
// lib/storage/waitlist.ts
//
// Waitlist email capture.
// Stub — localStorage now.
// Swap for Mailchimp / Resend / Supabase later.
// ─────────────────────────────────────────────

const WAITLIST_KEY = "confidont_waitlist"

export interface WaitlistEntry {
  email: string
  joinedAt: string
}

// STUB — swap for API call when ready
export async function joinWaitlist(
  email: string
): Promise<{ success: boolean; alreadyJoined: boolean }> {
  if (typeof window === "undefined")
    return { success: false, alreadyJoined: false }

  try {
    const existing = getWaitlistEntries()
    const already = existing.some(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    )

    if (already) return { success: true, alreadyJoined: true }

    const entry: WaitlistEntry = {
      email: email.toLowerCase().trim(),
      joinedAt: new Date().toISOString(),
    }

    localStorage.setItem(WAITLIST_KEY, JSON.stringify([...existing, entry]))
    return { success: true, alreadyJoined: false }
  } catch {
    return { success: false, alreadyJoined: false }
  }
}

export function getWaitlistEntries(): WaitlistEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(WAITLIST_KEY)
    return raw ? (JSON.parse(raw) as WaitlistEntry[]) : []
  } catch {
    return []
  }
}

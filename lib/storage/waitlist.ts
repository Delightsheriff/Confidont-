// ─────────────────────────────────────────────
// lib/storage/waitlist.ts
//
// Waitlist — Supabase insert + Resend emails.
//
// On join:
// 1. Insert to Supabase waitlist table
// 2. POST to /api/waitlist/notify — sends emails
//    via Resend (non-blocking, won't break UX)
// ─────────────────────────────────────────────

import { createClient } from "@/lib/supabase/client"

export async function joinWaitlist(
  email: string
): Promise<{ success: boolean; alreadyJoined: boolean }> {
  const trimmed = email.toLowerCase().trim()

  try {
    const supabase = createClient()

    const { error } = await supabase.from("waitlist").insert({ email: trimmed })

    if (error) {
      // Postgres unique violation — already on the list
      if (error.code === "23505") return { success: true, alreadyJoined: true }
      console.error("[waitlist] Supabase insert error:", error.message)
      return { success: false, alreadyJoined: false }
    }

    // Fire emails — non-blocking, won't affect UX on failure
    sendWaitlistEmails(trimmed).catch((err) =>
      console.error("[waitlist] Email send error:", err)
    )

    return { success: true, alreadyJoined: false }
  } catch (err) {
    console.error("[waitlist] Unexpected error:", err)
    return { success: false, alreadyJoined: false }
  }
}

async function sendWaitlistEmails(email: string): Promise<void> {
  await fetch("/api/waitlist/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
}

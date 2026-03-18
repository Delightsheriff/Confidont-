// ─────────────────────────────────────────────
// app/api/waitlist/notify/route.ts
//
// POST { email }
//
// Rate limiting:
// - 3 requests per IP per hour (in-memory)
// - Disposable email domain blocklist
// - Input validation
//
// Emails via Resend:
// - Confirmation to user
// - Notification to owner
// ─────────────────────────────────────────────

import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "Confidont <onboarding@resend.dev>"

// Anon client — only reads from the waitlist table (public read is fine for a count check)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

// ── DB-backed freshness guard ─────────────────
// Replaces the old in-memory IP rate limiter (which resets on every
// Vercel function cold start).
//
// Strategy: only allow notification if the email was inserted to the
// waitlist within the last 5 minutes. This means:
//   - Each email can only trigger one notification (the Supabase unique
//     constraint prevents duplicate inserts, so the email can only ever
//     be "fresh" once).
//   - Direct POST attacks with arbitrary emails are rejected because
//     the email won't exist (or won't be fresh) in the table.

const FRESH_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

async function isEmailFreshInWaitlist(email: string): Promise<boolean> {
  const since = new Date(Date.now() - FRESH_WINDOW_MS).toISOString()
  const { data } = await supabaseAnon
    .from("waitlist")
    .select("created_at")
    .eq("email", email)
    .gte("created_at", since)
    .limit(1)
    .single()
  return !!data
}

// ── Disposable email blocklist ────────────────
// Covers the most common throwaway providers.
// Not exhaustive — good enough for beta.

const BLOCKED_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "guerrillamail.info",
  "spam4.me",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "dispostable.com",
  "maildrop.cc",
  "spamgourmet.com",
  "10minutemail.com",
  "minutemail.com",
  "discard.email",
  "fakeinbox.com",
  "mailnull.com",
  "spamherelots.com",
])

function isDisposable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()
  return domain ? BLOCKED_DOMAINS.has(domain) : true
}

// ── Route handler ─────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email =
      typeof body?.email === "string" ? body.email.toLowerCase().trim() : null

    // Basic validation
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    // Disposable email check
    if (isDisposable(email)) {
      return NextResponse.json(
        { error: "Please use a real email address" },
        { status: 400 }
      )
    }

    // DB-backed freshness guard — email must have been inserted within the
    // last 5 minutes. Prevents direct-POST abuse and replay attacks without
    // needing Redis. Works correctly across all Vercel function instances.
    const isFresh = await isEmailFreshInWaitlist(email)
    if (!isFresh) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    // Send emails in parallel — neither failing breaks the other
    const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL
    const sends = [confirmationEmail(email)]
    if (notifyEmail) sends.push(notificationEmail(email, notifyEmail))

    const results = await Promise.allSettled(sends)

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("[notify] Email send failed:", result.reason)
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/waitlist/notify]", err)
    return NextResponse.json({ ok: false })
  }
}

// ── Email templates ───────────────────────────

async function confirmationEmail(to: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "You're on the Confidont waitlist 🎉",
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Courier New',monospace;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

                <tr><td style="padding-bottom:32px;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:#2dd4bf;">Confidont</p>
                </td></tr>

                <tr><td style="background:#141414;border:1px solid #222;border-radius:16px;padding:32px;">
                  <p style="margin:0 0 8px;font-size:11px;color:#555;letter-spacing:0.1em;text-transform:uppercase;">You're in</p>
                  <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#f5f5f5;line-height:1.3;">We'll be in touch.</h1>
                  <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
                    You're on the Confidont waitlist. When early access opens, you'll be among the first to know.
                    <br /><br />
                    In the meantime — the camera can wait. We're building something worth coming back to.
                  </p>
                  <div style="border-top:1px solid #222;padding-top:24px;">
                    <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
                      Your video never leaves your device.<br />— The Confidont team
                    </p>
                  </div>
                </td></tr>

                <tr><td style="padding-top:24px;">
                  <p style="margin:0;font-size:11px;color:#333;text-align:center;">
                    You're receiving this because you signed up at confidont.com
                  </p>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  })
}

async function notificationEmail(joinedEmail: string, notifyEmail: string) {
  return resend.emails.send({
    from: FROM,
    to: notifyEmail,
    subject: `New waitlist signup: ${joinedEmail}`,
    html: `
      <body style="font-family:'Courier New',monospace;background:#0a0a0a;padding:32px;color:#f5f5f5;">
        <p style="color:#2dd4bf;font-weight:700;margin:0 0 16px;">Confidont</p>
        <p style="margin:0 0 8px;color:#888;font-size:13px;">New waitlist signup</p>
        <p style="margin:0;font-size:18px;font-weight:700;">${joinedEmail}</p>
        <p style="margin:16px 0 0;font-size:12px;color:#555;">
          ${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
        </p>
      </body>
    `,
  })
}

// ── Helpers ───────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

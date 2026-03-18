// ─────────────────────────────────────────────
// lib/ai/feedback.ts
//
// Post-session feedback generation.
// Calls /api/session/feedback (server-side Groq).
// Falls back to score-based stub if the API fails —
// the session summary must always render something.
//
// Nothing that imports this file needs to change.
// ─────────────────────────────────────────────

export interface GenerateFeedbackInput {
  personaName: string
  userName: string
  goal: string
  phase: number
  eyeContactPercent: number
  composurePercent: number
  fillerWordCount: number
  durationSeconds: number
  totalSessions: number
}

export interface SessionFeedback {
  message: string
  highlight: string
  focusNext: string
  pointsEarned: number
  aiGenerated?: boolean  // present at runtime; absent in stored session data
}

export async function generateFeedback(
  input: GenerateFeedbackInput
): Promise<SessionFeedback> {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "false") {
    try {
      const res = await fetch("/api/session/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (res.ok) {
        const feedback: SessionFeedback = await res.json()
        if (feedback.message && feedback.highlight && feedback.focusNext)
          return { ...feedback, aiGenerated: true }
      } else {
        console.warn(
          "[generateFeedback] API returned",
          res.status,
          "— falling back to stub"
        )
      }
    } catch (err) {
      console.warn(
        "[generateFeedback] fetch failed — falling back to stub:",
        err
      )
    }
  }

  // ── Fallback — score-based stub ───────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    await new Promise((r) => setTimeout(r, 600))
  }

  const {
    userName,
    eyeContactPercent,
    composurePercent,
    fillerWordCount,
    durationSeconds,
    phase,
    totalSessions,
  } = input

  const highlight =
    eyeContactPercent >= composurePercent
      ? eyeContactPercent >= 65
        ? "Your eye contact felt natural and present — that kind of connection comes through clearly on camera."
        : "You were working to stay with the camera, and that effort is exactly how this gets easier."
      : composurePercent >= 65
        ? "You stayed grounded and still the whole way through — that calm reads as real confidence."
        : "Staying settled is something you were working on today, and noticing it is already half the work."

  const focusNext =
    eyeContactPercent < 45
      ? "Next session, try treating the camera lens like a person's eyes — soft focus, not a stare. Look just above it if direct feels like too much."
      : composurePercent < 45
        ? "See if you can find where the restlessness lives — shoulders, hands, posture. Just pick one thing to let settle."
        : fillerWordCount > 3
          ? "When you feel a filler word coming, try a breath instead. A short pause reads as confidence, not hesitation."
          : "You're building something real here. Stay consistent and let the reps do the work."

  const opening =
    totalSessions === 0
      ? `You showed up. That's the hardest part, ${userName}, and you did it.`
      : phase === 1
        ? `Good session, ${userName}.`
        : phase === 2
          ? `You're finding your rhythm, ${userName}.`
          : `Solid work today, ${userName}.`

  const closing =
    totalSessions === 0
      ? "First sessions are about getting comfortable being here — and you did that."
      : durationSeconds >= 60
        ? "You stayed with it the whole way through."
        : "Even short sessions compound over time."

  const message = `${opening} ${highlight} ${closing}`

  const points = Math.round(
    eyeContactPercent * 0.4 +
      composurePercent * 0.3 +
      Math.max(0, 10 - fillerWordCount) * 3 +
      Math.min(durationSeconds / 60, 2) * 10
  )

  return { message, highlight, focusNext, pointsEarned: points, aiGenerated: false }
}

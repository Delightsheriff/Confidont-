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
          return feedback
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
  } = input

  const highlight =
    eyeContactPercent >= composurePercent
      ? eyeContactPercent >= 65
        ? "Your eye contact was consistently strong — that reads as real presence on screen."
        : "You were making an effort to stay with the camera — that awareness matters."
      : composurePercent >= 65
        ? "You stayed composed and grounded throughout — that physical stillness reads as confidence."
        : "You were working on staying still — that self-awareness is the first step."

  const focusNext =
    eyeContactPercent < 45
      ? "Next session, try treating the camera lens as a person — look just above it if direct feels too intense."
      : composurePercent < 45
        ? "Notice where the restlessness lives — shoulders, hands, posture. Pick one thing to settle."
        : fillerWordCount > 3
          ? "Try replacing filler words with a short pause — silence reads as confidence, not hesitation."
          : "You're building a solid foundation. Keep the consistency going."

  const opening =
    phase === 1
      ? `Great first step, ${userName}.`
      : phase === 2
        ? `Good session, ${userName}.`
        : `Strong work today, ${userName}.`

  const message = `${opening} ${highlight} ${
    durationSeconds >= 60
      ? "You stayed with it the whole way through."
      : "Even short sessions build the habit."
  }`

  const points = Math.round(
    eyeContactPercent * 0.4 +
      composurePercent * 0.3 +
      Math.max(0, 10 - fillerWordCount) * 3 +
      Math.min(durationSeconds / 60, 2) * 10
  )

  return { message, highlight, focusNext, pointsEarned: points }
}

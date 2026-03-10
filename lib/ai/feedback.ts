// ─────────────────────────────────────────────
// lib/ai/feedback.ts
//
// Post-session feedback generation.
// Stub implementation — returns persona-toned
// hardcoded feedback based on scores.
//
// To swap: replace generateFeedback internals with
// a Vercel AI SDK streamText call to /api/session/feedback
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
  message: string // persona's post-session message
  highlight: string // one thing that went well
  focusNext: string // one thing to work on next session
  pointsEarned: number
}

// STUB — swap internals for real API call when ready
export async function generateFeedback(
  input: GenerateFeedbackInput
): Promise<SessionFeedback> {
  if (process.env.NODE_ENV === "development") {
    await new Promise((r) => setTimeout(r, 600))
  }

  const {
    personaName,
    userName,
    eyeContactPercent,
    composurePercent,
    fillerWordCount,
    durationSeconds,
    phase,
  } = input

  // Determine highlight based on best metric
  const highlight =
    eyeContactPercent >= composurePercent
      ? `Your eye contact was at ${eyeContactPercent}% — that's real progress.`
      : `You stayed composed and steady throughout — ${composurePercent}% composure is solid.`

  // Determine focus based on weakest metric
  const focusNext =
    eyeContactPercent < composurePercent
      ? "Next session, try to keep your gaze toward the camera a little longer."
      : fillerWordCount > 3
        ? "Try replacing filler words with a short pause — silence reads as confidence."
        : "Keep building on your composure — you're finding your rhythm."

  // Phase-appropriate opening tone
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

  // Points calculation — rough formula, tune with real data later
  const points = Math.round(
    eyeContactPercent * 0.4 +
      composurePercent * 0.3 +
      Math.max(0, 10 - fillerWordCount) * 3 +
      Math.min(durationSeconds / 60, 2) * 10
  )

  return { message, highlight, focusNext, pointsEarned: points }
}

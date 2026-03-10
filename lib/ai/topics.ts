// ─────────────────────────────────────────────
// lib/ai/topics.ts
//
// Topic generation for session start.
// Stub implementation — returns hardcoded topics.
//
// To swap: replace generateTopics internals with
// a Vercel AI SDK call to /api/session/generate-topics
// Nothing that imports this file needs to change.
// ─────────────────────────────────────────────

export interface SessionTopic {
  topic: string
  prompt: string // what the persona says to introduce it
  difficulty: 1 | 2 | 3 | 4 | 5
  targetingWeakness: string | null // internal only, never shown to user
  durationSeconds: number // how long user speaks on this topic
}

export interface GenerateTopicsInput {
  name: string
  goal: string
  phase: number
  weakAreas: string[]
  completedTopics: string[]
  totalSessions: number
}

// STUB — swap internals for real API call when ready
export async function generateTopics(
  input: GenerateTopicsInput
): Promise<SessionTopic[]> {
  // Simulate network latency in dev so UI loading states work
  if (process.env.NODE_ENV === "development") {
    await new Promise((r) => setTimeout(r, 800))
  }

  // Hardcoded topics by phase — real AI will personalise these
  const topicsByPhase: Record<number, SessionTopic[]> = {
    1: [
      {
        topic: "Your favourite meal",
        prompt:
          "Tell me about your favourite meal — what is it and why do you love it?",
        difficulty: 1,
        targetingWeakness: null,
        durationSeconds: 60,
      },
      {
        topic: "A place you enjoy",
        prompt:
          "Describe a place you love spending time. What makes it special?",
        difficulty: 1,
        targetingWeakness: null,
        durationSeconds: 60,
      },
      {
        topic: "Something you enjoy doing",
        prompt: "What's something you genuinely enjoy doing in your free time?",
        difficulty: 1,
        targetingWeakness: null,
        durationSeconds: 60,
      },
    ],
    2: [
      {
        topic: "Something you're good at",
        prompt:
          "Tell me about something you're genuinely good at. How did you get there?",
        difficulty: 2,
        targetingWeakness: "eye contact",
        durationSeconds: 75,
      },
      {
        topic: "Someone you admire",
        prompt:
          "Who's someone you admire and what is it about them that stands out?",
        difficulty: 2,
        targetingWeakness: null,
        durationSeconds: 75,
      },
    ],
    3: [
      {
        topic: "A challenge you overcame",
        prompt:
          "Tell me about a time something didn't go to plan — and how you handled it.",
        difficulty: 3,
        targetingWeakness: "eye contact",
        durationSeconds: 90,
      },
      {
        topic: "Something you're proud of",
        prompt:
          "What's one thing you've done recently that you're genuinely proud of?",
        difficulty: 3,
        targetingWeakness: null,
        durationSeconds: 90,
      },
    ],
    4: [
      {
        topic: "Your biggest strength",
        prompt: "Sell me on your biggest strength. You have 60 seconds.",
        difficulty: 4,
        targetingWeakness: "composure",
        durationSeconds: 60,
      },
      {
        topic: "A weakness and what you're doing about it",
        prompt:
          "What's an area you're actively working to improve, and what are you doing about it?",
        difficulty: 5,
        targetingWeakness: "eye contact",
        durationSeconds: 90,
      },
    ],
  }

  const phase = Math.min(Math.max(input.phase, 1), 4)
  const topics = topicsByPhase[phase] ?? topicsByPhase[1]

  // Filter out topics the user has already completed
  const fresh = topics.filter((t) => !input.completedTopics.includes(t.topic))

  // Return up to 3 topics, falling back to all if filtered too aggressively
  return (fresh.length > 0 ? fresh : topics).slice(0, 3)
}

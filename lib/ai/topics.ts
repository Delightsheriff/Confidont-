// ─────────────────────────────────────────────
// lib/ai/topics.ts
//
// Topic generation for session start.
// Calls /api/session/topics (server-side Groq).
// Falls back to hardcoded topics if the API fails —
// a broken AI should never block a session from starting.
//
// Nothing that imports this file needs to change.
// ─────────────────────────────────────────────

export interface SessionTopic {
  topic: string
  prompt: string
  difficulty: 1 | 2 | 3 | 4 | 5
  targetingWeakness: string | null
  durationSeconds: number
}

export interface GenerateTopicsInput {
  name: string
  goal: string
  phase: number
  weakAreas: string[]
  completedTopics: string[]
  totalSessions: number
}

export async function generateTopics(
  input: GenerateTopicsInput
): Promise<SessionTopic[]> {
  // Only attempt API call if key is configured
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "false") {
    try {
      const res = await fetch("/api/session/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (res.ok) {
        const topics: SessionTopic[] = await res.json()
        if (Array.isArray(topics) && topics.length > 0) return topics
      } else {
        console.warn(
          "[generateTopics] API returned",
          res.status,
          "— falling back to stub"
        )
      }
    } catch (err) {
      console.warn("[generateTopics] fetch failed — falling back to stub:", err)
    }
  }

  // ── Fallback — hardcoded topics ───────────────────────────────────
  // Runs in dev before GROQ_API_KEY is set, or if the API call fails.
  if (process.env.NODE_ENV === "development") {
    await new Promise((r) => setTimeout(r, 800))
  }

  const topicsByPhase: Record<number, SessionTopic[]> = {
    1: [
      {
        topic: "Your favourite meal",
        prompt:
          "I'd love to hear about your favourite meal — what is it, and what makes it so good?",
        difficulty: 1,
        targetingWeakness: null,
        durationSeconds: 60,
      },
      {
        topic: "A place you love",
        prompt:
          "Tell me about a place you really enjoy spending time. What draws you back there?",
        difficulty: 1,
        targetingWeakness: null,
        durationSeconds: 60,
      },
      {
        topic: "Something you enjoy doing",
        prompt:
          "I'm curious — what's something you genuinely look forward to doing when you have free time?",
        difficulty: 1,
        targetingWeakness: null,
        durationSeconds: 60,
      },
    ],
    2: [
      {
        topic: "Something you're good at",
        prompt:
          "Tell me about something you're genuinely good at. I'd love to know how you got there.",
        difficulty: 2,
        targetingWeakness: "eye contact",
        durationSeconds: 75,
      },
      {
        topic: "Someone you admire",
        prompt:
          "Is there someone — anyone — you really admire? Tell me what stands out about them.",
        difficulty: 2,
        targetingWeakness: null,
        durationSeconds: 75,
      },
    ],
    3: [
      {
        topic: "A challenge you navigated",
        prompt:
          "Think of a time something didn't go to plan. What happened, and how did you find your way through it?",
        difficulty: 3,
        targetingWeakness: "eye contact",
        durationSeconds: 90,
      },
      {
        topic: "Something you're proud of",
        prompt:
          "What's one thing you've done — recently or not — that you feel genuinely good about?",
        difficulty: 3,
        targetingWeakness: null,
        durationSeconds: 90,
      },
    ],
    4: [
      {
        topic: "Your biggest strength",
        prompt:
          "If you had to pick one strength that genuinely sets you apart, what would it be — and why?",
        difficulty: 4,
        targetingWeakness: "composure",
        durationSeconds: 90,
      },
      {
        topic: "An area you're working on",
        prompt:
          "We all have things we're actively working on. What's one area you're investing in right now — and what does that look like for you?",
        difficulty: 5,
        targetingWeakness: "eye contact",
        durationSeconds: 90,
      },
    ],
  }

  const phase = Math.min(Math.max(input.phase, 1), 4)
  const topics = topicsByPhase[phase] ?? topicsByPhase[1]
  const fresh = topics.filter((t) => !input.completedTopics.includes(t.topic))
  return (fresh.length > 0 ? fresh : topics).slice(0, 3)
}

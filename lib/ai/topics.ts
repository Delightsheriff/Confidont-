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
  const fresh = topics.filter((t) => !input.completedTopics.includes(t.topic))
  return (fresh.length > 0 ? fresh : topics).slice(0, 3)
}

import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import type { GenerateTopicsInput, SessionTopic } from "@/lib/ai/topics"

// ─────────────────────────────────────────────
// POST /api/session/topics
//
// Server-side only. Groq API key never reaches client.
// Returns 2-3 personalised session topics based on
// user phase, weak areas, and completed topic history.
// ─────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are a session topic generator for Confidont, a camera confidence coaching app.

Your job is to generate 3 short speaking topics for a user's practice session.
Each topic should feel natural and low-stakes — the goal is to get the user talking on camera, not to test them.

Rules:
- Topics progress in difficulty within the session (easiest first)
- Phase 1: deeply personal and comfortable (food, hobbies, favourite places)
- Phase 2: slightly more reflective (skills, people they admire, recent wins)
- Phase 3: professional and narrative (challenges, decisions, achievements)
- Phase 4: high-stakes simulation (pitches, interview questions, persuasion)
- Never repeat topics from completedTopics
- If weakAreas includes "eye contact" or "composure", bias toward topics that are conversational and lower anxiety
- If weakAreas includes "filler words", bias toward topics that require deliberate structured answers
- Prompts should sound like a warm coach asking, not a test paper

Respond ONLY with valid JSON. No explanation, no markdown, no backticks.
Format:
[
  {
    "topic": "short title",
    "prompt": "what the coach says to introduce this topic",
    "difficulty": 1,
    "targetingWeakness": null,
    "durationSeconds": 60
  }
]`

export async function POST(req: Request) {
  try {
    const input: GenerateTopicsInput = await req.json()

    const userContext = `
User: ${input.name}
Goal: ${input.goal}
Phase: ${input.phase} of 4
Sessions completed: ${input.totalSessions}
Weak areas: ${input.weakAreas.length > 0 ? input.weakAreas.join(", ") : "none identified yet"}
Topics already completed: ${input.completedTopics.length > 0 ? input.completedTopics.join(", ") : "none"}

Generate exactly 3 topics appropriate for Phase ${input.phase}. Avoid repeating any completed topics.
`.trim()

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContext },
      ],
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0]?.message?.content ?? "[]"

    // Groq with json_object mode wraps arrays — unwrap if needed
    let parsed: SessionTopic[]
    try {
      const obj = JSON.parse(raw)
      // Handle both `[...]` and `{ "topics": [...] }` shapes
      parsed = Array.isArray(obj)
        ? obj
        : (obj.topics ?? obj.data ?? Object.values(obj)[0])
    } catch {
      console.error("[topics] JSON parse failed:", raw)
      return NextResponse.json(
        { error: "Invalid AI response" },
        { status: 502 }
      )
    }

    // Validate shape — fallback to stub if Groq returns garbage
    const valid = parsed
      .filter((t) => t.topic && t.prompt && typeof t.difficulty === "number")
      .slice(0, 3)

    if (valid.length === 0) {
      return NextResponse.json(
        { error: "No valid topics returned" },
        { status: 502 }
      )
    }

    return NextResponse.json(valid)
  } catch (err) {
    console.error("[/api/session/topics] error:", err)
    return NextResponse.json(
      { error: "Topic generation failed" },
      { status: 500 }
    )
  }
}

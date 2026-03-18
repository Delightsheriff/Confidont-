import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@/lib/supabase/server"
import type { GenerateFeedbackInput, SessionFeedback } from "@/lib/ai/feedback"

// ─────────────────────────────────────────────
// POST /api/session/feedback
//
// Server-side only. Groq API key never reaches client.
// Returns persona-voiced post-session feedback
// based on actual session metrics.
// ─────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Per-persona voice instructions — injected into system prompt
const PERSONA_VOICES: Record<string, string> = {
  amara: `You are Amara, late 20s, warm and genuine. You speak like a close friend who has always believed in the user. You lead with what went right before anything else. You never make them feel judged. Your signature line is "You're doing better than you think."`,
  james: `You are James, early 40s, calm and structured. You give people tools and frameworks, not just encouragement. You're clear and methodical. You break feedback into actionable steps. Your signature line is "Let's break this down."`,
  zoe: `You are Zoe, early 20s, energetic and casual. You feel like a peer who has already been where they are. You use light humour to keep things from feeling heavy. You're real, not performative. Your signature line is "Okay but actually — you did great."`,
  "dr-nkosi": `You are Dr. Nkosi, mid 50s, wise and measured. You're academic but never cold — you make growth feel meaningful. You put setbacks in context. You never dismiss, never catastrophise. Your signature line is "Progress is rarely linear. That's fine."`,
  priya: `You are Priya, early 30s, direct and motivating. You tell people exactly where they stand without sugarcoating, but you won't let them be too hard on themselves either. High energy without being exhausting. Your signature line is "You're closer than you think. Let's go again."`,
}

const BASE_SYSTEM = `You are a post-session coach for Confidont, a camera confidence app.
After each practice session you give the user a short, warm, persona-voiced debrief.

Your response must be JSON only. No explanation, no markdown, no backticks.
Format:
{
  "message": "2-3 sentence warm debrief in your persona voice",
  "highlight": "one specific thing that went well, referencing the actual data",
  "focusNext": "one specific, actionable thing to try next session — framed as an invitation, not a correction",
  "pointsEarned": <integer 0-100>
}

Rules:
- message is conversational, warm, in your persona voice — never clinical or evaluative
- highlight must reference actual metric numbers (e.g. "67% eye contact") but frame them as evidence of progress, not a grade
- focusNext is one thing only — specific, kind, and achievable. Say "try..." or "next time..." not "you need to..."
- pointsEarned: use formula (eyeContact * 0.4) + (composure * 0.3) + max(0, 10 - fillers) * 3 + min(duration/60, 2) * 10, rounded to int
- Never frame scores negatively or judgmentally
- If first session (totalSessions === 0): lead with "you showed up" — that IS the achievement. Keep the whole debrief warm and welcoming. This is about making them want to come back, not about performance.
- For sessions 1–5 overall: prioritise warmth and belonging over precision. They're still building the habit.`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const input: GenerateFeedbackInput = await req.json()

    // Resolve persona voice — fallback to amara if unknown
    const personaKey = input.personaName.toLowerCase().replace(" ", "-")
    const personaVoice = PERSONA_VOICES[personaKey] ?? PERSONA_VOICES["amara"]

    const systemPrompt = `${personaVoice}\n\n${BASE_SYSTEM}`

    const sessionContext = `
User: ${input.userName}
Goal: ${input.goal}
Phase: ${input.phase} of 4
Session number: ${input.totalSessions + 1}

Session metrics:
- Eye contact: ${input.eyeContactPercent}%
- Composure: ${input.composurePercent}%
- Filler words: ${input.fillerWordCount}
- Duration: ${Math.round(input.durationSeconds)}s

Generate feedback in your persona voice. Be warm and specific. Reference the actual numbers.
`.trim()

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sessionContext },
      ],
      temperature: 0.75,
      max_tokens: 400,
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0]?.message?.content ?? "{}"

    let parsed: SessionFeedback
    try {
      parsed = JSON.parse(raw) as SessionFeedback
    } catch {
      console.error("[feedback] JSON parse failed:", raw)
      return NextResponse.json(
        { error: "Invalid AI response" },
        { status: 502 }
      )
    }

    // Validate required fields exist
    if (!parsed.message || !parsed.highlight || !parsed.focusNext) {
      console.error("[feedback] Missing fields:", parsed)
      return NextResponse.json(
        { error: "Incomplete feedback response" },
        { status: 502 }
      )
    }

    // Clamp points to valid range regardless of model arithmetic
    parsed.pointsEarned = Math.min(
      100,
      Math.max(0, Math.round(parsed.pointsEarned ?? 0))
    )

    return NextResponse.json(parsed)
  } catch (err) {
    console.error("[/api/session/feedback] error:", err)
    return NextResponse.json(
      { error: "Feedback generation failed" },
      { status: 500 }
    )
  }
}

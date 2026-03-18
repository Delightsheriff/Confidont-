// __tests__/feedback.test.ts
//
// Smoke tests for the feedback fallback.
// These run against the stub path (no Groq API call) by setting
// NEXT_PUBLIC_AI_ENABLED=false so tests are fast and offline.

import { describe, it, expect, beforeEach, vi } from "vitest"

// Disable AI so the fallback path runs every time
process.env.NEXT_PUBLIC_AI_ENABLED = "false"
// fetch is not called in the fallback path — but mock it anyway so any
// accidental call fails loudly rather than hanging
global.fetch = vi.fn().mockRejectedValue(new Error("fetch should not be called in fallback tests"))

import { generateFeedback } from "../lib/ai/feedback"
import type { GenerateFeedbackInput } from "../lib/ai/feedback"

const BASE_INPUT: GenerateFeedbackInput = {
  personaName: "Amara",
  userName: "Test",
  goal: "job-interviews",
  phase: 1,
  eyeContactPercent: 70,
  composurePercent: 65,
  fillerWordCount: 2,
  durationSeconds: 90,
  totalSessions: 0,
}

describe("generateFeedback fallback", () => {
  it("returns all required fields", async () => {
    const fb = await generateFeedback(BASE_INPUT)
    expect(fb.message).toBeTruthy()
    expect(fb.highlight).toBeTruthy()
    expect(fb.focusNext).toBeTruthy()
    expect(typeof fb.pointsEarned).toBe("number")
  })

  it("pointsEarned is non-negative", async () => {
    const fb = await generateFeedback(BASE_INPUT)
    expect(fb.pointsEarned).toBeGreaterThanOrEqual(0)
  })

  it("pointsEarned is lower with poor scores than with good scores", async () => {
    const [poor, good] = await Promise.all([
      generateFeedback({ ...BASE_INPUT, eyeContactPercent: 10, composurePercent: 10, fillerWordCount: 20, durationSeconds: 10 }),
      generateFeedback({ ...BASE_INPUT, eyeContactPercent: 90, composurePercent: 90, fillerWordCount: 0, durationSeconds: 120 }),
    ])
    expect(poor.pointsEarned).toBeLessThan(good.pointsEarned)
  })

  it("first ever session (totalSessions 0) uses welcome language", async () => {
    const fb = await generateFeedback({ ...BASE_INPUT, totalSessions: 0 })
    expect(fb.message).toMatch(/showed up|hardest part/i)
  })

  it("phase 1 returning session uses phase-1 language", async () => {
    const fb = await generateFeedback({ ...BASE_INPUT, totalSessions: 1, phase: 1 })
    expect(fb.message).toMatch(/good session/i)
  })

  it("phase 2 opening uses different language than phase 1", async () => {
    const [p1, p2] = await Promise.all([
      generateFeedback({ ...BASE_INPUT, totalSessions: 1, phase: 1 }),
      generateFeedback({ ...BASE_INPUT, totalSessions: 1, phase: 2 }),
    ])
    expect(p1.message).not.toBe(p2.message)
  })

  it("poor eye contact → focusNext mentions camera or eye contact", async () => {
    const fb = await generateFeedback({ ...BASE_INPUT, eyeContactPercent: 20 })
    expect(fb.focusNext.toLowerCase()).toMatch(/camera|eye|lens/)
  })

  it("poor composure → focusNext mentions stillness or restlessness", async () => {
    const fb = await generateFeedback({
      ...BASE_INPUT,
      eyeContactPercent: 80,
      composurePercent: 20,
    })
    expect(fb.focusNext.toLowerCase()).toMatch(/still|restless|shoulder|posture|hands/)
  })

  it("high filler count → focusNext mentions filler words or pause", async () => {
    const fb = await generateFeedback({
      ...BASE_INPUT,
      eyeContactPercent: 80,
      composurePercent: 80,
      fillerWordCount: 10,
    })
    expect(fb.focusNext.toLowerCase()).toMatch(/filler|pause|silence/)
  })
})

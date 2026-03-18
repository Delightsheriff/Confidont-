// __tests__/session-storage.test.ts
//
// Smoke tests for saveSession, getProgress, and phase progression.
// Uses a localStorage mock — no browser or Supabase needed.

import { describe, it, expect, beforeEach, vi } from "vitest"

// ── localStorage mock ──────────────────────────────────────────────────
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
}
vi.stubGlobal("localStorage", localStorageMock)
vi.stubGlobal("window", { localStorage: localStorageMock })

// ── Supabase mock — return no user so sync path is skipped ─────────────
vi.mock("../lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}))

import {
  saveSession,
  getProgress,
  clearProgress,
} from "../lib/storage/session"
import type { StoredSession } from "../lib/storage/session"

function makeSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: `session_${Date.now()}_${Math.random()}`,
    date: new Date().toISOString(),
    phase: 1,
    topics: [{ topic: "Test", prompt: "Talk about test", difficulty: 1, targetingWeakness: null, durationSeconds: 60 }],
    score: {
      eyeContactPercent: 70,
      composurePercent: 65,
      fillerWordCount: 2,
      speechPaceAvg: null,
      totalPoints: 42,
      durationSeconds: 90,
    },
    feedback: {
      message: "Good session",
      highlight: "Eye contact was solid",
      focusNext: "Work on composure",
      pointsEarned: 42,
    },
    thumbnailDataUrl: null,
    ...overrides,
  }
}

describe("saveSession", () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it("returns localSaved: true on success", async () => {
    const result = await saveSession(makeSession())
    expect(result.localSaved).toBe(true)
  })

  it("returns syncedToCloud: null when no user", async () => {
    const result = await saveSession(makeSession())
    expect(result.syncedToCloud).toBeNull()
  })

  it("persists session to localStorage", async () => {
    const session = makeSession()
    await saveSession(session)
    const progress = getProgress()
    expect(progress.sessions).toHaveLength(1)
    expect(progress.sessions[0].id).toBe(session.id)
  })

  it("increments totalSessions on each save", async () => {
    await saveSession(makeSession())
    await saveSession(makeSession())
    const progress = getProgress()
    expect(progress.totalSessions).toBe(2)
  })

  it("accumulates totalPoints from pointsEarned", async () => {
    await saveSession(makeSession({ feedback: { message: "", highlight: "", focusNext: "", pointsEarned: 30 } }))
    await saveSession(makeSession({ feedback: { message: "", highlight: "", focusNext: "", pointsEarned: 20 } }))
    expect(getProgress().totalPoints).toBe(50)
  })

  it("keeps at most 100 sessions", async () => {
    const saves = Array.from({ length: 105 }, () => saveSession(makeSession()))
    await Promise.all(saves)
    expect(getProgress().sessions.length).toBeLessThanOrEqual(100)
  })
})

describe("phase progression", () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it("stays at phase 1 after fewer than 3 sessions", async () => {
    await saveSession(makeSession({ phase: 1 }))
    await saveSession(makeSession({ phase: 1 }))
    expect(getProgress().currentPhase).toBe(1)
  })

  it("advances to phase 2 after 3rd session", async () => {
    await saveSession(makeSession({ phase: 1 }))
    await saveSession(makeSession({ phase: 1 }))
    await saveSession(makeSession({ phase: 1 }))
    expect(getProgress().currentPhase).toBe(2)
  })

  it("advances to phase 3 after 8 sessions with decent eye contact", async () => {
    // 8 sessions — first 3 advance to phase 2, then 5 more in phase 2
    for (let i = 0; i < 8; i++) {
      const p = getProgress()
      await saveSession(makeSession({
        phase: p.currentPhase,
        score: { eyeContactPercent: 70, composurePercent: 65, fillerWordCount: 2, speechPaceAvg: null, totalPoints: 42, durationSeconds: 90 },
      }))
    }
    expect(getProgress().currentPhase).toBe(3)
  })
})

describe("getProgress defaults", () => {
  beforeEach(() => { localStorageMock.clear() })

  it("returns default progress when storage is empty", () => {
    const p = getProgress()
    expect(p.totalSessions).toBe(0)
    expect(p.currentPhase).toBe(1)
    expect(p.sessions).toEqual([])
  })
})

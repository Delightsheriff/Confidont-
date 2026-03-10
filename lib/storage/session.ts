// ─────────────────────────────────────────────
// lib/storage/session.ts
//
// Session persistence layer.
// Stub implementation — uses localStorage.
//
// To swap: replace internals with Supabase calls.
// Nothing that imports this file needs to change.
// ─────────────────────────────────────────────

import type { SessionScore } from "@/types/session"
import type { SessionTopic } from "@/lib/ai/topics"
import type { SessionFeedback } from "@/lib/ai/feedback"

export interface StoredSession {
  id: string
  date: string // ISO string
  phase: number
  topics: SessionTopic[]
  score: SessionScore
  feedback: SessionFeedback | null
  thumbnailDataUrl: string | null // base64 frame captured at session end
}

export interface UserProgress {
  totalSessions: number
  totalPoints: number
  currentPhase: number
  weakAreas: string[]
  improvements: string[]
  completedTopics: string[]
  lastSessionDate: string | null
  sessions: StoredSession[]
}

const STORAGE_KEY = "confidont_progress"

const DEFAULT_PROGRESS: UserProgress = {
  totalSessions: 0,
  totalPoints: 0,
  currentPhase: 1,
  weakAreas: [],
  improvements: [],
  completedTopics: [],
  lastSessionDate: null,
  sessions: [],
}

// ── Read ─────────────────────────────────────

// STUB — swap internals for Supabase query when ready
export function getProgress(): UserProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserProgress) : DEFAULT_PROGRESS
  } catch {
    return DEFAULT_PROGRESS
  }
}

// STUB — swap internals for Supabase query when ready
export function getSessionById(id: string): StoredSession | null {
  const progress = getProgress()
  return progress.sessions.find((s) => s.id === id) ?? null
}

// ── Write ─────────────────────────────────────

// STUB — swap internals for Supabase insert when ready
export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return
  try {
    const progress = getProgress()
    const updated = updateProgress(progress, session)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error("Failed to save session:", err)
  }
}

// ── Progress calculation ──────────────────────

function updateProgress(
  prev: UserProgress,
  session: StoredSession
): UserProgress {
  const newSessions = [session, ...prev.sessions].slice(0, 100) // keep last 100

  // Recalculate weak areas from last 5 sessions
  const recent = newSessions.slice(0, 5)
  const weakAreas = deriveWeakAreas(recent)
  const improvements = deriveImprovements(prev.sessions, recent)

  // Phase progression — advance phase when avg scores are consistently high
  const currentPhase = derivePhase(
    prev.currentPhase,
    prev.totalSessions + 1,
    recent
  )

  return {
    totalSessions: prev.totalSessions + 1,
    totalPoints: prev.totalPoints + (session.feedback?.pointsEarned ?? 0),
    currentPhase,
    weakAreas,
    improvements,
    completedTopics: [
      ...new Set([
        ...prev.completedTopics,
        ...session.topics.map((t) => t.topic),
      ]),
    ],
    lastSessionDate: session.date,
    sessions: newSessions,
  }
}

function deriveWeakAreas(sessions: StoredSession[]): string[] {
  if (sessions.length === 0) return []
  const avgEye = avg(sessions.map((s) => s.score.eyeContactPercent))
  const avgCompose = avg(sessions.map((s) => s.score.composurePercent))
  const avgFillers = avg(sessions.map((s) => s.score.fillerWordCount))
  const weak: string[] = []
  if (avgEye < 60) weak.push("eye contact")
  if (avgCompose < 60) weak.push("composure")
  if (avgFillers > 5) weak.push("filler words")
  return weak
}

function deriveImprovements(
  allSessions: StoredSession[],
  recent: StoredSession[]
): string[] {
  if (allSessions.length < 3 || recent.length === 0) return []
  const older = allSessions.slice(5, 10)
  if (older.length === 0) return []

  const improvements: string[] = []
  const recentEye = avg(recent.map((s) => s.score.eyeContactPercent))
  const olderEye = avg(older.map((s) => s.score.eyeContactPercent))
  const recentComp = avg(recent.map((s) => s.score.composurePercent))
  const olderComp = avg(older.map((s) => s.score.composurePercent))

  if (recentEye - olderEye > 10)
    improvements.push("eye contact improving over last 5 sessions")
  if (recentComp - olderComp > 10)
    improvements.push("composure improving over last 5 sessions")
  return improvements
}

function derivePhase(
  currentPhase: number,
  totalSessions: number,
  recent: StoredSession[]
): number {
  // Phase gates — session count + score thresholds
  // Real implementation will be more nuanced
  if (currentPhase >= 4) return 4
  if (currentPhase === 3 && totalSessions >= 20) return 4
  if (currentPhase === 2 && totalSessions >= 8) {
    const avgEye = avg(recent.map((s) => s.score.eyeContactPercent))
    if (avgEye >= 55) return 3
  }
  if (currentPhase === 1 && totalSessions >= 3) return 2
  return currentPhase
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// ── Clear (for testing) ──────────────────────

export function clearProgress(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

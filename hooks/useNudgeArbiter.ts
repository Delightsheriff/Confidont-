"use client"

import { useRef, useState, useCallback } from "react"
import type { Nudge, NudgeType } from "@/types/session"
import { NUDGE_MESSAGES } from "@/lib/session-config"

// ─────────────────────────────────────────────
// useNudgeArbiter
//
// Single source of truth for all nudges.
// Both useFaceAnalysis and useAudioAnalysis route
// through here — never fire their own nudges.
//
// Responsibilities:
// - Per-type cooldowns
// - Session cap
// - Mutual exclusion: one nudge active at a time
//   (a new nudge cannot fire while one is displayed)
// - Auto-dismiss after displayMs
// ─────────────────────────────────────────────

const SESSION_CAP = 4
const DISPLAY_MS = 6_500

const PER_TYPE_COOLDOWN_MS: Record<NudgeType, number> = {
  "eye-contact-lost": 30_000,
  "speech-too-fast": 25_000,
  "speech-too-slow": 25_000,
  "long-silence": 20_000,
  "filler-word-spike": 20_000,
  fidgeting: 25_000,
  "head-tilted": 30_000,
  "dim-lighting": 60_000,
  "positive-streak": 30_000,
}

// Priority order — lower index wins if two signals arrive simultaneously
const NUDGE_PRIORITY: NudgeType[] = [
  "long-silence",
  "eye-contact-lost",
  "filler-word-spike",
  "speech-too-fast",
  "fidgeting",
  "head-tilted",
  "dim-lighting",
  "speech-too-slow",
  "positive-streak",
]

export interface UseNudgeArbiterReturn {
  activeNudge: Nudge | null
  nudgeCount: number
  fire: (type: NudgeType) => void
  dismiss: () => void
}

export function useNudgeArbiter(): UseNudgeArbiterReturn {
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null)
  const [nudgeCount, setNudgeCount] = useState(0)

  const nudgeCountRef = useRef(0)
  const activeNudgeRef = useRef<Nudge | null>(null) // mirrors state for sync reads
  const perTypeLastFiredRef = useRef<Partial<Record<NudgeType, number>>>({})
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
    activeNudgeRef.current = null
    setActiveNudge(null)
  }, [])

  const fire = useCallback((type: NudgeType) => {
    const now = performance.now()

    // Session cap
    if (nudgeCountRef.current >= SESSION_CAP) return

    // Mutual exclusion — one nudge at a time
    if (activeNudgeRef.current !== null) {
      // Only override if incoming has strictly higher priority
      const currentPriority = NUDGE_PRIORITY.indexOf(
        activeNudgeRef.current.type
      )
      const incomingPriority = NUDGE_PRIORITY.indexOf(type)
      if (incomingPriority >= currentPriority) return
    }

    // Per-type cooldown
    const lastFired = perTypeLastFiredRef.current[type] ?? 0
    if (now - lastFired < PER_TYPE_COOLDOWN_MS[type]) return

    const msgs = NUDGE_MESSAGES[type]
    const message = msgs[Math.floor(Math.random() * msgs.length)]
    const nudge: Nudge = { type, message, timestamp: now }

    // Update refs first (sync) then state (async)
    nudgeCountRef.current++
    perTypeLastFiredRef.current[type] = now
    activeNudgeRef.current = nudge

    // Clear any existing dismiss timer
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)

    setNudgeCount(nudgeCountRef.current)
    setActiveNudge(nudge)

    dismissTimerRef.current = setTimeout(() => {
      activeNudgeRef.current = null
      setActiveNudge(null)
      dismissTimerRef.current = null
    }, DISPLAY_MS)
  }, []) // stable — all reads via refs

  return { activeNudge, nudgeCount, fire, dismiss }
}

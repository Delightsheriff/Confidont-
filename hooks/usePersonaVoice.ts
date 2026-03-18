"use client"

// ─────────────────────────────────────────────
// usePersonaVoice
//
// Web Speech Synthesis wrapper for persona TTS.
// Stable speak/cancel callbacks — safe to call from effects.
//
// Voice selection tries to match a preferred gender from available
// system voices. Falls back gracefully to whatever is available.
// ─────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react"
import type { PersonaVoiceConfig } from "@/types/user"

export interface UsePersonaVoiceReturn {
  speak: (text: string) => void
  cancel: () => void
  isSpeaking: boolean
  isSupported: boolean
}

// Voice priority order — best quality first.
// Google voices (Chrome) and Microsoft Neural (Edge) sound significantly
// better than default system voices. We try them first.
const FEMALE_VOICE_HINTS = [
  // Chrome (Google TTS — best quality available in browser)
  "google us english",
  "google uk english female",
  // Edge / Windows (Neural voices — second best)
  "aria", "jenny", "michelle", "monica", "natasha",
  "zira online", "zira",
  // macOS / iOS
  "samantha", "karen", "moira", "tessa", "fiona", "victoria",
  // Fallback keywords
  "female", "woman", "emma", "alice", "kate",
]
const MALE_VOICE_HINTS = [
  // Chrome
  "google uk english male",
  // Edge / Windows Neural
  "guy", "ryan", "roger",
  "david online", "david",
  // macOS / iOS
  "daniel", "alex", "oliver", "arthur",
  // Fallback keywords
  "male", "man", "fred", "thomas", "lee",
]

export function usePersonaVoice(
  config: PersonaVoiceConfig,
  enabled: boolean
): UsePersonaVoiceReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  const configRef = useRef(config)
  const enabledRef = useRef(enabled)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => { configRef.current = config }, [config])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  // Load available voices. Chrome fires voiceschanged when ready;
  // Safari/Firefox may return them synchronously on first call.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    setIsSupported(true)

    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices()
    }
    load()
    window.speechSynthesis.addEventListener("voiceschanged", load)
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load)
  }, [])

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current
    if (voices.length === 0) return null

    // Prefer English voices
    const english = voices.filter((v) => v.lang.startsWith("en"))
    const pool = english.length > 0 ? english : voices

    const { preferFemale } = configRef.current
    const hints = preferFemale ? FEMALE_VOICE_HINTS : MALE_VOICE_HINTS
    const match = pool.find((v) =>
      hints.some((h) => v.name.toLowerCase().includes(h))
    )
    return match ?? pool[0]
  }, [])

  const speak = useCallback((text: string) => {
    if (!enabledRef.current) return
    if (typeof window === "undefined" || !window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const u = new SpeechSynthesisUtterance(text)
    u.rate = configRef.current.rate
    u.pitch = configRef.current.pitch
    u.volume = 1

    const voice = pickVoice()
    if (voice) u.voice = voice

    u.onstart = () => setIsSpeaking(true)
    u.onend = () => setIsSpeaking(false)
    u.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(u)
  }, [pickVoice])

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  // Cancel on unmount
  useEffect(() => () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return { speak, cancel, isSpeaking, isSupported }
}

/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { FILLER_WORDS } from "@/lib/session-config"

// ─────────────────────────────────────────────
// useAudioAnalysis
//
// All audio-based metrics via Web Speech API:
// - Filler word detection with rolling spike window
// - Silence duration tracking with session-elapsed guard
// - Speech pace (WPM)
//
// Intentionally takes AudioAnalysisConfig — not FaceAnalysisConfig.
// Audio hook should not depend on face analysis types.
// ─────────────────────────────────────────────

export interface AudioAnalysisConfig {
  metrics: {
    fillerWords: boolean
    speechPace: boolean
    silenceDuration: boolean
  }
}

export interface UseAudioAnalysisReturn {
  fillerWordCount: number // total for session
  detectedFillers: string[] // fillers in current speech burst (clears after 2.5s)
  recentFillerCount: number // fillers in rolling 20s window — for spike display
  silenceDuration: number // current silence run in seconds
  speechPaceWPM: number | null
  isListening: boolean
}

// Rolling window for filler spike detection
const FILLER_SPIKE_WINDOW_MS = 20_000
const FILLER_SPIKE_THRESHOLD = 3

// Silence thresholds matching the brief
const SESSION_OPEN_SILENCE_S = 4 // no speech in first 4s
const MID_SESSION_SILENCE_S = 7 // silence ≥7s after 12s mark
const MID_SESSION_GUARD_S = 12 // guard: don't fire long_silence before this

export function useAudioAnalysis(
  isSessionActive: boolean,
  config: AudioAnalysisConfig,
  onFillerDetected?: (word: string) => void,
  onFillerSpike?: () => void,
  onSilenceStart?: () => void, // session-open silence (4s)
  onLongSilence?: () => void // mid-session silence (7s after 12s mark)
): UseAudioAnalysisReturn {
  const [fillerWordCount, setFillerWordCount] = useState(0)
  const [detectedFillers, setDetectedFillers] = useState<string[]>([])
  const [recentFillerCount, setRecentFillerCount] = useState(0)
  const [silenceDuration, setSilenceDuration] = useState(0)
  const [speechPaceWPM, setSpeechPaceWPM] = useState<number | null>(null)
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isActiveRef = useRef(false)

  // Silence
  const silenceStartRef = useRef<number | null>(null)
  const silencePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionOpenSilenceFiredRef = useRef(false)
  const longSilenceFiredRef = useRef(false)

  // Timing
  const sessionStartRef = useRef<number | null>(null)

  // Filler spike
  const fillerTimestampsRef = useRef<number[]>([])
  const totalFillerCountRef = useRef(0)

  // WPM
  const wordCountRef = useRef(0)

  // Interim de-dupe: track last processed interim string per result index
  // Web Speech fires onresult repeatedly with growing interim strings.
  // We track the last seen transcript per result index and only process the diff.
  const lastInterimRef = useRef<Map<number, string>>(new Map())

  // Stable refs for config and callbacks — no stale closures
  const configRef = useRef(config)
  const onFillerDetectedRef = useRef(onFillerDetected)
  const onFillerSpikeRef = useRef(onFillerSpike)
  const onSilenceStartRef = useRef(onSilenceStart)
  const onLongSilenceRef = useRef(onLongSilence)

  useEffect(() => {
    configRef.current = config
  }, [config])
  useEffect(() => {
    onFillerDetectedRef.current = onFillerDetected
  }, [onFillerDetected])
  useEffect(() => {
    onFillerSpikeRef.current = onFillerSpike
  }, [onFillerSpike])
  useEffect(() => {
    onSilenceStartRef.current = onSilenceStart
  }, [onSilenceStart])
  useEffect(() => {
    onLongSilenceRef.current = onLongSilence
  }, [onLongSilence])

  // ── Silence poll — pure timestamp math, no tick coupling ──────────
  const stopSilencePoll = useCallback(() => {
    if (silencePollRef.current) {
      clearInterval(silencePollRef.current)
      silencePollRef.current = null
    }
  }, [])

  const startSilencePoll = useCallback(() => {
    // stopSilencePoll has [] deps — safe to call here without adding to deps
    if (silencePollRef.current) {
      clearInterval(silencePollRef.current)
      silencePollRef.current = null
    }

    const silenceStart = Date.now()
    silenceStartRef.current = silenceStart
    longSilenceFiredRef.current = false

    silencePollRef.current = setInterval(() => {
      if (!sessionStartRef.current) return
      const silenceSec = (Date.now() - silenceStart) / 1000
      const elapsed = (Date.now() - sessionStartRef.current) / 1000

      setSilenceDuration(silenceSec)

      if (
        !sessionOpenSilenceFiredRef.current &&
        elapsed < MID_SESSION_GUARD_S &&
        silenceSec >= SESSION_OPEN_SILENCE_S
      ) {
        sessionOpenSilenceFiredRef.current = true
        onSilenceStartRef.current?.()
      }

      if (
        !longSilenceFiredRef.current &&
        elapsed >= MID_SESSION_GUARD_S &&
        silenceSec >= MID_SESSION_SILENCE_S
      ) {
        longSilenceFiredRef.current = true
        onLongSilenceRef.current?.()
      }
    }, 500)
  }, []) // stable — all refs, no external deps

  // ── Filler detection ──────────────────────────────────────────────
  const handleFillers = useCallback((words: string[]) => {
    if (words.length === 0) return
    const now = Date.now()

    words.forEach((w) => onFillerDetectedRef.current?.(w))
    totalFillerCountRef.current += words.length
    words.forEach(() => fillerTimestampsRef.current.push(now))

    // Evict outside window
    const cutoff = now - FILLER_SPIKE_WINDOW_MS
    fillerTimestampsRef.current = fillerTimestampsRef.current.filter(
      (t) => t > cutoff
    )

    const recent = fillerTimestampsRef.current.length
    setRecentFillerCount(recent)
    setFillerWordCount(totalFillerCountRef.current)
    setDetectedFillers(words)
    setTimeout(() => setDetectedFillers([]), 2_500)

    if (recent >= FILLER_SPIKE_THRESHOLD) {
      onFillerSpikeRef.current?.()
      fillerTimestampsRef.current = []
      setRecentFillerCount(0)
    }
  }, []) // stable

  // ── Main effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isSessionActive) {
      isActiveRef.current = false
      recognitionRef.current?.stop()
      stopSilencePoll()
      setIsListening(false)
      return
    }

    const {
      fillerWords,
      silenceDuration: trackSilence,
      speechPace,
    } = configRef.current.metrics
    if (!fillerWords && !trackSilence && !speechPace) return

    const SpeechRecognitionAPI =
      (window as Window & typeof globalThis).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      console.warn("[Confidont] Web Speech API not supported")
      return
    }

    const recognition = new SpeechRecognitionAPI() as SpeechRecognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognitionRef.current = recognition
    isActiveRef.current = true

    // Reset session state
    sessionStartRef.current = Date.now()
    fillerTimestampsRef.current = []
    totalFillerCountRef.current = 0
    wordCountRef.current = 0
    sessionOpenSilenceFiredRef.current = false
    longSilenceFiredRef.current = false
    lastInterimRef.current = new Map()
    setFillerWordCount(0)
    setRecentFillerCount(0)
    setSilenceDuration(0)
    setSpeechPaceWPM(null)

    recognition.onstart = () => {
      setIsListening(true)
      startSilencePoll()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reset silence on any speech activity
      stopSilencePoll()
      setSilenceDuration(0)
      longSilenceFiredRef.current = false
      startSilencePoll()

      const cfg = configRef.current.metrics

      // Process each result in the batch
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript.toLowerCase().trim()
        const isFinal = result.isFinal

        if (cfg.fillerWords) {
          if (isFinal) {
            // Final result: process in full, clear interim tracking for this index
            lastInterimRef.current.delete(i)
            const found = FILLER_WORDS.filter((f) => transcript.includes(f))
            handleFillers(found)
          } else {
            // Interim: only process text added since last interim update
            const prev = lastInterimRef.current.get(i) ?? ""
            if (transcript.length > prev.length) {
              const newText = transcript.slice(prev.length).trim()
              lastInterimRef.current.set(i, transcript)
              if (newText) {
                const found = FILLER_WORDS.filter((f) => newText.includes(f))
                handleFillers(found)
              }
            }
          }
        }

        // WPM — final results only, no double-counting
        if (cfg.speechPace && isFinal) {
          const words = transcript.split(/\s+/).filter(Boolean).length
          wordCountRef.current += words
          const elapsedMin = sessionStartRef.current
            ? (Date.now() - sessionStartRef.current) / 60_000
            : 1
          if (elapsedMin > 0.1) {
            setSpeechPaceWPM(Math.round(wordCountRef.current / elapsedMin))
          }
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // network + no-speech are expected and recoverable
      if (event.error === "network" || event.error === "no-speech") return
      console.warn("[Confidont] Speech recognition error:", event.error)
    }

    recognition.onend = () => {
      if (isActiveRef.current) {
        try {
          recognition.start()
        } catch {
          /* already restarting */
        }
      } else {
        setIsListening(false)
      }
    }

    try {
      recognition.start()
    } catch (err) {
      console.error("[Confidont] Failed to start speech recognition:", err)
    }

    return () => {
      isActiveRef.current = false
      recognition.stop()
      stopSilencePoll()
      setIsListening(false)
    }
    // Config metrics values are primitives — safe as individual deps, no object ref churn
  }, [isSessionActive, startSilencePoll, stopSilencePoll, handleFillers])

  return {
    fillerWordCount,
    detectedFillers,
    recentFillerCount,
    silenceDuration,
    speechPaceWPM,
    isListening,
  }
}

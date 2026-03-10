"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { FILLER_WORDS } from "@/lib/session-config"
import type { FaceAnalysisConfig } from "@/types/session"

// ─────────────────────────────────────────────
// useAudioAnalysis
//
// Handles all audio-based metrics:
// - Filler word detection (Web Speech API)
// - Silence duration tracking
// - Speech pace (WPM) — scaffolded, needs calibration
//
// Separate from useFaceAnalysis to keep concerns clean.
// Both hooks run in parallel during a session.
// ─────────────────────────────────────────────

interface UseAudioAnalysisReturn {
  fillerWordCount: number
  detectedFillers: string[] // last detected filler words
  silenceDuration: number // current silence in seconds
  speechPaceWPM: number | null
  isListening: boolean
}

export function useAudioAnalysis(
  isSessionActive: boolean,
  config: FaceAnalysisConfig,
  onFillerDetected?: (word: string) => void,
  onLongSilence?: () => void
): UseAudioAnalysisReturn {
  const [fillerWordCount, setFillerWordCount] = useState(0)
  const [detectedFillers, setDetectedFillers] = useState<string[]>([])
  const [silenceDuration, setSilenceDuration] = useState(0)
  const [speechPaceWPM, setSpeechPaceWPM] = useState<number | null>(null)
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const silenceStartRef = useRef<number | null>(null)
  const wordCountRef = useRef(0)
  const sessionStartRef = useRef<number | null>(null)

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceStartRef.current = null
    setSilenceDuration(0)

    silenceTimerRef.current = setTimeout(() => {
      silenceStartRef.current = Date.now()

      // Poll silence duration every second
      const poll = setInterval(() => {
        if (!silenceStartRef.current) {
          clearInterval(poll)
          return
        }
        const duration = (Date.now() - silenceStartRef.current) / 1000
        setSilenceDuration(duration)

        if (duration >= config.thresholds.silence.maxSeconds && onLongSilence) {
          onLongSilence()
        }
      }, 1000)
    }, 2000) // start silence timer after 2s of no speech
  }, [config.thresholds.silence.maxSeconds, onLongSilence])

  useEffect(() => {
    if (!isSessionActive) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    if (!config.metrics.fillerWords && !config.metrics.silenceDuration) return

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      console.warn("Web Speech API not supported in this browser")
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    sessionStartRef.current = Date.now()
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setIsListening(true)
      resetSilenceTimer()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer()

      const results = Array.from(event.results)
      const latestResult = results[results.length - 1]
      const transcript = latestResult[0].transcript.toLowerCase().trim()

      // Filler word detection
      if (config.metrics.fillerWords) {
        const foundFillers = FILLER_WORDS.filter((filler) =>
          transcript.includes(filler)
        )

        if (foundFillers.length > 0) {
          setFillerWordCount((prev) => prev + foundFillers.length)
          setDetectedFillers(foundFillers)
          foundFillers.forEach((filler) => onFillerDetected?.(filler))

          // Clear detected fillers after 2s
          setTimeout(() => setDetectedFillers([]), 2000)
        }
      }

      // Word count for pace (only on final results)
      if (config.metrics.speechPace && latestResult.isFinal) {
        const words = transcript.split(" ").filter(Boolean).length
        wordCountRef.current += words

        const elapsedMinutes = sessionStartRef.current
          ? (Date.now() - sessionStartRef.current) / 60000
          : 1

        if (elapsedMinutes > 0.1) {
          setSpeechPaceWPM(Math.round(wordCountRef.current / elapsedMinutes))
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // network errors are common — just restart quietly
      if (event.error === "network") return
      console.warn("Speech recognition error:", event.error)
    }

    recognition.onend = () => {
      // Auto-restart if session still active
      if (isSessionActive) {
        try {
          recognition.start()
        } catch {
          // already started
        }
      } else {
        setIsListening(false)
      }
    }

    recognition.start()

    return () => {
      recognition.stop()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      setIsListening(false)
    }
  }, [
    isSessionActive,
    config,
    resetSilenceTimer,
    onFillerDetected,
    onLongSilence,
  ])

  return {
    fillerWordCount,
    detectedFillers,
    silenceDuration,
    speechPaceWPM,
    isListening,
  }
}

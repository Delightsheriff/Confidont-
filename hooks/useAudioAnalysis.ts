"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { FILLER_WORDS } from "@/lib/session-config"
import type { FaceAnalysisConfig } from "@/types/session"

// ─────────────────────────────────────────────
// useAudioAnalysis
//
// All audio-based metrics via Web Speech API:
// - Filler word detection
// - Silence duration tracking
// - Speech pace (WPM) — scaffolded
//
// Runs in parallel with useFaceAnalysis.
// ─────────────────────────────────────────────

export interface UseAudioAnalysisReturn {
  fillerWordCount: number
  detectedFillers: string[]
  silenceDuration: number
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
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silencePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const silenceStartRef = useRef<number | null>(null)
  const wordCountRef = useRef(0)
  const sessionStartRef = useRef<number | null>(null)
  const isActiveRef = useRef(false)

  const clearSilenceTracking = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (silencePollRef.current) clearInterval(silencePollRef.current)
    silenceStartRef.current = null
    setSilenceDuration(0)
  }, [])

  const startSilenceTimer = useCallback(() => {
    clearSilenceTracking()

    silenceTimerRef.current = setTimeout(() => {
      silenceStartRef.current = Date.now()

      silencePollRef.current = setInterval(() => {
        if (!silenceStartRef.current) return
        const seconds = (Date.now() - silenceStartRef.current) / 1000
        setSilenceDuration(seconds)
        if (seconds >= config.thresholds.silence.maxSeconds) {
          onLongSilence?.()
        }
      }, 500)
    }, 1500)
  }, [
    clearSilenceTracking,
    config.thresholds.silence.maxSeconds,
    onLongSilence,
  ])

  useEffect(() => {
    if (!isSessionActive) {
      isActiveRef.current = false
      recognitionRef.current?.stop()
      clearSilenceTracking()
      setIsListening(false)
      return
    }

    const needsAudio =
      config.metrics.fillerWords ||
      config.metrics.silenceDuration ||
      config.metrics.speechPace

    if (!needsAudio) return

    // Browser API type safety
    const SpeechRecognitionAPI =
      (window as Window & typeof globalThis).SpeechRecognition ||
      (
        window as Window &
          typeof globalThis & {
            webkitSpeechRecognition?: typeof SpeechRecognition
          }
      ).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      console.warn("Web Speech API not supported in this browser")
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognitionRef.current = recognition
    isActiveRef.current = true
    sessionStartRef.current = Date.now()

    recognition.onstart = () => {
      setIsListening(true)
      startSilenceTimer()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      startSilenceTimer() // reset on any speech

      const results = Array.from(event.results)
      const latest = results[results.length - 1]
      const transcript = latest[0].transcript.toLowerCase().trim()

      // Filler word detection
      if (config.metrics.fillerWords) {
        const found = FILLER_WORDS.filter((f) => transcript.includes(f))
        if (found.length > 0) {
          setFillerWordCount((prev) => prev + found.length)
          setDetectedFillers(found)
          found.forEach((f) => onFillerDetected?.(f))
          setTimeout(() => setDetectedFillers([]), 2500)
        }
      }

      // Speech pace — only on final results to avoid double counting
      if (config.metrics.speechPace && latest.isFinal) {
        const words = transcript.split(/\s+/).filter(Boolean).length
        wordCountRef.current += words
        const elapsedMin = sessionStartRef.current
          ? (Date.now() - sessionStartRef.current) / 60000
          : 1
        if (elapsedMin > 0.1) {
          setSpeechPaceWPM(Math.round(wordCountRef.current / elapsedMin))
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // network errors are common and recoverable — ignore silently
      if (event.error === "network" || event.error === "no-speech") return
      console.warn("Speech recognition error:", event.error)
    }

    recognition.onend = () => {
      // Auto-restart while session is active
      if (isActiveRef.current) {
        try {
          recognition.start()
        } catch {
          /* already starting */
        }
      } else {
        setIsListening(false)
      }
    }

    try {
      recognition.start()
    } catch (err) {
      console.error("Failed to start speech recognition:", err)
    }

    return () => {
      isActiveRef.current = false
      recognition.stop()
      clearSilenceTracking()
      setIsListening(false)
    }
  }, [
    isSessionActive,
    config,
    startSilenceTimer,
    clearSilenceTracking,
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

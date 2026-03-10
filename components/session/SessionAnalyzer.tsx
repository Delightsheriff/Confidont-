"use client"

import { useRef, useState, useCallback } from "react"
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis"
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis"
import { DEFAULT_CONFIG } from "@/lib/session-config"
import type { Nudge } from "@/types/session"

// ─────────────────────────────────────────────
// SessionAnalyzer
//
// UI layer — wires both hooks together.
// Shows live metrics on screen (not console).
// Camera feed is HIDDEN from user by design.
// ─────────────────────────────────────────────

export default function SessionAnalyzer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [nudgeQueue, setNudgeQueue] = useState<Nudge[]>([])

  // Override config per phase/user — for now use defaults
  const config = DEFAULT_CONFIG

  // Nudge handlers passed to audio hook
  const handleFillerDetected = useCallback((word: string) => {
    console.debug("Filler word detected:", word)
  }, [])

  const handleLongSilence = useCallback(() => {
    // Audio hook fires this — face hook handles nudge dispatch
  }, [])

  const { frameMetrics, sessionScore, activeNudge, isReady } = useFaceAnalysis(
    videoRef,
    isSessionActive && isCameraReady,
    config
  )

  const { fillerWordCount, detectedFillers, silenceDuration, isListening } =
    useAudioAnalysis(
      isSessionActive,
      config,
      handleFillerDetected,
      handleLongSilence
    )

  // ── Session control ──────────────────────────
  const toggleSession = async () => {
    if (isSessionActive) {
      setIsSessionActive(false)
      setIsCameraReady(false)

      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = null
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadeddata = () => {
            setIsCameraReady(true)
            setIsSessionActive(true)
          }
        }
      } catch (err) {
        console.error("Camera/mic access denied", err)
      }
    }
  }

  const isActive = isSessionActive && isCameraReady

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-foreground">
      {/* Header */}
      <div className="space-y-1 text-center">
        <h1 className="font-mono text-2xl font-bold text-primary">Confidont</h1>
        <p className="text-sm text-muted-foreground">
          {!isReady
            ? "Loading AI model..."
            : isActive
              ? "Session active — speak naturally"
              : "Ready when you are"}
        </p>
      </div>

      {/* Camera — HIDDEN from user, used only for analysis */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* Session visual — what user sees instead of their face */}
      <div className="relative flex aspect-video w-full max-w-xl items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
        {isActive ? (
          <SessionVisual
            eyeContact={frameMetrics?.eyeContact ?? null}
            silenceDuration={silenceDuration}
            isListening={isListening}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            {isReady ? "Press Start Session to begin" : "Loading..."}
          </div>
        )}

        {/* Active nudge overlay */}
        {activeNudge && <NudgeBanner nudge={activeNudge} />}
      </div>

      {/* Live Metrics Panel */}
      {isActive && (
        <div className="grid w-full max-w-xl grid-cols-2 gap-3">
          <MetricCard
            label="Eye Contact"
            value={`${sessionScore.eyeContactPercent}%`}
            status={
              frameMetrics?.eyeContact === true
                ? "good"
                : frameMetrics?.eyeContact === false
                  ? "bad"
                  : "neutral"
            }
            detail={
              frameMetrics?.eyeContact
                ? "Looking at camera"
                : "Look at the camera"
            }
          />

          <MetricCard
            label="Composure"
            value={`${sessionScore.composurePercent}%`}
            status={
              frameMetrics?.composure === true
                ? "good"
                : frameMetrics?.composure === false
                  ? "bad"
                  : "neutral"
            }
            detail={frameMetrics?.composure ? "Steady" : "Try to stay still"}
          />

          <MetricCard
            label="Filler Words"
            value={String(fillerWordCount)}
            status={
              fillerWordCount === 0
                ? "good"
                : fillerWordCount < 5
                  ? "neutral"
                  : "bad"
            }
            detail={
              detectedFillers.length > 0
                ? `Detected: "${detectedFillers.join('", "')}"`
                : "None detected yet"
            }
          />

          <MetricCard
            label="Head Position"
            value={frameMetrics?.cameraAngle ?? "—"}
            status={
              frameMetrics?.cameraAngle === "eye-level"
                ? "good"
                : frameMetrics?.cameraAngle != null
                  ? "bad"
                  : "neutral"
            }
            detail={
              frameMetrics?.cameraAngle === "too-high"
                ? "Lower your camera"
                : frameMetrics?.cameraAngle === "too-low"
                  ? "Raise your camera"
                  : "Good angle"
            }
          />

          <MetricCard
            label="Lighting"
            value={frameMetrics?.lightingQuality ?? "—"}
            status={
              frameMetrics?.lightingQuality === "good"
                ? "good"
                : frameMetrics?.lightingQuality != null
                  ? "bad"
                  : "neutral"
            }
            detail={
              frameMetrics?.lightingQuality === "harsh"
                ? "Face a light source"
                : "Lighting looks good"
            }
          />

          <MetricCard
            label="Duration"
            value={`${sessionScore.durationSeconds}s`}
            status="neutral"
            detail={isListening ? "Mic active" : "Mic not detected"}
          />
        </div>
      )}

      {/* Start / End button */}
      <button
        onClick={toggleSession}
        disabled={!isReady}
        className={`rounded-full px-10 py-3 font-mono text-sm font-bold transition-all ${
          !isReady
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : isActive
              ? "bg-destructive text-white hover:opacity-90"
              : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {!isReady
          ? "Loading AI..."
          : isActive
            ? "End Session"
            : "Start Session"}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SessionVisual({
  eyeContact,
  silenceDuration,
  isListening,
}: {
  eyeContact: boolean | null
  silenceDuration: number
  isListening: boolean
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4 px-8">
      {/* Waveform placeholder */}
      <div className="flex h-12 items-center gap-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-primary transition-all duration-150"
            style={{
              height: isListening ? `${Math.random() * 100}%` : "20%",
              opacity: isListening ? 0.7 + Math.random() * 0.3 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Recording indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={`h-2 w-2 rounded-full ${
            eyeContact ? "bg-primary" : "bg-muted"
          }`}
        />
        {eyeContact ? "Camera detected" : "Look at the camera"}
      </div>

      {silenceDuration > 3 && (
        <p className="animate-pulse text-xs text-muted-foreground">
          Take your time — continue when ready
        </p>
      )}
    </div>
  )
}

function NudgeBanner({ nudge }: { nudge: Nudge }) {
  const isPositive = nudge.type === "positive-streak"
  return (
    <div
      className={`absolute right-4 bottom-4 left-4 rounded-xl px-4 py-3 text-center font-mono text-sm transition-all ${
        isPositive
          ? "border border-primary/30 bg-primary/20 text-primary"
          : "border border-border bg-card/90 text-foreground"
      }`}
    >
      {nudge.message}
    </div>
  )
}

function MetricCard({
  label,
  value,
  status,
  detail,
}: {
  label: string
  value: string
  status: "good" | "bad" | "neutral"
  detail: string
}) {
  const statusColor = {
    good: "text-primary",
    bad: "text-destructive",
    neutral: "text-muted-foreground",
  }

  return (
    <div className="space-y-1 rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={`font-mono text-xl font-bold ${statusColor[status]}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

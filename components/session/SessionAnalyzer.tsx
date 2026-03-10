"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis"
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis"
import { DEFAULT_CONFIG } from "@/lib/session-config"
import type { Nudge } from "@/types/session"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// ─────────────────────────────────────────────
// SessionAnalyzer
//
// UI layer — wires useFaceAnalysis + useAudioAnalysis.
//
// Layout:
// - One large session box
// - Video feed rendered in DOM but invisible (opacity-0)
//   so MediaPipe receives valid frames
// - Debug toggle (dev only) reveals video feed
// - Real audio waveform via Web Audio API AnalyserNode
// - Nudge banner floats above waveform
// - Metrics grid below the box
// ─────────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development"

export default function SessionAnalyzer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const waveAnimRef = useRef<number | undefined>(undefined)

  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [showDebugFeed, setShowDebugFeed] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const config = DEFAULT_CONFIG
  const isActive = isSessionActive && isCameraReady

  const { frameMetrics, sessionScore, activeNudge, isReady } = useFaceAnalysis(
    videoRef,
    isActive,
    config
  )

  const { fillerWordCount, detectedFillers, silenceDuration, isListening } =
    useAudioAnalysis(isSessionActive, config)

  // ── Session control ──────────────────────────
  const toggleSession = async () => {
    if (isSessionActive) {
      setIsSessionActive(false)
      setIsCameraReady(false)
      stopWaveform()

      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = null
      }
      analyserRef.current = null
    } else {
      setCameraError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: true,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadeddata = () => {
            setIsCameraReady(true)
            setIsSessionActive(true)
            setupWaveform(stream)
          }
        }
      } catch (err) {
        const isNotFound =
          err instanceof DOMException && err.name === "NotFoundError"
        const isDenied =
          err instanceof DOMException && err.name === "NotAllowedError"
        setCameraError(
          isNotFound
            ? "No camera or microphone found. Please connect a device and try again."
            : isDenied
              ? "Camera/mic access was denied. Please allow access in your browser settings."
              : `Could not access camera: ${err instanceof Error ? err.message : "Unknown error"}`
        )
        console.error("Camera/mic error:", err)
      }
    }
  }

  // ── Real audio waveform via Web Audio API ────
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      waveAnimRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 1.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9
        // Use CSS variable colour — teal primary
        ctx.fillStyle = `rgba(81, 150, 150, ${0.4 + (dataArray[i] / 255) * 0.6})`
        ctx.beginPath()
        ctx.roundRect(
          x,
          (canvas.height - barHeight) / 2,
          barWidth - 1,
          barHeight,
          2
        )
        ctx.fill()
        x += barWidth + 1
      }
    }

    draw()
  }, [])

  const setupWaveform = useCallback(
    (stream: MediaStream) => {
      try {
        const audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 128
        source.connect(analyser)
        analyserRef.current = analyser
        drawWaveform()
      } catch (err) {
        console.warn("Web Audio API unavailable:", err)
      }
    },
    [drawWaveform]
  )

  const stopWaveform = useCallback(() => {
    if (waveAnimRef.current !== undefined) {
      cancelAnimationFrame(waveAnimRef.current)
      waveAnimRef.current = undefined
    }
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopWaveform()
  }, [stopWaveform])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background p-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-mono text-2xl font-bold text-primary">Confidont</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {!isReady
            ? "Loading AI model..."
            : isActive
              ? "Session active — speak naturally"
              : "Ready when you are"}
        </p>
      </div>

      {/* ── Main Session Box ───────────────────── */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Video element — ALWAYS in DOM for MediaPipe
            opacity-0 hides it visually without removing it from layout */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute inset-0 size-full -scale-x-100 object-cover transition-opacity duration-300",
            showDebugFeed ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Gradient overlay — always shown, dims debug feed nicely too */}
        <div className="absolute inset-0 bg-linear-to-t from-card via-card/60 to-transparent" />

        {/* Center content — idle state */}
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-sm text-muted-foreground">
              {isReady ? "Press Start Session to begin" : "Initialising AI..."}
            </p>
          </div>
        )}

        {/* Eye contact indicator — top left */}
        {isActive && (
          <div className="absolute top-4 left-4">
            <Badge
              variant={frameMetrics?.eyeContact ? "default" : "secondary"}
              className="font-mono"
            >
              <span
                className={cn(
                  "size-2 rounded-full transition-colors",
                  frameMetrics?.eyeContact
                    ? "bg-primary-foreground"
                    : "bg-muted-foreground"
                )}
              />
              {frameMetrics?.eyeContact ? "Eye contact" : "Look at camera"}
            </Badge>
          </div>
        )}

        {/* Duration — top right */}
        {isActive && (
          <div className="absolute top-4 right-4 font-mono text-xs text-muted-foreground">
            {formatDuration(sessionScore.durationSeconds)}
          </div>
        )}

        {/* Nudge banner — floats above waveform */}
        {activeNudge && <NudgeBanner nudge={activeNudge} />}

        {/* Waveform — bottom of box */}
        <div className="absolute right-0 bottom-0 left-0 flex h-16 items-end px-4 pb-3">
          {isActive ? (
            <canvas
              ref={canvasRef}
              width={600}
              height={48}
              className="h-12 w-full"
            />
          ) : (
            // Static idle waveform
            <div className="flex h-8 w-full items-center gap-px">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-border"
                  style={{
                    height: `${Math.round(10 + Math.sin(i * 0.4) * 6)}%`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Debug toggle — dev only */}
        {isDev && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowDebugFeed((p) => !p)}
            className="absolute right-3 bottom-2 font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground"
          >
            {showDebugFeed ? "hide feed" : "debug feed"}
          </Button>
        )}
      </div>

      {/* Error state */}
      {cameraError && (
        <Alert variant="destructive" className="max-w-sm font-mono text-xs">
          <AlertTitle>Camera Error</AlertTitle>
          <AlertDescription>{cameraError}</AlertDescription>
        </Alert>
      )}

      {/* ── Metrics Grid ───────────────────────── */}
      {isActive && (
        <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
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
            detail={frameMetrics?.eyeContact ? "On camera" : "Look at the lens"}
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
            detail={frameMetrics?.composure ? "Steady" : "Stay still"}
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
                ? `"${detectedFillers[0]}" detected`
                : "None detected"
            }
          />
          <MetricCard
            label="Head Position"
            value={
              frameMetrics?.cameraAngle === "eye-level"
                ? "Good"
                : frameMetrics?.cameraAngle === "too-high"
                  ? "Too high"
                  : frameMetrics?.cameraAngle === "too-low"
                    ? "Too low"
                    : "—"
            }
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
                  : "Camera angle looks good"
            }
          />
          <MetricCard
            label="Lighting"
            value={
              frameMetrics?.lightingQuality === "good"
                ? "Good"
                : frameMetrics?.lightingQuality === "harsh"
                  ? "Harsh"
                  : "—"
            }
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
                : "Lighting is good"
            }
          />
          <MetricCard
            label="Microphone"
            value={isListening ? "Active" : "—"}
            status={isListening ? "good" : "neutral"}
            detail={
              silenceDuration > 3
                ? `${Math.round(silenceDuration)}s of silence`
                : "Listening"
            }
          />
        </div>
      )}

      {/* ── Start / End button ─────────────────── */}
      <Button
        onClick={toggleSession}
        disabled={!isReady}
        variant={isActive ? "destructive" : "default"}
        size="lg"
        className="rounded-full px-10 font-mono text-sm font-bold"
      >
        {!isReady
          ? "Loading AI..."
          : isActive
            ? "End Session"
            : "Start Session"}
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Helpers & sub-components
// ─────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function NudgeBanner({ nudge }: { nudge: Nudge }) {
  const isPositive = nudge.type === "positive-streak"
  return (
    <Alert
      className={cn(
        "absolute right-4 bottom-20 left-4 animate-in text-center font-mono backdrop-blur-sm fade-in slide-in-from-bottom-2",
        isPositive
          ? "border-primary/30 bg-primary/20 text-primary"
          : "bg-card/80"
      )}
    >
      <AlertDescription className="text-sm">{nudge.message}</AlertDescription>
    </Alert>
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
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-mono text-lg font-bold",
            status === "good" && "text-primary",
            status === "bad" && "text-destructive",
            status === "neutral" && "text-muted-foreground"
          )}
        >
          {value}
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {detail}
        </p>
      </CardContent>
    </Card>
  )
}

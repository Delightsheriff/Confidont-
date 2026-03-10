"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis"
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis"
import { DEFAULT_CONFIG } from "@/lib/session-config"
import { generateTopics } from "@/lib/ai/topics"
import type { SessionTopic } from "@/lib/ai/topics"
import type { Nudge, SessionScore } from "@/types/session"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// ─────────────────────────────────────────────
// SessionAnalyzer
//
// Full session flow:
// idle → loading topics → topic 1 → topic 2 → topic 3 → done
//
// Each topic has a 30s minimum before "Next Topic" appears.
// User moves at their own pace after the minimum.
// Session ends after all topics — passes scores to onSessionComplete.
// ─────────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development"
const MINIMUM_TOPIC_SECONDS = 30

type SessionState = "idle" | "loading-topics" | "active" | "done"

interface SessionAnalyzerProps {
  phase?: number
  personaName?: string
  userName?: string
  goal?: string
  weakAreas?: string[]
  completedTopics?: string[]
  totalSessions?: number
  onSessionComplete: (result: SessionResult) => void
}

export interface SessionResult {
  score: SessionScore
  fillerWordCount: number
  topics: SessionTopic[]
  durationSeconds: number
}

export default function SessionAnalyzer({
  phase = 1,
  personaName = "Maya",
  userName = "there",
  goal = "general comfort",
  weakAreas = [],
  completedTopics = [],
  totalSessions = 0,
  onSessionComplete,
}: SessionAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const waveAnimRef = useRef<number | undefined>(undefined)

  // Session state machine
  const [sessionState, setSessionState] = useState<SessionState>("idle")
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [showDebugFeed, setShowDebugFeed] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Topic flow
  const [topics, setTopics] = useState<SessionTopic[]>([])
  const [topicIndex, setTopicIndex] = useState(0)
  const [topicSeconds, setTopicSeconds] = useState(0)
  const [canAdvance, setCanAdvance] = useState(false)
  const topicTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const config = DEFAULT_CONFIG
  const isActive = sessionState === "active" && isCameraReady
  const currentTopic = topics[topicIndex] ?? null

  const { frameMetrics, sessionScore, activeNudge, isReady } = useFaceAnalysis(
    videoRef,
    isActive,
    config
  )

  const { fillerWordCount, detectedFillers, silenceDuration, isListening } =
    useAudioAnalysis(isActive, config)

  // ── Camera helpers ───────────────────────────
  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      })
      return stream
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setCameraError(`Camera access denied: ${msg}`)
      return null
    }
  }, [])

  // ── Waveform ─────────────────────────────────
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
    if (canvas)
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
    analyserRef.current = null
    stopWaveform()
  }, [stopWaveform])

  // ── Topic timer ──────────────────────────────
  const startTopicTimer = useCallback(() => {
    setTopicSeconds(0)
    setCanAdvance(false)
    if (topicTimerRef.current) clearInterval(topicTimerRef.current)

    topicTimerRef.current = setInterval(() => {
      setTopicSeconds((prev) => {
        const next = prev + 1
        if (next >= MINIMUM_TOPIC_SECONDS) setCanAdvance(true)
        return next
      })
    }, 1000)
  }, [])

  const stopTopicTimer = useCallback(() => {
    if (topicTimerRef.current) {
      clearInterval(topicTimerRef.current)
      topicTimerRef.current = null
    }
  }, [])

  // ── Start session ────────────────────────────
  const startSession = useCallback(async () => {
    setSessionState("loading-topics")

    // Load topics and camera in parallel
    const [stream, loadedTopics] = await Promise.all([
      startCamera(),
      generateTopics({
        name: userName,
        goal,
        phase,
        weakAreas,
        completedTopics,
        totalSessions,
      }),
    ])

    if (!stream) {
      setSessionState("idle")
      return
    }

    setTopics(loadedTopics)
    setTopicIndex(0)

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadeddata = () => {
        setIsCameraReady(true)
        setSessionState("active")
        setupWaveform(stream)
        startTopicTimer()
      }
    }
  }, [
    startCamera,
    setupWaveform,
    startTopicTimer,
    userName,
    goal,
    phase,
    weakAreas,
    completedTopics,
    totalSessions,
  ])

  // ── Next topic ───────────────────────────────
  const nextTopic = useCallback(() => {
    stopTopicTimer()
    const nextIndex = topicIndex + 1

    if (nextIndex >= topics.length) {
      // All topics done — end session
      setSessionState("done")
      stopCamera()
      onSessionComplete({
        score: sessionScore,
        fillerWordCount,
        topics,
        durationSeconds: sessionScore.durationSeconds,
      })
    } else {
      setTopicIndex(nextIndex)
      startTopicTimer()
    }
  }, [
    topicIndex,
    topics,
    stopTopicTimer,
    startTopicTimer,
    stopCamera,
    onSessionComplete,
    sessionScore,
    fillerWordCount,
  ])

  // ── Restart session ──────────────────────────
  const restartSession = useCallback(() => {
    stopTopicTimer()
    stopCamera()
    setIsCameraReady(false)
    setTopics([])
    setTopicIndex(0)
    setTopicSeconds(0)
    setCanAdvance(false)
    setSessionState("idle")
  }, [stopTopicTimer, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTopicTimer()
      stopCamera()
      stopWaveform()
    }
  }, [stopTopicTimer, stopCamera, stopWaveform])

  // ── Render ───────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background p-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-mono text-2xl font-bold text-primary">Confidont</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {sessionState === "loading-topics"
            ? `${personaName} is getting ready...`
            : sessionState === "active"
              ? `Session ${topicIndex + 1} of ${topics.length}`
              : isReady
                ? "Ready when you are"
                : "Loading AI model..."}
        </p>
      </div>

      {/* ── Main Session Box ───────────────────── */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Video — always in DOM, opacity controls visibility */}
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

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

        {/* ── Idle state ── */}
        {sessionState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-sm text-muted-foreground">
              {isReady ? "Press Start Session to begin" : "Initialising AI..."}
            </p>
          </div>
        )}

        {/* ── Loading topics state ── */}
        {sessionState === "loading-topics" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-mono text-sm text-muted-foreground">
              Preparing your session...
            </p>
          </div>
        )}

        {/* ── Active state ── */}
        {isActive && currentTopic && (
          <>
            {/* Eye contact indicator — top left */}
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

            {/* Duration — top right */}
            <div className="absolute top-4 right-4 font-mono text-xs text-muted-foreground">
              {formatDuration(sessionScore.durationSeconds)}
            </div>

            {/* Topic prompt — center */}
            <div className="absolute inset-0 flex items-center justify-center px-8">
              <div className="flex flex-col gap-2 text-center">
                <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Topic {topicIndex + 1} of {topics.length}
                </p>
                <p className="font-mono text-lg leading-snug text-foreground">
                  {currentTopic.prompt}
                </p>

                {/* Minimum time progress — subtle fill bar */}
                {!canAdvance && (
                  <div className="mx-auto mt-3 w-32">
                    <div className="h-0.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-primary/50 transition-all duration-1000"
                        style={{
                          width: `${Math.min((topicSeconds / MINIMUM_TOPIC_SECONDS) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-center font-mono text-[10px] text-muted-foreground/50">
                      {MINIMUM_TOPIC_SECONDS - topicSeconds}s
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Nudge banner */}
            {activeNudge && <NudgeBanner nudge={activeNudge} />}
          </>
        )}

        {/* Waveform — bottom */}
        <div className="absolute right-0 bottom-0 left-0 flex h-16 items-end px-4 pb-3">
          {isActive ? (
            <canvas
              ref={canvasRef}
              width={600}
              height={48}
              className="h-12 w-full"
            />
          ) : (
            <div className="flex h-8 w-full items-center gap-px">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-border"
                  style={{ height: `${10 + Math.sin(i * 0.4) * 6}%` }}
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

      {/* Error */}
      {cameraError && (
        <Alert variant="destructive" className="max-w-sm font-mono text-xs">
          <AlertTitle>Camera Error</AlertTitle>
          <AlertDescription>{cameraError}</AlertDescription>
        </Alert>
      )}

      {/* ── Metrics Grid — active only ─────────── */}
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
                ? `${Math.round(silenceDuration)}s silence`
                : "Listening"
            }
          />
        </div>
      )}

      {/* ── Controls ───────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Restart — visible during active session */}
        {sessionState === "active" && (
          <Button
            variant="outline"
            onClick={restartSession}
            className="rounded-full px-6 font-mono text-sm"
          >
            Restart
          </Button>
        )}

        {/* Main CTA */}
        {sessionState === "idle" && (
          <Button
            onClick={startSession}
            disabled={!isReady}
            size="lg"
            className="rounded-full px-10 font-mono text-sm font-bold"
          >
            {isReady ? "Start Session" : "Loading AI..."}
          </Button>
        )}

        {sessionState === "loading-topics" && (
          <Button
            disabled
            size="lg"
            className="rounded-full px-10 font-mono text-sm font-bold"
          >
            Preparing...
          </Button>
        )}

        {/* Next Topic — appears after 30s minimum */}
        {sessionState === "active" && canAdvance && (
          <Button
            onClick={nextTopic}
            size="lg"
            className="animate-in rounded-full px-10 font-mono text-sm font-bold fade-in slide-in-from-bottom-1"
          >
            {topicIndex < topics.length - 1
              ? "Next Topic \u2192"
              : "Finish Session"}
          </Button>
        )}

        {/* Waiting for minimum time */}
        {sessionState === "active" && !canAdvance && (
          <Button
            disabled
            size="lg"
            className="rounded-full px-10 font-mono text-sm font-bold"
          >
            Keep going...
          </Button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
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

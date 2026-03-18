/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis"
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis"
import { DEFAULT_CONFIG } from "@/lib/session-config"
import { generateTopics } from "@/lib/ai/topics"
import type { SessionTopic } from "@/lib/ai/topics"
import type { SessionScore } from "@/types/session"
import type { Persona } from "@/types/user"
import { PersonaAnimationState, PersonaDisplay } from "../persona/PersonaSVGs"
import { useNudgeArbiter } from "@/hooks/Usenudgearbiter"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

// ─────────────────────────────────────────────
// SessionAnalyzer
//
// Layout: stage (persona) → prompt → metrics strip → nudge zone
// Persona is primary. Metrics are minimal, unobtrusive.
// Nudge zone is the only moment of active interruption.
// ─────────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development"
const MINIMUM_TOPIC_SECONDS = 30

type SessionState = "idle" | "loading-topics" | "active" | "done"

// Map nudge types to persona animation states
const NUDGE_TO_ANIMATION: Record<string, PersonaAnimationState> = {
  "eye-contact-lost": "tilt",
  "long-silence": "wave",
  "filler-word-spike": "tilt",
  "speech-too-fast": "nod",
  fidgeting: "tilt",
  "head-tilted": "nod",
  "dim-lighting": "idle",
  "positive-streak": "clap",
}

interface SessionAnalyzerProps {
  phase?: number
  persona: Persona
  userName?: string
  goal?: string
  weakAreas?: string[]
  completedTopics?: string[]
  totalSessions?: number
  onSessionComplete: (result: SessionResult) => void
  onBack?: () => void
}

export interface SessionResult {
  score: SessionScore
  fillerWordCount: number
  topics: SessionTopic[]
  durationSeconds: number
}

export default function SessionAnalyzer({
  phase = 1,
  persona,
  userName = "there",
  goal = "general comfort",
  weakAreas = [],
  completedTopics = [],
  totalSessions = 0,
  onSessionComplete,
  onBack,
}: SessionAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const waveAnimRef = useRef<number | undefined>(undefined)
  const topicTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [sessionState, setSessionState] = useState<SessionState>("idle")
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showDebugFeed, setShowDebugFeed] = useState(false)

  // Topic flow
  const [topics, setTopics] = useState<SessionTopic[]>([])
  const [topicIndex, setTopicIndex] = useState(0)
  const [topicSeconds, setTopicSeconds] = useState(0)
  const [canAdvance, setCanAdvance] = useState(false)

  const isActive = sessionState === "active" && isCameraReady
  const currentTopic = topics[topicIndex] ?? null

  // Audio config — only what useAudioAnalysis needs
  const audioConfig = useMemo(
    () => ({
      metrics: {
        fillerWords: DEFAULT_CONFIG.metrics.fillerWords,
        speechPace: DEFAULT_CONFIG.metrics.speechPace,
        silenceDuration: DEFAULT_CONFIG.metrics.silenceDuration,
      },
    }),
    []
  )

  // ── Nudge arbiter — single coordinator ────────────────────────────
  const { activeNudge, fire: fireNudge } = useNudgeArbiter()

  // ── Persona animation state — derived from activeNudge, no state needed
  const personaState: PersonaAnimationState = activeNudge
    ? (NUDGE_TO_ANIMATION[activeNudge.type] ?? "idle")
    : "idle"

  // ── Face analysis — routes nudge signals to arbiter ───────────────
  const { frameMetrics, sessionScore, isReady } = useFaceAnalysis(
    videoRef,
    isActive,
    DEFAULT_CONFIG,
    fireNudge // arbiter.fire replaces internal nudge dispatch
  )

  // ── Audio analysis — routes nudge signals to arbiter ──────────────
  const { fillerWordCount, detectedFillers, silenceDuration, isListening } =
    useAudioAnalysis(
      isActive,
      audioConfig,
      undefined, // onFillerDetected — not needed at this level
      () => fireNudge("filler-word-spike"), // onFillerSpike
      () => fireNudge("long-silence"), // onSilenceStart (session open 4s)
      () => fireNudge("long-silence") // onLongSilence (mid session 7s)
    )

  // ── Waveform ──────────────────────────────────────────────────────
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
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85
        ctx.fillStyle = `rgba(100, 160, 160, ${0.4 + (dataArray[i] / 255) * 0.5})`
        ctx.beginPath()
        ctx.roundRect(
          x,
          (canvas.height - barHeight) / 2,
          Math.max(barWidth - 1, 1),
          barHeight,
          2
        )
        ctx.fill()
        x += barWidth + 1
      }
    }
    draw()
  }, [])

  const stopWaveform = useCallback(() => {
    if (waveAnimRef.current !== undefined) {
      cancelAnimationFrame(waveAnimRef.current)
      waveAnimRef.current = undefined
    }
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx && canvasRef.current)
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
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
        console.warn("[Confidont] Web Audio API unavailable:", err)
      }
    },
    [drawWaveform]
  )

  // ── Camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    setCameraError(null)
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      })
    } catch (err) {
      setCameraError(
        `Camera access denied: ${err instanceof Error ? err.message : "Unknown error"}`
      )
      return null
    }
  }, [])

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((t) => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    analyserRef.current = null
    stopWaveform()
  }, [stopWaveform])

  // ── Topic timer ────────────────────────────────────────────────────
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

  // ── Start session ──────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setSessionState("loading-topics")
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
    startTopicTimer,
    setupWaveform,
    userName,
    goal,
    phase,
    weakAreas,
    completedTopics,
    totalSessions,
  ])

  // ── Next topic ─────────────────────────────────────────────────────
  const nextTopic = useCallback(() => {
    stopTopicTimer()
    const nextIndex = topicIndex + 1
    if (nextIndex >= topics.length) {
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

  // ── Restart ────────────────────────────────────────────────────────
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

  // Cleanup
  useEffect(
    () => () => {
      stopTopicTimer()
      stopCamera()
    },
    [stopTopicTimer, stopCamera]
  )

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Hidden video — must stay in DOM for MediaPipe */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity duration-500 ${
          showDebugFeed ? "z-50 opacity-30" : "-z-10 opacity-0"
        }`}
      />

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 pt-6 pb-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="font-mono text-xs text-muted-foreground"
        >
          ← back
        </Button>
        <p className="font-mono text-xs text-muted-foreground">
          {sessionState === "active"
            ? `${topicIndex + 1} / ${topics.length}`
            : sessionState === "loading-topics"
              ? "getting ready..."
              : isReady
                ? "ready"
                : "loading..."}
        </p>
        <div className="w-16 text-right font-mono text-xs text-muted-foreground">
          {sessionState === "active"
            ? formatDuration(sessionScore.durationSeconds)
            : ""}
        </div>
      </header>

      {/* ── Stage — persona lives here ───────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-4">
        {/* Persona area */}
        <div className="relative flex items-center justify-center">
          {/* Soft ambient glow behind persona */}
          <div
            className="absolute rounded-full opacity-20 blur-3xl transition-opacity duration-700"
            style={{
              width: 200,
              height: 200,
              backgroundColor: persona.colorAccent
                .replace("bg-", "")
                .includes("-")
                ? getPersonaGlowColor(persona.colorAccent)
                : "#888",
              opacity: activeNudge ? 0.35 : 0.15,
            }}
          />
          <PersonaDisplay
            personaId={persona.id}
            state={personaState}
            size={160}
          />
        </div>

        {/* Persona name — small, grounding */}
        <p className="-mt-4 font-mono text-xs text-muted-foreground">
          {persona.name}
        </p>

        {/* ── Idle state ─────────────────────────────────────────────── */}
        {sessionState === "idle" && (
          <div className="flex max-w-xs flex-col items-center gap-6 text-center">
            <p className="font-mono text-sm leading-relaxed text-foreground">
              {isReady
                ? `${persona.name} is ready when you are.`
                : "Setting things up..."}
            </p>
            <p className="font-mono text-xs text-muted-foreground italic">
              &ldquo;{persona.signatureLine}&rdquo;
            </p>
          </div>
        )}

        {/* ── Loading state ───────────────────────────────────────────── */}
        {sessionState === "loading-topics" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Spinner className="size-4" />
            <p className="font-mono text-sm text-muted-foreground">
              {persona.name} is preparing your session...
            </p>
          </div>
        )}

        {/* ── Active — topic prompt ───────────────────────────────────── */}
        {sessionState === "active" && currentTopic && (
          <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
              Talk about
            </p>
            <p className="font-mono text-base leading-relaxed text-foreground">
              {currentTopic.prompt}
            </p>

            {/* Quiet fill bar — progress toward minimum */}
            {!canAdvance && (
              <div className="mt-1 w-24">
                <div className="h-px overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary/40 transition-all duration-1000"
                    style={{
                      width: `${Math.min((topicSeconds / MINIMUM_TOPIC_SECONDS) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Nudge zone — between persona and controls ───────────────── */}
        {activeNudge && (
          <div
            className={`w-full max-w-xs animate-in rounded-2xl px-5 py-3 text-center font-mono text-sm leading-relaxed transition-all duration-300 fade-in slide-in-from-bottom-2 ${
              activeNudge.type === "positive-streak"
                ? "border border-primary/25 bg-primary/10 text-primary"
                : "border border-border bg-card/70 text-foreground backdrop-blur-sm"
            } `}
          >
            {activeNudge.message}
          </div>
        )}

        {/* ── Metrics strip — live dots + running score after 10s ─────── */}
        {sessionState === "active" && (
          <div className="flex items-center gap-5 font-mono text-xs text-muted-foreground">
            <LiveMetric
              label="eye contact"
              live={frameMetrics?.eyeContact ?? false}
              runningScore={sessionScore.eyeContactPercent}
              hasData={sessionScore.durationSeconds >= 10}
            />
            <LiveMetric
              label="composure"
              live={frameMetrics?.composure ?? false}
              runningScore={sessionScore.composurePercent}
              hasData={sessionScore.durationSeconds >= 10}
            />
            {fillerWordCount > 0 && (
              <span className={fillerWordCount >= 5 ? "text-destructive/60" : ""}>
                {fillerWordCount === 1
                  ? "one filler"
                  : fillerWordCount < 5
                    ? "a few fillers"
                    : "too many fillers"}
              </span>
            )}
            {silenceDuration > 3 && (
              <span className="text-muted-foreground/40">long pause</span>
            )}
          </div>
        )}

        {/* ── Waveform ────────────────────────────────────────────────── */}
        <div className="flex h-8 w-full max-w-xs items-center">
          {sessionState === "active" ? (
            <canvas
              ref={canvasRef}
              width={300}
              height={32}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-6 w-full items-center gap-px opacity-20">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-muted-foreground"
                  style={{ height: `${15 + Math.sin(i * 0.5) * 10}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Controls ────────────────────────────────────────────────── */}
      <footer className="flex flex-col items-center gap-3 px-6 pt-2 pb-8">
        {/* Camera error */}
        {cameraError && (
          <p className="mb-2 max-w-xs text-center font-mono text-xs text-destructive">
            {cameraError}
          </p>
        )}

        <div className="flex items-center gap-3">
          {sessionState === "active" && (
            <Button
              variant="outline"
              onClick={restartSession}
              size="sm"
            >
              restart
            </Button>
          )}

          {sessionState === "idle" && (
            <Button
              disabled={!isReady}
              onClick={startSession}
              className="rounded-full px-10"
              size="lg"
            >
              {isReady ? "Start Session" : "Loading..."}
            </Button>
          )}

          {sessionState === "loading-topics" && (
            <Button
              disabled
              className="rounded-full px-10"
              size="lg"
            >
              Getting ready...
            </Button>
          )}

          {sessionState === "active" && canAdvance && (
            <Button
              onClick={nextTopic}
              className="animate-in rounded-full px-10 fade-in slide-in-from-bottom-1"
              size="lg"
            >
              {topicIndex < topics.length - 1 ? "Next →" : "Finish"}
            </Button>
          )}

          {sessionState === "active" && !canAdvance && (
            <Button
              disabled
              className="rounded-full px-10"
              size="lg"
            >
              keep going...
            </Button>
          )}
        </div>

        {sessionState === "idle" && onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="font-mono text-xs text-muted-foreground"
          >
            ← back
          </Button>
        )}

        {isDev && (
          <button
            onClick={() => setShowDebugFeed((p) => !p)}
            className="mt-1 font-mono text-[10px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
          >
            {showDebugFeed ? "hide feed" : "debug feed"}
          </button>
        )}
      </footer>
    </div>
  )
}

// ── Live metric pill ───────────────────────────────────────────────────

function LiveMetric({
  label,
  live,
  runningScore,
  hasData,
}: {
  label: string
  live: boolean
  runningScore: number
  hasData: boolean
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
          live ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      />
      <span>{label}</span>
      {hasData && (
        <span
          className={`transition-all duration-700 ${
            runningScore >= 65
              ? "text-primary/70"
              : runningScore >= 45
                ? "text-muted-foreground/60"
                : "text-destructive/50"
          }`}
        >
          {runningScore >= 80
            ? "excellent"
            : runningScore >= 65
              ? "strong"
              : runningScore >= 45
                ? "ok"
                : "needs work"}
        </span>
      )}
    </span>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// Map Tailwind color class to raw hex for glow effect
function getPersonaGlowColor(colorAccent: string): string {
  const map: Record<string, string> = {
    "bg-rose-400": "#fb7185",
    "bg-sky-500": "#0ea5e9",
    "bg-amber-400": "#fbbf24",
    "bg-emerald-600": "#059669",
    "bg-violet-500": "#8b5cf6",
  }
  return map[colorAccent] ?? "#888888"
}

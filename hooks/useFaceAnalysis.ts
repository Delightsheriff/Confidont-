/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import type {
  FaceAnalysisConfig,
  FrameMetrics,
  SessionScore,
  Nudge,
  NudgeType,
} from "@/types/session"
import { NUDGE_MESSAGES } from "@/lib/session-config"

// ─────────────────────────────────────────────
// useFaceAnalysis
//
// Core detection hook. Knows nothing about UI.
// Config-driven — enable/disable metrics without
// touching detection logic.
//
// CRITICAL: The video element must stay in the DOM
// and be rendered (not display:none) for MediaPipe
// to receive valid frames.
// Use: opacity-0 absolute pointer-events-none
// instead of className="hidden"
// ─────────────────────────────────────────────

export interface UseFaceAnalysisReturn {
  frameMetrics: FrameMetrics | null
  sessionScore: SessionScore
  activeNudge: Nudge | null
  nudgeCount: number
  isReady: boolean
}

const INITIAL_SCORE: SessionScore = {
  eyeContactPercent: 0,
  composurePercent: 0,
  fillerWordCount: 0,
  speechPaceAvg: null,
  totalPoints: 0,
  durationSeconds: 0,
}

type Landmark = { x: number; y: number; z: number }

// Sustained eye-contact-loss before nudging (ms)
const EYE_CONTACT_LOSS_THRESHOLD_MS = 8_000

// Fidget rolling window: nudge only on sustained movement
// Must be moving in FIDGET_THRESHOLD of last FIDGET_WINDOW_SIZE frames
const FIDGET_WINDOW_SIZE = 30 // ~0.5s at 60fps
const FIDGET_THRESHOLD = 20

// Score update throttle — no need to setState 60x/sec
const SCORE_UPDATE_INTERVAL_MS = 2_000

// Per-type nudge cooldowns
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

export function useFaceAnalysis(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isSessionActive: boolean,
  config: FaceAnalysisConfig
): UseFaceAnalysisReturn {
  const [isReady, setIsReady] = useState(false)
  const [frameMetrics, setFrameMetrics] = useState<FrameMetrics | null>(null)
  const [sessionScore, setSessionScore] = useState<SessionScore>(INITIAL_SCORE)
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null)
  const [nudgeCount, setNudgeCount] = useState(0)

  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const requestRef = useRef<number | undefined>(undefined)
  const prevNoseRef = useRef<{ x: number; y: number } | null>(null)

  // Frame accumulators — written in rAF, never trigger re-renders
  const eyeContactFramesRef = useRef(0)
  const composureFramesRef = useRef(0)
  const totalFramesRef = useRef(0)

  // Fidget rolling window (circular buffer of boolean)
  const fidgetWindowRef = useRef<boolean[]>([])

  // Score throttle
  const lastScoreUpdateRef = useRef<number>(0)

  // Session timing
  const sessionStartRef = useRef<number | null>(null)

  // Live config ref — rAF loop never closes over stale config
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Nudge refs — all state needed by fireNudge lives here
  const nudgeCountRef = useRef(0)
  const perTypeLastNudgeRef = useRef<Partial<Record<NudgeType, number>>>({})
  const eyeLossStartRef = useRef<number | null>(null)
  const positiveStreakStart = useRef<number | null>(null)

  // ── Load MediaPipe ──────────────────────────
  useEffect(() => {
    let cancelled = false
    async function setup() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        )
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        })
        if (!cancelled) {
          landmarkerRef.current = lm
          setIsReady(true)
        }
      } catch (err) {
        console.error("MediaPipe setup failed:", err)
      }
    }
    setup()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Nudge dispatcher ─────────────────────────────────────────────────
  // Stable ([] deps). All decisions made via refs — safe inside rAF.
  const fireNudge = useCallback((type: NudgeType) => {
    const now = performance.now()
    const cfg = configRef.current
    const cap = cfg.thresholds.nudge.sessionCap ?? 4

    if (nudgeCountRef.current >= cap) return
    const lastFired = perTypeLastNudgeRef.current[type] ?? 0
    if (now - lastFired < PER_TYPE_COOLDOWN_MS[type]) return

    const msgs = NUDGE_MESSAGES[type]
    const message = msgs[Math.floor(Math.random() * msgs.length)]

    nudgeCountRef.current++
    perTypeLastNudgeRef.current[type] = now

    setNudgeCount(nudgeCountRef.current)
    setActiveNudge({ type, message, timestamp: now })
    setTimeout(() => setActiveNudge(null), 6_500)
  }, []) // stable

  // ── Per-frame processor ───────────────────────────────────────────────
  // Stable — reads live state only via refs. Re-renders don't recreate it.
  // Therefore the detection loop effect only runs when isSessionActive changes.
  const processFrame = useCallback(
    (landmarks: Landmark[]) => {
      const { metrics, thresholds } = configRef.current
      const now = performance.now()
      totalFramesRef.current++

      const result: FrameMetrics = {
        eyeContact: null,
        composure: null,
        headPose: null,
        blinkRate: null,
        mouthMovement: null,
        fillerWords: [],
        speechPace: null,
        silenceDuration: null,
        backgroundClutter: null,
        lightingQuality: null,
        cameraAngle: null,
      }

      // ── Eye Contact ────────────────────────────────────────
      if (metrics.eyeContact) {
        const hGaze = (iris: Landmark, inner: Landmark, outer: Landmark) =>
          (iris.x - inner.x) / (outer.x - inner.x)

        const leftH = hGaze(landmarks[468], landmarks[33], landmarks[133])
        const rightH = hGaze(landmarks[473], landmarks[362], landmarks[263])
        const leftV =
          (landmarks[468].y - landmarks[159].y) /
          (landmarks[145].y - landmarks[159].y)

        const t = thresholds.eyeContact
        result.eyeContact =
          leftH > t.horizontalMin &&
          leftH < t.horizontalMax &&
          rightH > t.horizontalMin &&
          rightH < t.horizontalMax &&
          leftV > t.verticalMin &&
          leftV < t.verticalMax

        if (result.eyeContact) {
          eyeContactFramesRef.current++
          eyeLossStartRef.current = null

          if (!positiveStreakStart.current) positiveStreakStart.current = now
          if (
            now - positiveStreakStart.current >=
            thresholds.nudge.positiveStreakSeconds * 1000
          ) {
            fireNudge("positive-streak")
            positiveStreakStart.current = now
          }
        } else {
          positiveStreakStart.current = null
          if (!eyeLossStartRef.current) eyeLossStartRef.current = now
          if (now - eyeLossStartRef.current >= EYE_CONTACT_LOSS_THRESHOLD_MS) {
            fireNudge("eye-contact-lost")
            eyeLossStartRef.current = now // reset window; per-type cooldown prevents spam
          }
        }
      }

      // ── Composure ─────────────────────────────────────────
      if (metrics.composure) {
        const nose = landmarks[4]
        let movement = 0
        if (prevNoseRef.current) {
          const dx = nose.x - prevNoseRef.current.x
          const dy = nose.y - prevNoseRef.current.y
          movement = Math.sqrt(dx * dx + dy * dy)
        }
        prevNoseRef.current = { x: nose.x, y: nose.y }

        const isMoving = movement >= thresholds.composure.maxMovement
        result.composure = !isMoving
        if (!isMoving) composureFramesRef.current++

        // Rolling window — nudge only on sustained movement, not a twitch
        fidgetWindowRef.current.push(isMoving)
        if (fidgetWindowRef.current.length > FIDGET_WINDOW_SIZE) {
          fidgetWindowRef.current.shift()
        }
        if (
          fidgetWindowRef.current.length === FIDGET_WINDOW_SIZE &&
          fidgetWindowRef.current.filter(Boolean).length >= FIDGET_THRESHOLD
        ) {
          fireNudge("fidgeting")
          fidgetWindowRef.current = [] // reset after nudge
        }
      }

      // ── Head Pose ──────────────────────────────────────────
      if (metrics.headPose) {
        const nose = landmarks[4]
        const center = landmarks[168]
        const yaw = (nose.x - center.x) * 100
        const pitch = (nose.y - center.y) * 100
        const roll = (landmarks[454].y - landmarks[234].y) * 100
        result.headPose = { pitch, yaw, roll }
        if (
          Math.abs(yaw) > thresholds.headPose.maxYaw ||
          Math.abs(pitch) > thresholds.headPose.maxPitch
        )
          fireNudge("head-tilted")
      }

      // ── Mouth Movement ─────────────────────────────────────
      if (metrics.mouthMovement) {
        result.mouthMovement = Math.min(
          Math.abs(landmarks[14].y - landmarks[13].y) * 10,
          1
        )
      }

      // ── Camera Angle ───────────────────────────────────────
      if (metrics.cameraAngle) {
        const y = landmarks[4].y
        result.cameraAngle =
          y < 0.25 ? "too-high" : y > 0.75 ? "too-low" : "eye-level"
      }

      // ── Lighting Quality ───────────────────────────────────
      if (metrics.lightingQuality) {
        const zs = [
          landmarks[1],
          landmarks[33],
          landmarks[263],
          landmarks[4],
        ].map((p) => p.z)
        const zRange = Math.max(...zs) - Math.min(...zs)
        result.lightingQuality = zRange > 0.15 ? "harsh" : "good"
        if (result.lightingQuality === "harsh") fireNudge("dim-lighting")
      }

      // Frame metrics update on every frame (drives live visual indicators)
      setFrameMetrics(result)

      // Score update throttled to every 2s — score display doesn't need 60fps
      if (now - lastScoreUpdateRef.current >= SCORE_UPDATE_INTERVAL_MS) {
        lastScoreUpdateRef.current = now
        const elapsed = sessionStartRef.current
          ? (now - sessionStartRef.current) / 1000
          : 0
        setSessionScore({
          eyeContactPercent:
            totalFramesRef.current > 0
              ? Math.round(
                  (eyeContactFramesRef.current / totalFramesRef.current) * 100
                )
              : 0,
          composurePercent:
            totalFramesRef.current > 0
              ? Math.round(
                  (composureFramesRef.current / totalFramesRef.current) * 100
                )
              : 0,
          fillerWordCount: 0, // managed by useAudioAnalysis
          speechPaceAvg: null, // managed by useAudioAnalysis
          totalPoints: 0, // calculated at session end
          durationSeconds: Math.round(elapsed),
        })
      }
    },
    [fireNudge]
  ) // stable — fireNudge is stable, reads config via ref

  // ── Detection Loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (!landmarkerRef.current || !isSessionActive || !videoRef.current) return

    // Full reset on session start
    sessionStartRef.current = performance.now()
    lastScoreUpdateRef.current = 0
    eyeContactFramesRef.current = 0
    composureFramesRef.current = 0
    totalFramesRef.current = 0
    prevNoseRef.current = null
    positiveStreakStart.current = null
    eyeLossStartRef.current = null
    fidgetWindowRef.current = []
    nudgeCountRef.current = 0
    perTypeLastNudgeRef.current = {}
    setNudgeCount(0)
    setSessionScore(INITIAL_SCORE)

    const predict = () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        requestRef.current = requestAnimationFrame(predict)
        return
      }
      const res = landmarkerRef.current!.detectForVideo(
        video,
        performance.now()
      )
      if (res.faceLandmarks?.length > 0) processFrame(res.faceLandmarks[0])
      requestRef.current = requestAnimationFrame(predict)
    }

    requestRef.current = requestAnimationFrame(predict)
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = undefined
      }
    }
    // processFrame is stable — this effect only re-runs on isSessionActive change
  }, [isSessionActive, processFrame, videoRef])

  return { frameMetrics, sessionScore, activeNudge, nudgeCount, isReady }
}

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

export function useFaceAnalysis(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isSessionActive: boolean,
  config: FaceAnalysisConfig
): UseFaceAnalysisReturn {
  const [isReady, setIsReady] = useState(false)
  const [frameMetrics, setFrameMetrics] = useState<FrameMetrics | null>(null)
  const [sessionScore, setSessionScore] = useState<SessionScore>(INITIAL_SCORE)
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null)

  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const requestRef = useRef<number | undefined>(undefined)
  const prevNoseRef = useRef<{ x: number; y: number } | null>(null)
  const eyeContactFramesRef = useRef(0)
  const composureFramesRef = useRef(0)
  const totalFramesRef = useRef(0)
  const sessionStartRef = useRef<number | null>(null)
  const lastNudgeTimeRef = useRef<number>(0)
  const positiveStreakStartRef = useRef<number | null>(null)

  // ── Load MediaPipe ──────────────────────────
  useEffect(() => {
    let cancelled = false
    const setup = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        )
        const faceLandmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          }
        )
        if (!cancelled) {
          landmarkerRef.current = faceLandmarker
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

  // ── Nudge dispatcher ────────────────────────
  const fireNudge = useCallback(
    (type: NudgeType) => {
      const now = performance.now()
      if (now - lastNudgeTimeRef.current < config.thresholds.nudge.cooldownMs)
        return
      const messages = NUDGE_MESSAGES[type]
      const message = messages[Math.floor(Math.random() * messages.length)]
      lastNudgeTimeRef.current = now
      setActiveNudge({ type, message, timestamp: now })
      setTimeout(() => setActiveNudge(null), 5000)
    },
    [config.thresholds.nudge.cooldownMs]
  )

  // ── Per-frame processor ──────────────────────
  const processFrame = useCallback(
    (landmarks: Landmark[]) => {
      const { metrics, thresholds } = config
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

      // ── Eye Contact ──────────────────────────
      if (metrics.eyeContact) {
        const getHGaze = (iris: Landmark, inner: Landmark, outer: Landmark) =>
          (iris.x - inner.x) / (outer.x - inner.x)

        const leftGaze = getHGaze(landmarks[468], landmarks[33], landmarks[133])
        const rightGaze = getHGaze(
          landmarks[473],
          landmarks[362],
          landmarks[263]
        )
        const leftVertical =
          (landmarks[468].y - landmarks[159].y) /
          (landmarks[145].y - landmarks[159].y)

        const { horizontalMin, horizontalMax, verticalMin, verticalMax } =
          thresholds.eyeContact

        result.eyeContact =
          leftGaze > horizontalMin &&
          leftGaze < horizontalMax &&
          rightGaze > horizontalMin &&
          rightGaze < horizontalMax &&
          leftVertical > verticalMin &&
          leftVertical < verticalMax

        if (result.eyeContact) {
          eyeContactFramesRef.current++
          if (!positiveStreakStartRef.current)
            positiveStreakStartRef.current = now
          const streakSeconds = (now - positiveStreakStartRef.current) / 1000
          if (streakSeconds >= thresholds.nudge.positiveStreakSeconds) {
            fireNudge("positive-streak")
            positiveStreakStartRef.current = now
          }
        } else {
          positiveStreakStartRef.current = null
          fireNudge("eye-contact-lost")
        }
      }

      // ── Composure / Stability ────────────────
      if (metrics.composure) {
        const nose = landmarks[4]
        let movement = 0
        if (prevNoseRef.current) {
          movement = Math.sqrt(
            Math.pow(nose.x - prevNoseRef.current.x, 2) +
              Math.pow(nose.y - prevNoseRef.current.y, 2)
          )
        }
        prevNoseRef.current = { x: nose.x, y: nose.y }
        result.composure = movement < thresholds.composure.maxMovement
        if (result.composure) {
          composureFramesRef.current++
        } else {
          fireNudge("fidgeting")
        }
      }

      // ── Head Pose ────────────────────────────
      // Simplified heuristic — nose tip relative to face center
      // Full euler angles require 3D projection (future improvement)
      if (metrics.headPose) {
        const noseTip = landmarks[4]
        const faceCenter = landmarks[168]
        const yaw = (noseTip.x - faceCenter.x) * 100
        const pitch = (noseTip.y - faceCenter.y) * 100
        const roll = (landmarks[454].y - landmarks[234].y) * 100
        result.headPose = { pitch, yaw, roll }
        if (
          Math.abs(yaw) > thresholds.headPose.maxYaw ||
          Math.abs(pitch) > thresholds.headPose.maxPitch
        ) {
          fireNudge("head-tilted")
        }
      }

      // ── Blink Rate ───────────────────────────
      // Scaffolded — uses eye aspect ratio (EAR)
      // Needs rolling 60s window accumulator before enabling
      // if (metrics.blinkRate) {
      //   const topLid    = landmarks[159]
      //   const bottomLid = landmarks[145]
      //   const EAR = Math.abs(topLid.y - bottomLid.y)
      //   // EAR < 0.02 = blink detected, accumulate in rolling window
      // }

      // ── Mouth Movement ───────────────────────
      // Openness ratio 0-1 — foundation for pace detection
      if (metrics.mouthMovement) {
        const upperLip = landmarks[13]
        const lowerLip = landmarks[14]
        result.mouthMovement = Math.min(
          Math.abs(lowerLip.y - upperLip.y) * 10,
          1
        )
      }

      // ── Camera Angle ─────────────────────────
      if (metrics.cameraAngle) {
        const noseY = landmarks[4].y
        result.cameraAngle =
          noseY < 0.25 ? "too-high" : noseY > 0.75 ? "too-low" : "eye-level"
      }

      // ── Lighting Quality ─────────────────────
      // Z-range of key landmarks as rough depth/lighting proxy
      if (metrics.lightingQuality) {
        const zValues = [
          landmarks[1],
          landmarks[33],
          landmarks[263],
          landmarks[4],
        ].map((p) => p.z)
        const zRange = Math.max(...zValues) - Math.min(...zValues)
        result.lightingQuality = zRange > 0.15 ? "harsh" : "good"
        if (result.lightingQuality === "harsh") fireNudge("dim-lighting")
      }

      // ── Background Clutter ───────────────────
      // Future: face detection confidence as proxy
      // if (metrics.backgroundClutter) { ... }

      // ── Noisy Environment ────────────────────
      // Future: audio noise floor via AnalyserNode (Web Audio API)
      // if (metrics.noisyEnvironment) { ... }

      // ── Update cumulative scores ─────────────
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

      setFrameMetrics(result)
    },
    [config, fireNudge]
  )

  // ── Detection Loop ──────────────────────────
  useEffect(() => {
    if (!landmarkerRef.current || !isSessionActive || !videoRef.current) return

    // Reset accumulators
    sessionStartRef.current = performance.now()
    eyeContactFramesRef.current = 0
    composureFramesRef.current = 0
    totalFramesRef.current = 0
    prevNoseRef.current = null
    positiveStreakStartRef.current = null

    const predict = () => {
      const video = videoRef.current
      // Video must be in DOM and playing — not display:none
      if (!video || video.readyState < 2) {
        requestRef.current = requestAnimationFrame(predict)
        return
      }
      const results = landmarkerRef.current!.detectForVideo(
        video,
        performance.now()
      )
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        processFrame(results.faceLandmarks[0])
      }
      requestRef.current = requestAnimationFrame(predict)
    }

    requestRef.current = requestAnimationFrame(predict)
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = undefined
      }
    }
  }, [isSessionActive, processFrame, videoRef])

  return { frameMetrics, sessionScore, activeNudge, isReady }
}

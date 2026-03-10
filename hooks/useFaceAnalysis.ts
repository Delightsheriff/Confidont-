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
// Accepts a config object — enable/disable metrics
// without touching detection logic.
//
// Usage:
//   const { frameMetrics, sessionScore, nudge, isReady } =
//     useFaceAnalysis(videoRef, isSessionActive, config)
// ─────────────────────────────────────────────

interface UseFaceAnalysisReturn {
  frameMetrics: FrameMetrics | null
  sessionScore: SessionScore
  activeNudge: Nudge | null
  isReady: boolean // landmarker loaded and ready
  eyeContactFrames: number
  totalFrames: number
}

const INITIAL_SCORE: SessionScore = {
  eyeContactPercent: 0,
  composurePercent: 0,
  fillerWordCount: 0,
  speechPaceAvg: null,
  totalPoints: 0,
  durationSeconds: 0,
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
  const [eyeContactFrames, setEyeContactFrames] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)

  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const requestRef = useRef<number | undefined>(undefined)
  const prevNoseRef = useRef<{ x: number; y: number } | null>(null)

  // Score accumulators
  const eyeContactFramesRef = useRef(0)
  const composureFramesRef = useRef(0)
  const totalFramesRef = useRef(0)
  const sessionStartRef = useRef<number | null>(null)

  // Nudge cooldown
  const lastNudgeTimeRef = useRef<number>(0)
  const positiveStreakStartRef = useRef<number | null>(null)

  // ── Load MediaPipe ──────────────────────────
  useEffect(() => {
    const setup = async () => {
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
      landmarkerRef.current = faceLandmarker
      setIsReady(true)
    }
    setup()
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

      // Auto-dismiss after 5s
      setTimeout(() => setActiveNudge(null), 5000)
    },
    [config.thresholds.nudge.cooldownMs]
  )

  // ── Per-frame metric processor ──────────────
  const processFrame = useCallback(
    (landmarks: { x: number; y: number; z: number }[]) => {
      const { metrics, thresholds } = config
      const now = performance.now()
      totalFramesRef.current++

      const result: Partial<FrameMetrics> = {
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
        const getGaze = (
          iris: { x: number; y: number; z: number },
          inner: { x: number; y: number; z: number },
          outer: { x: number; y: number; z: number }
        ) => (iris.x - inner.x) / (outer.x - inner.x)

        const leftGaze = getGaze(landmarks[468], landmarks[33], landmarks[133])
        const rightGaze = getGaze(
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
          if (!positiveStreakStartRef.current) {
            positiveStreakStartRef.current = now
          }
        } else {
          positiveStreakStartRef.current = null
          fireNudge("eye-contact-lost")
        }

        // Positive streak nudge
        if (positiveStreakStartRef.current) {
          const streakMs = (now - positiveStreakStartRef.current) / 1000
          if (streakMs >= config.thresholds.nudge.positiveStreakSeconds) {
            fireNudge("positive-streak")
            positiveStreakStartRef.current = now // reset streak timer
          }
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
        prevNoseRef.current = nose
        result.composure = movement < thresholds.composure.maxMovement

        if (result.composure) {
          composureFramesRef.current++
        } else {
          fireNudge("fidgeting")
        }
      }

      // ── Head Pose ────────────────────────────
      // Heuristic using nose tip vs face center landmarks
      // Full euler angles require 3D projection — simplified here
      if (metrics.headPose) {
        const noseTip = landmarks[4]
        const faceCenter = landmarks[168] // mid nose bridge

        const yawDelta = (noseTip.x - faceCenter.x) * 100
        const pitchDelta = (noseTip.y - faceCenter.y) * 100
        const rollDelta = (landmarks[454].y - landmarks[234].y) * 100

        result.headPose = {
          pitch: pitchDelta,
          yaw: yawDelta,
          roll: rollDelta,
        }

        if (
          Math.abs(yawDelta) > thresholds.headPose.maxYaw ||
          Math.abs(pitchDelta) > thresholds.headPose.maxPitch
        ) {
          fireNudge("head-tilted")
        }
      }

      // ── Blink Rate ───────────────────────────
      // Disabled by default — needs rolling window accumulator
      // if (metrics.blinkRate) { ... }

      // ── Mouth Movement ───────────────────────
      // Rough openness ratio for future pace detection
      if (metrics.mouthMovement) {
        const upperLip = landmarks[13]
        const lowerLip = landmarks[14]
        const mouthOpen = Math.abs(lowerLip.y - upperLip.y)
        result.mouthMovement = Math.min(mouthOpen * 10, 1)
      }

      // ── Camera Angle ─────────────────────────
      // Face vertical center should be roughly in middle third of frame
      if (metrics.cameraAngle) {
        const noseTip = landmarks[4]
        if (noseTip.y < 0.25) {
          result.cameraAngle = "too-high"
        } else if (noseTip.y > 0.75) {
          result.cameraAngle = "too-low"
        } else {
          result.cameraAngle = "eye-level"
        }
      }

      // ── Lighting Quality ─────────────────────
      // Heuristic: face landmark detection confidence correlates with lighting
      // Low z-variance on key landmarks = flat, well-lit face
      if (metrics.lightingQuality) {
        const keyPoints = [
          landmarks[1],
          landmarks[33],
          landmarks[263],
          landmarks[4],
        ]
        const zValues = keyPoints.map((p) => p.z)
        const zRange = Math.max(...zValues) - Math.min(...zValues)

        // Very rough heuristic — refine with real data
        if (zRange > 0.15) {
          result.lightingQuality = "harsh"
          fireNudge("dim-lighting")
        } else {
          result.lightingQuality = "good"
        }
      }

      // ── Background Clutter ───────────────────
      // Future: use face detection confidence as proxy
      // High confidence = clear background
      // if (metrics.backgroundClutter) { ... }

      // ── Update scores ────────────────────────
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
        fillerWordCount: 0, // managed by useAudioAnalysis hook
        speechPaceAvg: null,
        totalPoints: 0, // calculated at session end
        durationSeconds: Math.round(elapsed),
      })

      setFrameMetrics(result as FrameMetrics)
      setEyeContactFrames(eyeContactFramesRef.current)
      setTotalFrames(totalFramesRef.current)
    },
    [config, fireNudge]
  )

  // ── Detection Loop ──────────────────────────
  useEffect(() => {
    if (!landmarkerRef.current || !isSessionActive || !videoRef.current) return

    if (isSessionActive) {
      sessionStartRef.current = performance.now()
      eyeContactFramesRef.current = 0
      composureFramesRef.current = 0
      totalFramesRef.current = 0
    }

    const predict = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        requestRef.current = requestAnimationFrame(predict)
        return
      }

      const results = landmarkerRef.current!.detectForVideo(
        videoRef.current,
        performance.now()
      )

      if (results.faceLandmarks?.length > 0) {
        processFrame(results.faceLandmarks[0])
      }

      requestRef.current = requestAnimationFrame(predict)
    }

    requestRef.current = requestAnimationFrame(predict)

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isSessionActive, processFrame, videoRef])

  return {
    frameMetrics,
    sessionScore,
    activeNudge,
    isReady,
    eyeContactFrames,
    totalFrames,
  }
}

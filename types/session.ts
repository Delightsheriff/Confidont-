// ─────────────────────────────────────────────
// All session metric types for Confidont
// ─────────────────────────────────────────────

export interface MetricsConfig {
  // VISION METRICS (MediaPipe)
  eyeContact: boolean
  composure: boolean
  headPose: boolean
  blinkRate: boolean
  mouthMovement: boolean

  // AUDIO METRICS (Web Speech API)
  fillerWords: boolean
  speechPace: boolean
  silenceDuration: boolean

  // ENVIRONMENT METRICS
  backgroundClutter: boolean
  lightingQuality: boolean
  cameraAngle: boolean
}

export interface FrameMetrics {
  eyeContact: boolean | null
  composure: boolean | null
  headPose: HeadPose | null
  blinkRate: number | null
  mouthMovement: number | null
  fillerWords: string[]
  speechPace: number | null
  silenceDuration: number | null
  backgroundClutter: "clear" | "cluttered" | null
  lightingQuality: "good" | "dim" | "harsh" | null
  cameraAngle: "eye-level" | "too-high" | "too-low" | null
}

export interface HeadPose {
  pitch: number
  yaw: number
  roll: number
}

export interface SessionScore {
  eyeContactPercent: number
  composurePercent: number
  fillerWordCount: number
  speechPaceAvg: number | null
  totalPoints: number
  durationSeconds: number
}

export type NudgeType =
  | "eye-contact-lost"
  | "speech-too-fast"
  | "speech-too-slow"
  | "long-silence"
  | "filler-word-spike"
  | "fidgeting"
  | "head-tilted"
  | "dim-lighting"
  | "positive-streak"

export interface Nudge {
  type: NudgeType
  message: string
  timestamp: number
}

export interface FaceAnalysisConfig {
  metrics: MetricsConfig
  thresholds: AnalysisThresholds
}

export interface AnalysisThresholds {
  eyeContact: {
    horizontalMin: number
    horizontalMax: number
    verticalMin: number
    verticalMax: number
  }
  composure: {
    maxMovement: number
  }
  headPose: {
    maxPitch: number
    maxYaw: number
    maxRoll: number
  }
  blinkRate: {
    minNormal: number
    maxNormal: number
  }
  speechPace: {
    minWPM: number
    maxWPM: number
  }
  silence: {
    maxSeconds: number
  }
  nudge: {
    cooldownMs: number // legacy — still used as fallback
    positiveStreakSeconds: number
    sessionCap: number // max total nudges per session (default 4)
  }
}

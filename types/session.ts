// ─────────────────────────────────────────────
// All session metric types for Confidont
// Add new metrics here first, then implement in
// useFaceAnalysis and useAudioAnalysis hooks
// ─────────────────────────────────────────────

export interface MetricsConfig {
  // VISION METRICS (MediaPipe)
  eyeContact: boolean // Is user looking at camera
  composure: boolean // Head stability / not fidgeting
  headPose: boolean // Head tilt / rotation (nodding, turning)
  blinkRate: boolean // Blinks per minute — too fast = anxious, too slow = staring
  mouthMovement: boolean // Talking pace via mouth openness
  // expressiveness: boolean  // Future: smile, raised brows, engaged expression

  // AUDIO METRICS (Web Speech API)
  fillerWords: boolean // "um", "uh", "like", "you know", "basically"
  speechPace: boolean // Words per minute — too fast or too slow
  silenceDuration: boolean // Long pauses mid sentence
  // voiceClarity: boolean   // Future: clarity scoring via audio analysis

  // ENVIRONMENT METRICS (MediaPipe + heuristics)
  backgroundClutter: boolean // Busy background detected via face landmark confidence
  lightingQuality: boolean // Face brightness/contrast heuristic
  cameraAngle: boolean // Face vertical position — should be at eye level
  // noisyEnvironment: boolean // Future: audio noise floor detection
}

export interface FrameMetrics {
  // Vision
  eyeContact: boolean | null
  composure: boolean | null
  headPose: HeadPose | null
  blinkRate: number | null // blinks per minute (rolling)
  mouthMovement: number | null // 0-1 openness ratio

  // Audio
  fillerWords: string[] // filler words detected this frame window
  speechPace: number | null // words per minute
  silenceDuration: number | null // seconds of current silence

  // Environment
  backgroundClutter: "clear" | "cluttered" | null
  lightingQuality: "good" | "dim" | "harsh" | null
  cameraAngle: "eye-level" | "too-high" | "too-low" | null
}

export interface HeadPose {
  pitch: number // up/down tilt
  yaw: number // left/right rotation
  roll: number // side tilt
}

export interface SessionScore {
  eyeContactPercent: number // 0-100
  composurePercent: number // 0-100
  fillerWordCount: number // total count
  speechPaceAvg: number | null // avg WPM
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
    horizontalMin: number // default 0.42
    horizontalMax: number // default 0.58
    verticalMin: number // default 0.4
    verticalMax: number // default 0.65
  }
  composure: {
    maxMovement: number // default 0.005 — nose movement delta
  }
  headPose: {
    maxPitch: number // degrees — default 15
    maxYaw: number // degrees — default 20
    maxRoll: number // degrees — default 15
  }
  blinkRate: {
    minNormal: number // blinks/min — default 10
    maxNormal: number // blinks/min — default 25
  }
  speechPace: {
    minWPM: number // default 110
    maxWPM: number // default 160
  }
  silence: {
    maxSeconds: number // default 8
  }
  nudge: {
    cooldownMs: number // default 20000 — min time between nudges
    positiveStreakSeconds: number // default 30 — seconds of good metrics for positive nudge
  }
}

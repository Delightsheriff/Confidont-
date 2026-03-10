import type { FaceAnalysisConfig, NudgeType } from "@/types/session"

// ─────────────────────────────────────────────
// Default configuration
// Override per-session based on user phase/goal
// ─────────────────────────────────────────────

export const DEFAULT_CONFIG: FaceAnalysisConfig = {
  metrics: {
    // Vision
    eyeContact: true,
    composure: true,
    headPose: true,
    blinkRate: false, // commented out until calibrated
    mouthMovement: false, // future use

    // Audio
    fillerWords: true,
    speechPace: false, // future — needs word count accuracy
    silenceDuration: true,

    // Environment
    backgroundClutter: false, // future — needs confidence threshold tuning
    lightingQuality: true,
    cameraAngle: true,
  },
  thresholds: {
    eyeContact: {
      horizontalMin: 0.42,
      horizontalMax: 0.58,
      verticalMin: 0.4,
      verticalMax: 0.65,
    },
    composure: {
      maxMovement: 0.005,
    },
    headPose: {
      maxPitch: 15,
      maxYaw: 20,
      maxRoll: 15,
    },
    blinkRate: {
      minNormal: 10,
      maxNormal: 25,
    },
    speechPace: {
      minWPM: 110,
      maxWPM: 160,
    },
    silence: {
      maxSeconds: 8,
    },
    nudge: {
      cooldownMs: 20000,
      positiveStreakSeconds: 30,
    },
  },
}

// ─────────────────────────────────────────────
// Nudge messages — persona-toned, never harsh
// Keyed by nudge type for easy swapping per persona
// ─────────────────────────────────────────────

export const NUDGE_MESSAGES: Record<NudgeType, string[]> = {
  "eye-contact-lost": [
    "Try looking at the camera — you've got this.",
    "Bring your eyes back to the lens when you can.",
    "The camera is your audience — look at them.",
  ],
  "speech-too-fast": [
    "Slow down a little, take your time.",
    "You're rushing — breathe and let each word land.",
    "Pace yourself, confidence sounds unhurried.",
  ],
  "speech-too-slow": [
    "Keep your energy up, you're doing great.",
    "A little more momentum — you've got the room.",
  ],
  "long-silence": [
    "Take a breath — whenever you're ready.",
    "It's okay to pause, just keep going when you can.",
    "Silence is fine — collect your thoughts and continue.",
  ],
  "filler-word-spike": [
    "Try pausing instead of filling — it sounds more confident.",
    "Instead of 'um', just breathe. Silence is powerful.",
  ],
  fidgeting: [
    "Try to stay still — it helps you look more composed.",
    "Ground yourself — plant your feet and settle in.",
  ],
  "head-tilted": [
    "Keep your head level — it reads as more confident.",
    "Straighten up a little — you've got great posture in you.",
  ],
  "dim-lighting": [
    "Your lighting is a bit dim — try facing a light source if you can.",
  ],
  "positive-streak": [
    "You're doing really well — keep that up!",
    "That's the energy — stay right there.",
    "Great eye contact, you look completely natural.",
    "You're in the zone now. This is you at your best.",
  ],
}

// Filler words to detect
export const FILLER_WORDS = [
  "um",
  "uh",
  "uhh",
  "umm",
  "like",
  "basically",
  "literally",
  "you know",
  "i mean",
  "kind of",
  "sort of",
  "actually",
  "honestly",
  "right",
  "okay so",
  "so yeah",
]

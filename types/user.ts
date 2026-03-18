// ─────────────────────────────────────────────
// types/user.ts
// ─────────────────────────────────────────────

export type Pronoun = "she/her" | "he/him" | "they/them" | "prefer not to say"

export type Goal =
  | "job-interviews"
  | "presentations"
  | "video-calls"
  | "content-creation"
  | "general-comfort"

export type CameraConfidence =
  | "avoid-entirely"
  | "freeze-or-fumble"
  | "manage-want-to-improve"

export type SessionsPerDay = 1 | 2 | 3

export interface OnboardingAnswers {
  name: string
  pronouns: Pronoun
  goal: Goal
  cameraConfidence: CameraConfidence
  sessionsPerDay: SessionsPerDay
  personaId: string
}

export interface UserProfile extends OnboardingAnswers {
  completedAt: string
}

// ─────────────────────────────────────────────
// Personas
// ─────────────────────────────────────────────

export interface PersonaVoiceConfig {
  rate: number   // 0.5–2.0 speaking speed
  pitch: number  // 0–2.0 voice pitch
  preferFemale: boolean
}

export interface Persona {
  id: string
  name: string
  ageRange: string
  personality: string
  communicationStyle: string
  feedbackStyle: string
  signatureLine: string
  colorAccent: string
  voiceConfig: PersonaVoiceConfig
  sessionIntro: string // spoken at session start when voice mode is on
}

export const PERSONAS: Persona[] = [
  {
    id: "amara",
    name: "Amara",
    ageRange: "late 20s",
    personality: "warm, patient, genuine",
    communicationStyle:
      "Speaks like a close friend who has always believed in you.",
    feedbackStyle: "Leads with what went right before anything else.",
    signatureLine: "You're doing better than you think.",
    colorAccent: "bg-rose-400",
    voiceConfig: { rate: 0.92, pitch: 1.08, preferFemale: true },
    sessionIntro:
      "Hey, I'm Amara. I'll be right here with you the whole time. No pressure at all — just talk to me like you would a friend.",
  },
  {
    id: "james",
    name: "James",
    ageRange: "early 40s",
    personality: "calm, structured, reliable",
    communicationStyle:
      "Clear and methodical — breaks everything into steps you can act on.",
    feedbackStyle: "Gives you tools and frameworks, not just encouragement.",
    signatureLine: "Let's break this down.",
    colorAccent: "bg-sky-500",
    voiceConfig: { rate: 0.9, pitch: 0.88, preferFemale: false },
    sessionIntro:
      "Hello. I'm James. We'll keep things simple and structured today. Just take it one step at a time — I'm with you.",
  },
  {
    id: "zoe",
    name: "Zoe",
    ageRange: "early 20s",
    personality: "energetic, casual, real",
    communicationStyle: "Feels like a peer who has already been where you are.",
    feedbackStyle: "Uses light humour to keep things from feeling heavy.",
    signatureLine: "Okay but actually — you did great.",
    colorAccent: "bg-amber-400",
    voiceConfig: { rate: 1.05, pitch: 1.15, preferFemale: true },
    sessionIntro:
      "Hey! I'm Zoe. Honestly? Just be yourself — that is literally all this is. We're going to be fine. Let's go.",
  },
  {
    id: "dr-nkosi",
    name: "Dr. Nkosi",
    ageRange: "mid 50s",
    personality: "wise, measured, considered",
    communicationStyle:
      "Academic but never cold — makes your growth feel meaningful.",
    feedbackStyle:
      "Puts setbacks in context. Never dismisses, never catastrophises.",
    signatureLine: "Progress is rarely linear. That's fine.",
    colorAccent: "bg-emerald-600",
    voiceConfig: { rate: 0.87, pitch: 0.9, preferFemale: false },
    sessionIntro:
      "Good to meet you. I'm Dr. Nkosi. We'll take our time today. This is just a conversation — there's nothing to get right or wrong.",
  },
  {
    id: "priya",
    name: "Priya",
    ageRange: "early 30s",
    personality: "direct, motivating, no-fluff",
    communicationStyle:
      "High energy without being exhausting — tells you exactly where you stand.",
    feedbackStyle:
      "Won't let you be too hard on yourself but won't sugarcoat either.",
    signatureLine: "You're closer than you think. Let's go again.",
    colorAccent: "bg-violet-500",
    voiceConfig: { rate: 0.95, pitch: 1.05, preferFemale: true },
    sessionIntro:
      "Hi, I'm Priya. No fuss — let's just see where you are today and build from there. Whenever you're ready.",
  },
]

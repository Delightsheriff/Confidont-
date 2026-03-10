// ─────────────────────────────────────────────
// types/user.ts
//
// User profile, onboarding answers, personas.
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

export type SuccessDefinition =
  | "nail-an-interview"
  | "get-through-presentations"
  | "feel-natural-on-calls"
  | "build-content-presence"

export type SessionsPerDay = 1 | 2 | 3

export interface OnboardingAnswers {
  name: string
  pronouns: Pronoun
  goal: Goal
  cameraConfidence: CameraConfidence
  successDefinition: SuccessDefinition
  sessionsPerDay: SessionsPerDay
  personaId: string
}

export interface UserProfile extends OnboardingAnswers {
  completedAt: string // ISO date
}

// ─────────────────────────────────────────────
// Personas
// ─────────────────────────────────────────────

export interface Persona {
  id: string
  name: string
  ageRange: string
  personality: string // 3 words
  communicationStyle: string // one sentence
  feedbackStyle: string // one sentence
  signatureLine: string // their vibe in one quote
  colorAccent: string // tailwind bg class for avatar placeholder
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
  },
]

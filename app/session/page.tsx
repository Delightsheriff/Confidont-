// import SessionAnalyzer from "@/components/session/SessionAnalyzer"

// export default function Page() {
//   return (
//     <>
//       {/* <CameraAnalyzer /> */}
//       <SessionAnalyzer />
//     </>
//   )
// }
"use client"

import { useState } from "react"
import SessionAnalyzer, {
  type SessionResult,
} from "@/components/session/SessionAnalyzer"
import SessionSummary from "@/components/session/SessionSummary"
import { getProgress } from "@/lib/storage/session"
import { getProfile } from "@/lib/storage/user"
import { PERSONAS } from "@/types/user"

// ─────────────────────────────────────────────
// /session page
//
// Orchestrates the full session flow:
// SessionAnalyzer → SessionSummary → SessionAnalyzer
//
// User context pulled from storage (localStorage now,
// Supabase later — swap inside getProgress only).
// ─────────────────────────────────────────────

type PageState = "session" | "summary"

export default function SessionPage() {
  const progress = getProgress()
  const profile = getProfile()
  const persona = profile
    ? (PERSONAS.find((p) => p.id === profile.personaId) ?? PERSONAS[0])
    : PERSONAS[0]
  const userName = profile?.name ?? "there"
  const goal = profile?.goal ?? "general comfort"

  const [pageState, setPageState] = useState<PageState>("session")
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)

  const handleSessionComplete = (result: SessionResult) => {
    setSessionResult(result)
    setPageState("summary")
  }

  const handleRestart = () => {
    setSessionResult(null)
    setPageState("session")
  }

  if (pageState === "summary" && sessionResult) {
    return (
      <SessionSummary
        result={sessionResult}
        phase={progress.currentPhase}
        personaName={persona.name}
        userName={userName}
        goal={goal}
        totalSessions={progress.totalSessions}
        onRestart={handleRestart}
      />
    )
  }

  return (
    <SessionAnalyzer
      phase={progress.currentPhase}
      personaName={persona.name}
      userName={userName}
      goal={goal}
      weakAreas={progress.weakAreas}
      completedTopics={progress.completedTopics}
      totalSessions={progress.totalSessions}
      onSessionComplete={handleSessionComplete}
    />
  )
}

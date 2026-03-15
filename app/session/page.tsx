"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import SessionAnalyzer, {
  type SessionResult,
} from "@/components/session/SessionAnalyzer"
import SessionSummary from "@/components/session/SessionSummary"
import { getProgress } from "@/lib/storage/session"
import { getProfile } from "@/lib/storage/user"
import { PERSONAS } from "@/types/user"

type PageState = "session" | "summary"

export default function SessionPage() {
  const router = useRouter()
  const progress = getProgress()
  const profile = getProfile()

  const [pageState, setPageState] = useState<PageState>("session")
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)

  // Guard: no profile → needs onboarding first
  if (!profile) {
    router.replace("/onboarding")
    return null
  }

  const persona = PERSONAS.find((p) => p.id === profile.personaId) ?? PERSONAS[0]
  const userName = profile.name
  const goal = profile.goal

  const handleSessionComplete = (result: SessionResult) => {
    setSessionResult(result)
    setPageState("summary")
  }

  const handleRestart = () => {
    setSessionResult(null)
    setPageState("session")
  }

  const handleBack = () => router.push("/home")

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
        onBack={handleBack}
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
      onBack={handleBack}
    />
  )
}

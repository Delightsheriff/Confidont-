/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import SessionAnalyzer, {
  type SessionResult,
} from "@/components/session/SessionAnalyzer"
import SessionSummary from "@/components/session/SessionSummary"
import { getProgress } from "@/lib/storage/session"
import { getProfile } from "@/lib/storage/user"
import { PERSONAS } from "@/types/user"
import type { UserProgress } from "@/lib/storage/session"
import type { UserProfile } from "@/types/user"

// Force dynamic rendering — this page reads localStorage and must never SSR
export const dynamic = "force-dynamic"

type PageState = "checking" | "session" | "summary"

export default function SessionPage() {
  const router = useRouter()

  const [pageState, setPageState] = useState<PageState>("checking")
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)

  // Guard runs client-side only — localStorage is safe here
  useEffect(() => {
    const p = getProfile()
    if (!p) {
      router.replace("/onboarding")
      return
    }
    setProfile(p)
    setProgress(getProgress())
    setPageState("session")
  }, [router])

  if (pageState === "checking" || !profile || !progress) {
    // Minimal loading — avoids flash of wrong content
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const persona =
    PERSONAS.find((p) => p.id === profile.personaId) ?? PERSONAS[0]

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
        userName={profile.name}
        goal={profile.goal}
        totalSessions={progress.totalSessions}
        onRestart={handleRestart}
        onBack={handleBack}
      />
    )
  }

  return (
    <SessionAnalyzer
      phase={progress.currentPhase}
      persona={persona}
      userName={profile.name}
      goal={profile.goal}
      weakAreas={progress.weakAreas}
      completedTopics={progress.completedTopics}
      totalSessions={progress.totalSessions}
      onSessionComplete={handleSessionComplete}
      onBack={handleBack}
    />
  )
}

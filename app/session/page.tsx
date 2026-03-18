/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import SessionAnalyzer, {
  type SessionResult,
} from "@/components/session/SessionAnalyzer"
import { Spinner } from "@/components/ui/spinner"
import SessionSummary from "@/components/session/SessionSummary"
import { getProgress, fetchProgressFromSupabase } from "@/lib/storage/session"
import { getProfile, getProfileFromSupabase } from "@/lib/storage/user"
import { getDailyStatus } from "@/lib/logic/dailyLimit"
import { useAuth } from "@/hooks/useAuth"
import { PERSONAS } from "@/types/user"
import type { UserProgress } from "@/lib/storage/session"
import type { UserProfile } from "@/types/user"
import { BETA_MODE } from "@/configs/tiers"

// Force dynamic rendering — this page reads localStorage and must never SSR
export const dynamic = "force-dynamic"

const IS_PREMIUM = BETA_MODE

type PageState = "checking" | "session" | "summary"

export default function SessionPage() {
  const router = useRouter()
  const { user, isInitialized } = useAuth()

  const [pageState, setPageState] = useState<PageState>("checking")
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)

  useEffect(() => {
    if (!isInitialized) return

    const init = async () => {
      let resolvedProfile: UserProfile | null
      let resolvedProgress: UserProgress

      if (user) {
        // Auth user — source of truth is Supabase
        resolvedProfile = await getProfileFromSupabase()
        if (!resolvedProfile) {
          router.replace("/")
          return
        }
        resolvedProgress = await fetchProgressFromSupabase()
      } else {
        // Guest — source of truth is localStorage
        resolvedProfile = getProfile()
        if (!resolvedProfile) {
          router.replace("/")
          return
        }
        resolvedProgress = getProgress()
      }

      // Block if free cap is reached — must not bypass via direct URL
      const daily = getDailyStatus(resolvedProgress, resolvedProfile, IS_PREMIUM)
      if (daily.isFreeCapReached) {
        router.replace("/home")
        return
      }

      setProfile(resolvedProfile)
      setProgress(resolvedProgress)
      setPageState("session")
    }

    init()
  }, [user, isInitialized, router])

  if (pageState === "checking" || !profile || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-5" />
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

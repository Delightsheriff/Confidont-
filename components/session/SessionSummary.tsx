"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import AuthModal from "@/components/auth/AuthModal"
import { generateFeedback } from "@/lib/ai/feedback"
import { saveSession } from "@/lib/storage/session"
import {
  getGuestSessionCount,
  incrementGuestSessionCount,
} from "@/lib/storage/guestSessions"
import type { SessionResult } from "@/components/session/SessionAnalyzer"

interface SessionSummaryProps {
  result: SessionResult
  phase: number
  personaName: string
  userName: string
  goal: string
  totalSessions: number
  onRestart: () => void
  onBack: () => void
}

type FeedbackState = "loading" | "ready" | "saved"

export default function SessionSummary({
  result,
  phase,
  personaName,
  userName,
  goal,
  totalSessions,
  onRestart,
  onBack,
}: SessionSummaryProps) {
  const { user } = useAuth()

  const [feedbackState, setFeedbackState] = useState<FeedbackState>("loading")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [guestCount, setGuestCount] = useState(0)
  const [feedback, setFeedback] = useState<{
    message: string
    highlight: string
    focusNext: string
    pointsEarned: number
  } | null>(null)

  useEffect(() => {
    setGuestCount(getGuestSessionCount())
  }, [])

  // Load feedback on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const fb = await generateFeedback({
        personaName,
        userName,
        goal,
        phase,
        eyeContactPercent: result.score.eyeContactPercent,
        composurePercent: result.score.composurePercent,
        fillerWordCount: result.fillerWordCount,
        durationSeconds: result.durationSeconds,
        totalSessions,
      })
      if (!cancelled) {
        setFeedback(fb)
        setFeedbackState("ready")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!feedback) return

    await saveSession({
      id: `session_${Date.now()}`,
      date: new Date().toISOString(),
      phase,
      topics: result.topics,
      score: { ...result.score, fillerWordCount: result.fillerWordCount },
      feedback,
      thumbnailDataUrl: null,
    })

    setFeedbackState("saved")

    // Guest — increment and prompt auth
    if (!user) {
      const count = incrementGuestSessionCount()
      setGuestCount(count)
      if (count >= 1) {
        setTimeout(() => setShowAuthModal(true), 600)
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-foreground">
      {/* Header with back button */}
      <div className="relative flex w-full max-w-2xl items-center justify-center">
        <button
          onClick={onBack}
          className="absolute left-0 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← home
        </button>
        <div className="flex flex-col gap-1 text-center">
          <h1 className="font-mono text-2xl font-bold text-primary">
            Confidont
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Session complete
          </p>
        </div>
      </div>

      {/* Feedback card */}
      <div className="w-full max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6">
        {feedbackState === "loading" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-mono text-sm text-muted-foreground">
              {personaName} is putting together your feedback...
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {personaName}
              </p>
              <p className="font-mono text-base leading-relaxed text-foreground">
                {feedback?.message}
              </p>
            </div>

            <div className="h-px bg-border" />

            <div className="flex gap-3">
              <span className="mt-0.5 text-primary">↑</span>
              <div>
                <p className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  What went well
                </p>
                <p className="font-mono text-sm text-foreground">
                  {feedback?.highlight}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="mt-0.5 text-muted-foreground">→</span>
              <div>
                <p className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  Focus next time
                </p>
                <p className="font-mono text-sm text-foreground">
                  {feedback?.focusNext}
                </p>
              </div>
            </div>

            <div className="h-px bg-border" />

            {(feedback?.pointsEarned ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">
                  Points earned
                </p>
                <p className="font-mono text-lg font-bold text-primary">
                  +{feedback?.pointsEarned}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Score grid */}
      {feedbackState !== "loading" && (
        <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
          <ScoreCard
            label="Eye Contact"
            value={qualitativePresence(result.score.eyeContactPercent)}
            status={
              result.score.eyeContactPercent >= 65
                ? "good"
                : result.score.eyeContactPercent >= 40
                  ? "neutral"
                  : "bad"
            }
          />
          <ScoreCard
            label="Composure"
            value={qualitativePresence(result.score.composurePercent)}
            status={
              result.score.composurePercent >= 65
                ? "good"
                : result.score.composurePercent >= 40
                  ? "neutral"
                  : "bad"
            }
          />
          <ScoreCard
            label="Filler Words"
            value={qualitativeFillers(result.fillerWordCount)}
            status={
              result.fillerWordCount === 0
                ? "good"
                : result.fillerWordCount < 5
                  ? "neutral"
                  : "bad"
            }
          />
          <ScoreCard
            label="Duration"
            value={formatDuration(result.durationSeconds)}
            status="neutral"
          />
          <ScoreCard
            label="Topics"
            value={`${result.topics.length} covered`}
            status="good"
          />
          <ScoreCard
            label="Session"
            value={`#${totalSessions + 1}`}
            status="neutral"
          />
        </div>
      )}

      {/* Controls */}
      {feedbackState !== "loading" && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          {feedbackState === "ready" && (
            <button
              onClick={handleSave}
              className="w-full rounded-full border border-primary px-8 py-3 font-mono text-sm font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
            >
              Save Progress
            </button>
          )}

          {feedbackState === "saved" && (
            <div className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-8 py-3 font-mono text-sm text-muted-foreground">
              <span className="text-primary">✓</span> Saved
              {!user && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="ml-2 font-bold text-primary transition-opacity hover:opacity-70"
                >
                  — sync it →
                </button>
              )}
            </div>
          )}

          <button
            onClick={onRestart}
            className="w-full rounded-full bg-primary px-8 py-3 font-mono text-sm font-bold text-primary-foreground transition-all duration-200 hover:opacity-90"
          >
            Start Again
          </button>

          <button
            onClick={onBack}
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← back to home
          </button>
        </div>
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          context="save"
          guestSessionCount={guestCount}
          onDismiss={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function qualitativePresence(percent: number): string {
  if (percent >= 80) return "Excellent"
  if (percent >= 65) return "Strong"
  if (percent >= 45) return "Developing"
  return "Needs work"
}

function qualitativeFillers(count: number): string {
  if (count === 0) return "Clean"
  if (count <= 2) return "Minimal"
  if (count <= 5) return "A few"
  return "Frequent"
}

function ScoreCard({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: "good" | "bad" | "neutral"
}) {
  return (
    <div className="space-y-1 rounded-xl border border-border bg-card p-3.5">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={`font-mono text-lg font-bold ${status === "good" ? "text-primary" : status === "bad" ? "text-destructive" : "text-muted-foreground"}`}
      >
        {value}
      </p>
    </div>
  )
}

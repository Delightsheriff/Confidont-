"use client"

import { useEffect, useState } from "react"
import { generateFeedback } from "@/lib/ai/feedback"
import { saveSession } from "@/lib/storage/session"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { SessionResult } from "@/components/session/SessionAnalyzer"

// ─────────────────────────────────────────────
// SessionSummary
//
// Post-session screen.
// Appears after all topics are completed.
//
// Flow:
// 1. generateFeedback called on mount
// 2. Feedback streams in (stub: resolves after 600ms)
// 3. Save Progress persists to storage
// 4. Start Again resets back to SessionAnalyzer
// ─────────────────────────────────────────────

interface SessionSummaryProps {
  result: SessionResult
  phase: number
  personaName: string
  userName: string
  goal: string
  totalSessions: number
  onRestart: () => void
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
}: SessionSummaryProps) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("loading")
  const [feedback, setFeedback] = useState<{
    message: string
    highlight: string
    focusNext: string
    pointsEarned: number
  } | null>(null)

  // ── Load feedback on mount ───────────────────
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

  // ── Save progress ────────────────────────────
  const handleSave = () => {
    if (!feedback) return

    saveSession({
      id: `session_${Date.now()}`,
      date: new Date().toISOString(),
      phase,
      topics: result.topics,
      score: {
        ...result.score,
        fillerWordCount: result.fillerWordCount,
      },
      feedback,
      thumbnailDataUrl: null, // future: capture frame at session end
    })

    setFeedbackState("saved")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-mono text-2xl font-bold text-primary">Confidont</h1>
        <p className="font-mono text-xs text-muted-foreground">
          Session complete
        </p>
      </div>

      {/* ── Feedback card ──────────────────────── */}
      <div className="flex w-full max-w-2xl flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        {feedbackState === "loading" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-mono text-sm text-muted-foreground">
              {personaName} is putting together your feedback...
            </p>
          </div>
        ) : (
          <>
            {/* Persona message */}
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {personaName}
              </p>
              <p className="font-mono text-base leading-relaxed text-foreground">
                {feedback?.message}
              </p>
            </div>

            <Separator />

            {/* Highlight */}
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

            {/* Focus next */}
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

            <Separator />

            {/* Points earned */}
            {feedback?.pointsEarned != null && feedback.pointsEarned > 0 && (
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">
                  Points earned
                </p>
                <p className="font-mono text-lg font-bold text-primary">
                  +{feedback.pointsEarned}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Score grid ─────────────────────────── */}
      {feedbackState !== "loading" && (
        <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
          <ScoreCard
            label="Eye Contact"
            value={`${result.score.eyeContactPercent}%`}
            status={
              result.score.eyeContactPercent >= 70
                ? "good"
                : result.score.eyeContactPercent >= 40
                  ? "neutral"
                  : "bad"
            }
          />
          <ScoreCard
            label="Composure"
            value={`${result.score.composurePercent}%`}
            status={
              result.score.composurePercent >= 70
                ? "good"
                : result.score.composurePercent >= 40
                  ? "neutral"
                  : "bad"
            }
          />
          <ScoreCard
            label="Filler Words"
            value={String(result.fillerWordCount)}
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
            value={`${result.topics.length} of ${result.topics.length}`}
            status="good"
          />
          <ScoreCard
            label="Session"
            value={`#${totalSessions + 1}`}
            status="neutral"
          />
        </div>
      )}

      {/* ── Controls ───────────────────────────── */}
      {feedbackState !== "loading" && (
        <div className="flex items-center gap-3">
          {/* Save Progress */}
          {feedbackState === "ready" && (
            <Button
              variant="outline"
              onClick={handleSave}
              size="lg"
              className="rounded-full px-8 font-mono"
            >
              Save Progress
            </Button>
          )}

          {feedbackState === "saved" && (
            <div className="flex items-center gap-2 rounded-full border border-border px-8 py-3 font-mono text-sm text-muted-foreground">
              <span className="text-primary">✓</span> Saved
            </div>
          )}

          {/* Start Again */}
          <Button
            onClick={onRestart}
            size="lg"
            className="rounded-full px-8 font-mono"
          >
            Start Again
          </Button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
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
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3.5">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-lg font-bold",
          status === "good" && "text-primary",
          status === "bad" && "text-destructive",
          status === "neutral" && "text-muted-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}

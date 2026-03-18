"use client"

// ─────────────────────────────────────────────
// ProgressArc
//
// Shows trend chart + key stats on the home page.
// Only renders when the user has ≥ 2 completed sessions.
// ─────────────────────────────────────────────

import type { UserProgress } from "@/lib/storage/session"
import type { StoredSession } from "@/lib/storage/session"

export default function ProgressArc({ progress }: { progress: UserProgress }) {
  if (progress.totalSessions < 1) return null

  // Chronological order (oldest → newest), last 10 sessions
  const sessions = [...progress.sessions].reverse().slice(-10)
  const allChronological = [...progress.sessions].reverse()

  const eyeData = sessions.map((s) => s.score.eyeContactPercent)
  const compData = sessions.map((s) => s.score.composurePercent)

  const best = computeBestSession(sessions)
  const avgScore = avgOf(sessions.flatMap((s) => [s.score.eyeContactPercent, s.score.composurePercent]))
  const trend = computeTrend(sessions)
  const narrative = computeNarrative(allChronological)
  const weekDays = getDaysThisWeek(progress.sessions)

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Your arc
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {progress.totalSessions} session{progress.totalSessions !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Sparkline */}
      <TrendChart eyeData={eyeData} compData={compData} />

      {/* Legend */}
      <div className="flex items-center gap-4">
        <LegendItem primary label="Eye contact" />
        <LegendItem label="Composure" />
      </div>

      {/* Narrative — the story your data tells */}
      {narrative && (
        <p className="font-mono text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
          {narrative}
        </p>
      )}

      {/* Stats — no streak counter (streaks create anxiety, not confidence) */}
      <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
        <MiniStat label="Best" value={qualLabel(best)} accent={best >= 65} />
        <MiniStat label="Avg" value={qualLabel(avgScore)} />
        <MiniStat
          label="Trend"
          value={trend.label}
          accent={trend.up}
          dim={trend.down}
        />
      </div>

      {/* Week dots — which days this week had sessions. Calendar view, not a streak. */}
      <WeekDots days={weekDays} />
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────

function TrendChart({
  eyeData,
  compData,
}: {
  eyeData: number[]
  compData: number[]
}) {
  const W = 280
  const H = 56
  const PAD = 6

  const toPath = (data: number[]) => {
    if (data.length === 0) return ""
    if (data.length === 1) {
      // Single session — render a short stub line so the chart isn't empty
      const x = W / 2
      const y = H - PAD - (data[0] / 100) * (H - PAD * 2)
      return `M ${(x - 8).toFixed(1)},${y.toFixed(1)} L ${(x + 8).toFixed(1)},${y.toFixed(1)}`
    }
    return data
      .map((v, i) => {
        const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
        const y = H - PAD - (v / 100) * (H - PAD * 2)
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(" ")
  }

  const lastX = eyeData.length > 1 ? W - PAD : W / 2
  const lastEyeY = H - PAD - (eyeData[eyeData.length - 1] / 100) * (H - PAD * 2)
  const lastCompY = H - PAD - (compData[compData.length - 1] / 100) * (H - PAD * 2)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      style={{ height: H }}
      aria-hidden
    >
      {/* Subtle gridlines at 25 / 50 / 75 % */}
      {[25, 50, 75].map((pct) => {
        const y = H - PAD - (pct / 100) * (H - PAD * 2)
        return (
          <line
            key={pct}
            x1={PAD}
            x2={W - PAD}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border/40"
          />
        )
      })}

      {/* Composure line (muted) */}
      <path
        d={toPath(compData)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-muted-foreground/35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Eye contact line (primary) */}
      <path
        d={toPath(eyeData)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="text-primary/70"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Latest session dots */}
      {eyeData.length >= 2 && (
        <>
          <circle cx={lastX} cy={lastEyeY} r="2.5" className="fill-primary" />
          <circle cx={lastX} cy={lastCompY} r="2.5" className="fill-muted-foreground/50" />
        </>
      )}
    </svg>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function LegendItem({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
      <span
        className={`h-px w-5 rounded-full ${primary ? "bg-primary/70" : "bg-muted-foreground/35"}`}
      />
      {label}
    </span>
  )
}

function MiniStat({
  label,
  value,
  accent,
  dim,
}: {
  label: string
  value: string
  accent?: boolean
  dim?: boolean
}) {
  return (
    <div className="space-y-0.5 text-center">
      <p
        className={`font-mono text-sm font-bold ${
          accent
            ? "text-primary"
            : dim
              ? "text-destructive/60"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  )
}

// ── Week dots ─────────────────────────────────────────────────────────

function WeekDots({ days }: { days: boolean[] }) {
  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]
  const sessionCount = days.filter(Boolean).length
  const todayIndex = (new Date().getDay() + 6) % 7 // Mon=0 … Sun=6

  return (
    <div className="flex items-center justify-between border-t border-border/40 pt-3">
      <div className="flex items-center gap-1.5">
        {days.map((active, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={`h-2 w-2 rounded-full transition-colors ${
                active
                  ? "bg-primary"
                  : i === todayIndex
                    ? "bg-primary/25 ring-1 ring-primary/40"
                    : "bg-border/50"
              }`}
            />
            <span className="font-mono text-[8px] text-muted-foreground/40">
              {DAY_LABELS[i]}
            </span>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-muted-foreground">
        {sessionCount === 0
          ? "none this week yet"
          : sessionCount === 1
            ? "1 this week"
            : `${sessionCount} this week`}
      </p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

function qualLabel(score: number): string {
  if (score >= 80) return "excellent"
  if (score >= 65) return "strong"
  if (score >= 45) return "developing"
  return "needs work"
}

function avgOf(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function computeBestSession(sessions: StoredSession[]): number {
  if (sessions.length === 0) return 0
  return Math.max(
    ...sessions.map((s) => (s.score.eyeContactPercent + s.score.composurePercent) / 2)
  )
}

// Builds a one-sentence narrative from the user's arc data.
// Compares first session to recent to narrate real change.
function computeNarrative(allSessions: StoredSession[]): string | null {
  if (allSessions.length < 2) return null

  const first = allSessions[0]
  const recent = allSessions.slice(-3)
  const recentEye = Math.round(avgOf(recent.map((s) => s.score.eyeContactPercent)))
  const recentComp = Math.round(avgOf(recent.map((s) => s.score.composurePercent)))
  const eyeDiff = recentEye - first.score.eyeContactPercent
  const compDiff = recentComp - first.score.composurePercent

  const eyeUp = eyeDiff >= 8
  const compUp = compDiff >= 8
  const eyeDown = eyeDiff <= -8
  const compDown = compDiff <= -8

  if (eyeUp && compUp)
    return `Eye contact up ${eyeDiff} points, composure up ${compDiff} since session 1. Both moving.`
  if (eyeUp)
    return `Eye contact up ${eyeDiff} points since session 1. Composure holding at ${qualLabel(recentComp)}.`
  if (compUp)
    return `Composure up ${compDiff} points since session 1. Eye contact sitting at ${qualLabel(recentEye)}.`
  if (eyeDown && compDown)
    return `Scores dipped recently — happens. Come back and reset.`
  if (allSessions.length >= 5) {
    const avgEye = Math.round(avgOf(allSessions.map((s) => s.score.eyeContactPercent)))
    return `${allSessions.length} sessions in. Eye contact averaging ${qualLabel(avgEye)} across them all.`
  }
  return `${allSessions.length} sessions logged. The arc is forming.`
}

// Returns a Mon–Sun boolean array for the current week.
function getDaysThisWeek(sessions: StoredSession[]): boolean[] {
  const now = new Date()
  const dayOfWeek = (now.getDay() + 6) % 7 // Mon=0 … Sun=6
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek)
  monday.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return sessions.some((s) => {
      const d = new Date(s.date)
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      )
    })
  })
}

function computeTrend(sessions: StoredSession[]): {
  label: string
  up: boolean
  down: boolean
} {
  if (sessions.length < 3) return { label: "just started", up: false, down: false }

  const half = Math.ceil(sessions.length / 2)
  const first = sessions.slice(0, half)
  const recent = sessions.slice(half)

  const firstAvg = avgOf(
    first.flatMap((s) => [s.score.eyeContactPercent, s.score.composurePercent])
  )
  const recentAvg = avgOf(
    recent.flatMap((s) => [s.score.eyeContactPercent, s.score.composurePercent])
  )
  const diff = recentAvg - firstAvg

  if (diff > 15) return { label: "↑ improving", up: true, down: false }
  if (diff > 3) return { label: "↑ steady up", up: true, down: false }
  if (diff > -5) return { label: "→ holding", up: false, down: false }
  return { label: "↓ refocus", up: false, down: true }
}

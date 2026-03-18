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
  if (progress.totalSessions < 2) return null

  // Chronological order (oldest → newest), last 10 sessions
  const sessions = [...progress.sessions].reverse().slice(-10)

  const eyeData = sessions.map((s) => s.score.eyeContactPercent)
  const compData = sessions.map((s) => s.score.composurePercent)

  const streak = computeStreak(progress.sessions)
  const avgScore = avgOf(sessions.flatMap((s) => [s.score.eyeContactPercent, s.score.composurePercent]))
  const trend = computeTrend(sessions)

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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
        <MiniStat
          label="Streak"
          value={streak === 0 ? "—" : `${streak}d`}
          accent={streak >= 3}
        />
        <MiniStat label="Avg" value={qualLabel(avgScore)} />
        <MiniStat
          label="Trend"
          value={trend.label}
          accent={trend.up}
          dim={trend.down}
        />
      </div>
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
    if (data.length < 2) return ""
    return data
      .map((v, i) => {
        const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
        const y = H - PAD - (v / 100) * (H - PAD * 2)
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(" ")
  }

  const lastX =
    eyeData.length > 1
      ? PAD + ((eyeData.length - 1) / (eyeData.length - 1)) * (W - PAD * 2)
      : PAD
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

function computeStreak(sessions: StoredSession[]): number {
  if (sessions.length === 0) return 0
  const uniqueDates = [
    ...new Set(sessions.map((s) => s.date.split("T")[0])),
  ].sort()
  if (uniqueDates.length === 0) return 0

  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  const lastDate = uniqueDates[uniqueDates.length - 1]

  // Streak must include today or yesterday to be considered active
  if (lastDate !== today && lastDate !== yesterday) return 0

  let streak = 0
  let checkDate = new Date(lastDate)

  for (let i = uniqueDates.length - 1; i >= 0; i--) {
    const expected = checkDate.toISOString().split("T")[0]
    if (uniqueDates[i] === expected) {
      streak++
      checkDate = new Date(checkDate.getTime() - 86400000)
    } else {
      break
    }
  }
  return streak
}

function computeTrend(sessions: StoredSession[]): {
  label: string
  up: boolean
  down: boolean
} {
  if (sessions.length < 3) return { label: "early", up: false, down: false }

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

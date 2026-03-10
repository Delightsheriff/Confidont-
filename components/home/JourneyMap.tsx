"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { getProfile } from "@/lib/storage/user"
import { getProgress } from "@/lib/storage/session"
import { PERSONAS } from "@/types/user"
import type { UserProgress } from "@/lib/storage/session"
import type { UserProfile } from "@/types/user"
import { FREE_SESSION_LIMIT, TOTAL_VISIBLE_SESSIONS } from "@/configs/tiers"

// ─────────────────────────────────────────────
// JourneyMap
//
// Home page. Shows the user's full session journey —
// completed, available, and locked sessions.
//
// Layout:
// - Greeting + persona badge top
// - Stats row (total sessions, points, streak)
// - Phase label
// - Session cards in a vertical path
//   · Completed — shows score
//   · Available — CTA to start
//   · Locked — padlock, upgrade prompt
// ─────────────────────────────────────────────

// Phase metadata
const PHASES = [
  {
    id: 1,
    name: "Welcome Zone",
    description: "No pressure. Just you and the camera getting acquainted.",
    sessions: [1, 2, 3],
  },
  {
    id: 2,
    name: "Awareness Zone",
    description: "Your first scores appear. You're building the habit.",
    sessions: [4, 5, 6, 7, 8],
  },
  {
    id: 3,
    name: "Growth Zone",
    description: "Real coaching begins. Filler words, pace, presence.",
    sessions: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    id: 4,
    name: "Challenge Zone",
    description: "No ceiling. The work never ends — it just gets better.",
    sessions: [], // endless
  },
]

type SessionCardState = "completed" | "available" | "locked"

interface SessionCardData {
  sessionNumber: number
  state: SessionCardState
  eyeContactPercent?: number
  composurePercent?: number
  fillerWordCount?: number
  pointsEarned?: number
  date?: string
}

export default function JourneyMap() {
  const router = useRouter()
  const profile = getProfile()
  const progress = getProgress()

  if (!profile) {
    router.replace("/onboarding")
    return null
  }

  const persona =
    PERSONAS.find((p) => p.id === profile.personaId) ?? PERSONAS[0]
  const cards = buildSessionCards(progress)
  const phase = PHASES.find((p) => p.id === progress.currentPhase) ?? PHASES[0]

  const nextAvailable = cards.find((c) => c.state === "available")

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ──────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <h1 className="font-mono text-lg font-bold text-primary">Confidont</h1>

        {/* Persona badge */}
        <div className="flex items-center gap-2">
          <div
            className={`h-7 w-7 rounded-full ${persona.colorAccent} flex items-center justify-center font-mono text-xs font-bold text-white`}
          >
            {persona.name[0]}
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {persona.name}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-8 px-6 py-8">
        {/* ── Greeting ──────────────────────────── */}
        <div className="space-y-1">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {getGreeting()}
          </p>
          <h2 className="font-mono text-3xl font-bold text-foreground">
            {profile.name}.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {getMotivationalLine(progress, persona.name)}
          </p>
        </div>

        {/* ── Stats row ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatPill label="Sessions" value={String(progress.totalSessions)} />
          <StatPill label="Points" value={String(progress.totalPoints)} />
          <StatPill
            label="Streak"
            value={getStreakLabel(progress.lastSessionDate)}
          />
        </div>

        {/* ── Phase label ───────────────────────── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="px-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Phase {progress.currentPhase} — {phase.name}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {phase.description}
          </p>
        </div>

        {/* ── Session cards path ─────────────────── */}
        <div className="relative space-y-3">
          {/* Vertical connector line */}
          <div className="absolute top-8 bottom-8 left-6.75 z-0 w-px bg-border" />

          {cards.map((card, i) => (
            <SessionCard
              key={card.sessionNumber}
              card={card}
              isNext={card === nextAvailable}
              onStart={() => router.push("/session")}
              index={i}
            />
          ))}

          {/* Endless indicator after last card */}
          <div className="flex items-center gap-3 pt-2 pl-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border">
              <span className="text-xs text-muted-foreground/40">∞</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground/40">
              The journey doesn&apos;t end here.
            </p>
          </div>
        </div>

        {/* ── Upgrade nudge — shown when user hits lock ── */}
        {progress.totalSessions >= FREE_SESSION_LIMIT && (
          <UpgradeCard personaName={persona.name} userName={profile.name} />
        )}

        {/* Bottom padding for breathing room */}
        <div className="h-8" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Session Card
// ─────────────────────────────────────────────

function SessionCard({
  card,
  isNext,
  onStart,
  index,
}: {
  card: SessionCardData
  isNext: boolean
  onStart: () => void
  index: number
}) {
  const phaseForSession = PHASES.find((p) =>
    p.sessions.includes(card.sessionNumber)
  )
  const isNewPhase =
    index > 0 && phaseForSession?.sessions[0] === card.sessionNumber

  return (
    <div className="flex items-start gap-4">
      {/* Node */}
      <div className="z-10 shrink-0">
        {card.state === "completed" ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : card.state === "available" ? (
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
              isNext
                ? "animate-pulse border-primary bg-primary/10"
                : "border-border bg-background"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${isNext ? "bg-primary" : "bg-border"}`}
            />
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border/50 bg-background">
            <LockIcon />
          </div>
        )}
      </div>

      {/* Card body */}
      <div
        className={`mb-1 flex-1 rounded-xl border transition-all duration-200 ${
          card.state === "completed"
            ? "border-primary/20 bg-primary/5"
            : card.state === "available"
              ? isNext
                ? "border-primary/40 bg-card shadow-sm shadow-primary/10"
                : "border-border bg-card"
              : "border-border/40 bg-card/40"
        }`}
      >
        {/* Phase divider inside card path */}
        {isNewPhase && phaseForSession && (
          <div className="px-4 pt-3 pb-0">
            <p className="font-mono text-[9px] tracking-widest text-primary/60 uppercase">
              {phaseForSession.name} begins
            </p>
          </div>
        )}

        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p
                className={`font-mono text-xs tracking-widest uppercase ${
                  card.state === "locked"
                    ? "text-muted-foreground/40"
                    : "text-muted-foreground"
                }`}
              >
                Session {card.sessionNumber}
              </p>

              {card.state === "completed" && (
                <div className="flex flex-wrap items-center gap-3">
                  <ScoreBadge
                    label="Eye"
                    value={`${card.eyeContactPercent}%`}
                  />
                  <ScoreBadge
                    label="Composure"
                    value={`${card.composurePercent}%`}
                  />
                  <ScoreBadge
                    label="Fillers"
                    value={String(card.fillerWordCount)}
                  />
                  {card.pointsEarned != null && card.pointsEarned > 0 && (
                    <span className="font-mono text-[10px] text-primary">
                      +{card.pointsEarned}pts
                    </span>
                  )}
                </div>
              )}

              {card.state === "available" && isNext && (
                <p className="font-mono text-xs text-foreground">
                  Ready to start
                </p>
              )}

              {card.state === "available" && !isNext && (
                <p className="font-mono text-xs text-muted-foreground">
                  Available
                </p>
              )}

              {card.state === "locked" && (
                <p className="font-mono text-xs text-muted-foreground/40">
                  Premium
                </p>
              )}
            </div>

            {/* CTA */}
            {card.state === "available" && (
              <button
                onClick={onStart}
                className={`shrink-0 rounded-full px-4 py-1.5 font-mono text-xs font-bold transition-all duration-200 ${
                  isNext
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {isNext ? "Start →" : "Start"}
              </button>
            )}

            {card.state === "locked" && (
              <div className="shrink-0 opacity-30">
                <LockIcon />
              </div>
            )}

            {card.state === "completed" && card.date && (
              <p className="shrink-0 font-mono text-[10px] text-muted-foreground/40">
                {formatDate(card.date)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Upgrade card
// ─────────────────────────────────────────────

function UpgradeCard({
  personaName,
  userName,
}: {
  personaName: string
  userName: string
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="space-y-1">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          Keep going, {userName}
        </p>
        <p className="font-mono text-sm leading-relaxed text-foreground">
          {personaName} has more to show you. Unlock the Growth Zone to keep
          building.
        </p>
      </div>
      <button className="w-full rounded-full bg-primary py-2.5 font-mono text-sm font-bold text-primary-foreground transition-all hover:opacity-90">
        Unlock Premium
      </button>
      <p className="text-center font-mono text-[10px] text-muted-foreground">
        Pricing coming soon — beta users get early access.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 rounded-xl border border-border bg-card px-3 py-3 text-center">
      <p className="font-mono text-lg font-bold text-foreground">{value}</p>
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  )
}

function ScoreBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="font-mono text-[10px] text-muted-foreground">
      <span className="text-foreground">{value}</span> {label}
    </span>
  )
}

function LockIcon() {
  return (
    <svg
      width="10"
      height="12"
      viewBox="0 0 10 12"
      fill="none"
      className="text-muted-foreground/40"
    >
      <rect
        x="1"
        y="5"
        width="8"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M3 5V3.5a2 2 0 014 0V5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────
// Data builders
// ─────────────────────────────────────────────

function buildSessionCards(progress: UserProgress): SessionCardData[] {
  const cards: SessionCardData[] = []

  for (let i = 1; i <= TOTAL_VISIBLE_SESSIONS; i++) {
    const stored = progress.sessions.find(
      (_, idx) => progress.sessions.length - idx === i
    )
    const completedCount = progress.totalSessions

    if (i <= completedCount) {
      // Completed — pull real scores
      const s = progress.sessions[progress.sessions.length - i]
      cards.push({
        sessionNumber: i,
        state: "completed",
        eyeContactPercent: s?.score.eyeContactPercent ?? 0,
        composurePercent: s?.score.composurePercent ?? 0,
        fillerWordCount: s?.score.fillerWordCount ?? 0,
        pointsEarned: s?.feedback?.pointsEarned ?? 0,
        date: s?.date,
      })
    } else if (i <= completedCount + 1 && i <= FREE_SESSION_LIMIT) {
      // Next available free session
      cards.push({ sessionNumber: i, state: "available" })
    } else if (i <= FREE_SESSION_LIMIT) {
      // Available free session (not next)
      cards.push({ sessionNumber: i, state: "available" })
    } else {
      // Locked
      cards.push({ sessionNumber: i, state: "locked" })
    }
  }

  return cards
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getMotivationalLine(
  progress: UserProgress,
  personaName: string
): string {
  if (progress.totalSessions === 0)
    return `${personaName} is ready when you are. Your first session is waiting below.`
  if (progress.totalSessions === 1)
    return `One session down. ${personaName} noticed some real strengths already.`
  if (progress.improvements.length > 0)
    return `Your ${progress.improvements[0]}. ${personaName} sees it.`
  return `${progress.totalSessions} sessions in. Keep the momentum going.`
}

function getStreakLabel(lastSessionDate: string | null): string {
  if (!lastSessionDate) return "—"
  const last = new Date(lastSessionDate)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - last.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "1 day"
  return `${diffDays}d ago`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

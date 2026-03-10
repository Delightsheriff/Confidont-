"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getProfile } from "@/lib/storage/user"
import { getProgress } from "@/lib/storage/session"
import { getDailyStatus } from "@/lib/logic/dailyLimit"
import { PERSONAS } from "@/types/user"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { UserProgress } from "@/lib/storage/session"
import type { DailyStatus } from "@/lib/logic/dailyLimit"
import { FREE_SESSION_LIMIT, TOTAL_VISIBLE_SESSIONS } from "@/configs/tiers"

// ─────────────────────────────────────────────
// JourneyMap
//
// Card states:
// completed          — done, shows scores
// available          — startable now
// available-at-limit — startable, but user hit daily preference
// free-cap-reached   — all free sessions used, must upgrade
// locked-progress    — previous not done, tap → toast
// locked-premium     — paid wall, tap → toast
//
// free-cap-reached shows "come back tomorrow" message on card
// AND renders the upgrade card below the path.
//
// available-at-limit tapping opens the soft nudge bottom sheet.
// User can always choose to keep going.
// ─────────────────────────────────────────────

const IS_PREMIUM = false

type SessionCardState =
  | "completed"
  | "available"
  | "available-at-limit"
  | "free-cap-reached"
  | "locked-progress"
  | "locked-premium"

interface SessionCardData {
  sessionNumber: number
  state: SessionCardState
  eyeContactPercent?: number
  composurePercent?: number
  fillerWordCount?: number
  pointsEarned?: number
  date?: string
}

const PHASES = [
  {
    id: 1,
    name: "Welcome Zone",
    description: "No pressure. Just you and the camera getting acquainted.",
    startsAt: 1,
  },
  {
    id: 2,
    name: "Awareness Zone",
    description: "Your first scores appear. You're building the habit.",
    startsAt: 4,
  },
  {
    id: 3,
    name: "Growth Zone",
    description: "Real coaching begins. Filler words, pace, presence.",
    startsAt: 9,
  },
  {
    id: 4,
    name: "Challenge Zone",
    description: "No ceiling. The work never ends — it just gets better.",
    startsAt: 21,
  },
]

export default function JourneyMap() {
  const router = useRouter()
  const profile = getProfile()
  const progress = getProgress()

  const [toast, setToast] = useState<string | null>(null)
  const [showDayNudge, setShowDayNudge] = useState(false)

  const fireToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  if (!profile) {
    router.replace("/onboarding")
    return null
  }

  const persona =
    PERSONAS.find((p) => p.id === profile.personaId) ?? PERSONAS[0]
  const daily = getDailyStatus(progress, profile, IS_PREMIUM)
  const cards = buildSessionCards(progress, daily, IS_PREMIUM)
  const currentPhase =
    PHASES.findLast(
      (p) => p.startsAt <= Math.max(progress.totalSessions + 1, 1)
    ) ?? PHASES[0]

  const handleCardTap = (card: SessionCardData) => {
    switch (card.state) {
      case "available":
        router.push("/session")
        break
      case "available-at-limit":
        setShowDayNudge(true)
        break
      case "locked-progress":
        fireToast(`Finish session ${card.sessionNumber - 1} first`)
        break
      case "locked-premium":
        fireToast("Unlock premium to access this session")
        break
      case "free-cap-reached":
        // tapping does nothing — upgrade card is below
        break
      default:
        break
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="font-mono text-lg font-bold text-primary">
            Confidont
          </h1>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full font-mono text-xs font-bold text-white",
                persona.colorAccent
              )}
            >
              {persona.name[0]}
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {persona.name}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-8">
        {/* Greeting */}
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {getGreeting()}
          </p>
          <h2 className="font-mono text-3xl font-bold text-foreground">
            {profile.name}.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {getMotivationalLine(progress, daily, persona.name)}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatPill label="Sessions" value={String(progress.totalSessions)} />
          <StatPill label="Points" value={String(progress.totalPoints)} />
          <StatPill
            label="Today"
            value={`${daily.sessionsUsedToday}/${daily.limitForToday}`}
          />
        </div>

        {/* Phase label */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="px-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Phase {currentPhase.id} — {currentPhase.name}
            </span>
            <Separator className="flex-1" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {currentPhase.description}
          </p>
        </div>

        {/* Session path */}
        <div className="relative z-0 flex flex-col gap-3">
          <div className="absolute top-8 bottom-8 left-6.75 z-0 w-px bg-border" />

          {cards.map((card, i) => {
            const isPhaseStart = PHASES.some(
              (p) => p.startsAt === card.sessionNumber && card.sessionNumber > 1
            )
            return (
              <SessionCard
                key={card.sessionNumber}
                card={card}
                isPhaseStart={isPhaseStart}
                nextUnlockDate={daily.nextUnlockDate}
                onTap={() => handleCardTap(card)}
                index={i}
              />
            )
          })}

          <div className="flex items-center gap-3 pt-2 pl-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border">
              <span className="text-xs text-muted-foreground/40">∞</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground/40">
              The journey doesn&apos;t end here.
            </p>
          </div>
        </div>

        {/* Upgrade card — only shown when free cap is reached */}
        {daily.isFreeCapReached && (
          <UpgradeCard personaName={persona.name} userName={profile.name} />
        )}

        <div className="h-8" />
      </div>

      {/* Daily limit nudge — soft, user chooses */}
      {showDayNudge && (
        <DayNudgeModal
          limitForToday={daily.limitForToday}
          personaName={persona.name}
          nextUnlockDate={daily.nextUnlockDate}
          onDismiss={() => setShowDayNudge(false)}
          onKeepGoing={() => {
            setShowDayNudge(false)
            router.push("/session")
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 animate-in rounded-full bg-foreground px-5 py-2.5 font-mono text-xs text-background shadow-lg duration-200 fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Session Card
// ─────────────────────────────────────────────

function SessionCard({
  card,
  isPhaseStart,
  nextUnlockDate,
  onTap,
}: {
  card: SessionCardData
  isPhaseStart: boolean
  nextUnlockDate: string
  onTap: () => void
  index: number
}) {
  const isClickable =
    card.state !== "completed" && card.state !== "free-cap-reached"

  return (
    <div className="flex items-start gap-4">
      {/* Node */}
      <div className="z-0 mt-4 shrink-0">
        <NodeIcon state={card.state} />
      </div>

      {/* Card */}
      <button
        onClick={isClickable ? onTap : undefined}
        disabled={!isClickable}
        className={cn(
          "mb-1 w-full flex-1 rounded-xl border text-left transition-all duration-200",
          cardStyles[card.state]
        )}
      >
        {isPhaseStart && (
          <div className="px-4 pt-3 pb-0">
            <p className="font-mono text-[9px] tracking-widest text-primary/60 uppercase">
              {PHASES.find((p) => p.startsAt === card.sessionNumber)?.name}{" "}
              begins
            </p>
          </div>
        )}

        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p
                className={cn(
                  "font-mono text-xs tracking-widest uppercase",
                  card.state === "locked-premium" ||
                    card.state === "locked-progress" ||
                    card.state === "free-cap-reached"
                    ? "text-muted-foreground/40"
                    : "text-muted-foreground"
                )}
              >
                Session {card.sessionNumber}
              </p>
              <CardBody card={card} nextUnlockDate={nextUnlockDate} />
            </div>
            <CardAction card={card} />
          </div>
        </div>
      </button>
    </div>
  )
}

function CardBody({
  card,
  nextUnlockDate,
}: {
  card: SessionCardData
  nextUnlockDate: string
}) {
  switch (card.state) {
    case "completed":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <ScoreBadge label="Eye" value={`${card.eyeContactPercent}%`} />
          <ScoreBadge label="Composure" value={`${card.composurePercent}%`} />
          <ScoreBadge label="Fillers" value={String(card.fillerWordCount)} />
          {(card.pointsEarned ?? 0) > 0 && (
            <span className="font-mono text-[10px] text-primary">
              +{card.pointsEarned}pts
            </span>
          )}
        </div>
      )
    case "available":
      return <p className="font-mono text-xs text-foreground">Ready to start</p>
    case "available-at-limit":
      return (
        <p className="font-mono text-xs text-muted-foreground">
          Done for today — or keep going?
        </p>
      )
    case "free-cap-reached":
      return (
        <p className="font-mono text-xs text-muted-foreground/50">
          See you {nextUnlockDate} 🌙
        </p>
      )
    case "locked-progress":
      return (
        <p className="font-mono text-xs text-muted-foreground/40">
          Complete previous session first
        </p>
      )
    case "locked-premium":
      return (
        <p className="font-mono text-xs text-muted-foreground/40">Premium</p>
      )
  }
}

function CardAction({ card }: { card: SessionCardData }) {
  switch (card.state) {
    case "available":
      return (
        <Badge className="shrink-0 rounded-full px-4 py-1.5 font-mono text-xs">
          Start →
        </Badge>
      )
    case "available-at-limit":
      return (
        <Badge
          variant="outline"
          className="shrink-0 rounded-full border-primary/50 px-4 py-1.5 font-mono text-xs text-primary"
        >
          Start →
        </Badge>
      )
    case "completed":
      return card.date ? (
        <p className="shrink-0 font-mono text-[10px] text-muted-foreground/40">
          {formatDate(card.date)}
        </p>
      ) : null
    case "locked-premium":
      return <LockIcon className="shrink-0 text-muted-foreground/30" />
    default:
      return null
  }
}

function NodeIcon({ state }: { state: SessionCardState }) {
  if (state === "completed") {
    return (
      <div className="flex size-7 items-center justify-center rounded-full bg-primary">
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
    )
  }
  if (state === "available") {
    return (
      <div className="flex size-7 animate-pulse items-center justify-center rounded-full border-2 border-primary bg-primary/10">
        <div className="size-2 rounded-full bg-primary" />
      </div>
    )
  }
  if (state === "available-at-limit") {
    return (
      <div className="flex size-7 items-center justify-center rounded-full border-2 border-primary/40 bg-background">
        <div className="size-2 rounded-full bg-primary/40" />
      </div>
    )
  }
  if (state === "free-cap-reached") {
    return (
      <div className="flex size-7 items-center justify-center rounded-full border border-border bg-background">
        <span className="text-[10px]">🌙</span>
      </div>
    )
  }
  return (
    <div className="flex size-7 items-center justify-center rounded-full border border-dashed border-border/50 bg-background">
      <LockIcon className="text-muted-foreground/30" />
    </div>
  )
}

const cardStyles: Record<SessionCardState, string> = {
  completed: "border-primary/20 bg-primary/5 cursor-default",
  available:
    "border-primary/40 bg-card shadow-sm shadow-primary/10 hover:border-primary/60",
  "available-at-limit": "border-primary/20 bg-card hover:border-primary/40",
  "free-cap-reached": "border-border/30 bg-card/40 cursor-default opacity-60",
  "locked-progress": "border-border/40 bg-card/40 hover:border-border/60",
  "locked-premium": "border-border/30 bg-card/30 opacity-50 cursor-not-allowed",
}

// ─────────────────────────────────────────────
// Day nudge modal
// ─────────────────────────────────────────────

function DayNudgeModal({
  limitForToday,
  personaName,
  nextUnlockDate,
  onDismiss,
  onKeepGoing,
}: {
  limitForToday: number
  personaName: string
  nextUnlockDate: string
  onDismiss: () => void
  onKeepGoing: () => void
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onDismiss}
      />
      <div className="fixed right-0 bottom-0 left-0 z-50 mx-auto flex max-w-lg animate-in flex-col gap-5 rounded-t-2xl border-t border-border bg-card px-6 pt-6 pb-10 duration-300 slide-in-from-bottom">
        <div className="mx-auto h-1 w-8 rounded-full bg-border" />
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-base font-bold text-foreground">
            That&apos;s your {limitForToday} for today.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {personaName} will be here {nextUnlockDate}. But if you want to keep
            going — you&apos;ve earned it.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={onKeepGoing}
            size="lg"
            className="w-full rounded-full font-mono"
          >
            Keep going →
          </Button>
          <Button
            variant="outline"
            onClick={onDismiss}
            size="lg"
            className="w-full rounded-full font-mono"
          >
            See you {nextUnlockDate}
          </Button>
        </div>
      </div>
    </>
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
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          Keep going, {userName}
        </p>
        <p className="font-mono text-sm leading-relaxed text-foreground">
          {personaName} has more to show you. Unlock full access to keep
          building.
        </p>
      </div>
      <Button size="lg" className="w-full rounded-full font-mono">
        Unlock Full Access
      </Button>
      <p className="text-center font-mono text-[10px] text-muted-foreground">
        Pricing coming soon — beta users get early access.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Card builder
// ─────────────────────────────────────────────

function buildSessionCards(
  progress: UserProgress,
  daily: DailyStatus,
  isPremium: boolean
): SessionCardData[] {
  const cards = []
  const completedCount = progress.totalSessions
  const freeAvailable = isPremium ? TOTAL_VISIBLE_SESSIONS : FREE_SESSION_LIMIT

  for (let i = 1; i <= TOTAL_VISIBLE_SESSIONS; i++) {
    // ── Completed ──
    if (i <= completedCount) {
      const s = progress.sessions[completedCount - i]
      cards.push({
        sessionNumber: i,
        state: "completed" as SessionCardState,
        eyeContactPercent: s?.score.eyeContactPercent ?? 0,
        composurePercent: s?.score.composurePercent ?? 0,
        fillerWordCount: s?.score.fillerWordCount ?? 0,
        pointsEarned: s?.feedback?.pointsEarned ?? 0,
        date: s?.date,
      })
      continue
    }

    // ── Beyond free tier ──
    if (i > freeAvailable) {
      cards.push({
        sessionNumber: i,
        state: "locked-premium" as SessionCardState,
      })
      continue
    }

    // ── Previous not done ──
    if (i > completedCount + 1) {
      cards.push({
        sessionNumber: i,
        state: "locked-progress" as SessionCardState,
      })
      continue
    }

    // ── Next session (i === completedCount + 1) ──

    // At daily soft limit — show nudge on tap (can come back tomorrow)
    // Check this FIRST before free cap — daily limit is temporary
    if (daily.isAtDailyLimit) {
      cards.push({
        sessionNumber: i,
        state: "available-at-limit" as SessionCardState,
      })
      continue
    }

    // Free cap reached — no more sessions available (hard stop, must upgrade)
    if (daily.isFreeCapReached) {
      cards.push({
        sessionNumber: i,
        state: "free-cap-reached" as SessionCardState,
      })
      continue
    }

    // Fully available
    cards.push({ sessionNumber: i, state: "available" as SessionCardState })
  }

  return cards
}

// ─────────────────────────────────────────────
// Helpers + sub-components
// ─────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-3 py-3 text-center">
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

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="10"
      height="12"
      viewBox="0 0 10 12"
      fill="none"
      className={className}
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

function getGreeting(): string {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

function getMotivationalLine(
  progress: UserProgress,
  daily: DailyStatus,
  name: string
): string {
  if (daily.isFreeCapReached)
    return `You've made real progress, ${progress.totalSessions} sessions in. Unlock full access to keep going.`
  if (progress.totalSessions === 0)
    return `${name} is ready when you are. Your first session is waiting below.`
  if (daily.isAtDailyLimit)
    return `That's your ${daily.limitForToday} for today — but you can always keep going.`
  if (progress.improvements.length > 0)
    return `Your ${progress.improvements[0]}. ${name} sees it.`
  return `${progress.totalSessions} session${progress.totalSessions > 1 ? "s" : ""} in. Keep the momentum going.`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

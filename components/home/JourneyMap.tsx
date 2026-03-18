"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getDailyStatus } from "@/lib/logic/dailyLimit"
import { useAuth } from "@/hooks/useAuth"
import AuthModal from "@/components/auth/AuthModal"
import { PERSONAS } from "@/types/user"
import type { UserProfile } from "@/types/user"
import type { UserProgress } from "@/lib/storage/session"
import type { DailyStatus } from "@/lib/logic/dailyLimit"
import { FREE_SESSION_LIMIT, SESSION_PEEK_AHEAD, BETA_MODE } from "@/configs/tiers"
import type { User } from "@supabase/supabase-js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import ProgressArc from "@/components/home/ProgressArc"

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

const IS_PREMIUM = BETA_MODE

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

export default function JourneyMap({
  profile,
  progress,
}: {
  profile: UserProfile
  progress: UserProgress
}) {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [showDayNudge, setShowDayNudge] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.replace("/")
  }

  const fireToast = useCallback((msg: string) => {
    toast(msg)
  }, [])

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
        // Guest user - prompt to sign in to continue
        if (!user) {
          setShowAuthModal(true)
        }
        break
      default:
        break
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="font-mono text-lg font-bold text-primary">
            Confidont
          </h1>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full px-1 py-1 transition-colors hover:bg-muted/50">
                  <UserAvatar user={user} personaColor={persona.colorAccent} size="sm" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {user.user_metadata?.full_name ?? profile.name}
                  </span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    className="text-muted-foreground/50 transition-transform duration-200"
                  >
                    <path
                      d="M2 3.5l3 3 3-3"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <UserAvatar user={user} personaColor={persona.colorAccent} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold text-foreground truncate">
                      {user.user_metadata?.full_name ?? profile.name}
                    </p>
                    {user.email && (
                      <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>

                <DropdownMenuSeparator className="my-1" />

                {/* Sign out */}
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-destructive focus:text-destructive"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M4.5 2H2.5A1 1 0 001.5 3v6a1 1 0 001 1h2M8 8.5L10.5 6 8 3.5M4.5 6h6"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2"
            >
              <div
                className={`h-7 w-7 rounded-full ${persona.colorAccent} flex items-center justify-center font-mono text-xs font-bold text-white`}
              >
                {persona.name[0]}
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-[10px] font-bold text-primary transition-colors hover:bg-primary/20">
                sign in
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-6 py-8">
        {/* Greeting */}
        <div className="space-y-1">
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

        {/* Progress arc — shown once user has ≥ 2 sessions */}
        <ProgressArc progress={progress} />

        {/* Session path */}
        <div className="relative space-y-2">
          {/* Track line — two segments: completed (primary) + remaining (border) */}
          <div className="absolute top-8 bottom-8 left-3.5 z-0 w-px -translate-x-1/2 bg-border/60" />

          {cards.map((card, i) => {
            const phase = PHASES.find(
              (p) => p.startsAt === card.sessionNumber && card.sessionNumber > 1
            )
            return (
              <SessionCard
                key={card.sessionNumber}
                card={card}
                phaseStart={phase ?? null}
                nextUnlockDate={daily.nextUnlockDate}
                onTap={() => handleCardTap(card)}
                index={i}
              />
            )
          })}

          <div className="flex items-center gap-3 pt-3 pl-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border/40">
              <span className="text-[11px] text-muted-foreground/30">∞</span>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground/30">
              The journey doesn&apos;t end here.
            </p>
          </div>
        </div>

        {/* Upgrade card — only shown when free cap is reached */}
        {daily.isFreeCapReached && (
          <UpgradeCard
            personaName={persona.name}
            userName={profile.name}
            isAuthenticated={!!user}
            lastSessionDate={progress.lastSessionDate}
            onSignIn={() => setShowAuthModal(true)}
          />
        )}

        <div className="h-8" />
      </div>

      {/* Daily limit nudge — soft, user chooses */}
      <DayNudgeModal
        open={showDayNudge}
        limitForToday={daily.limitForToday}
        personaName={persona.name}
        nextUnlockDate={daily.nextUnlockDate}
        onDismiss={() => setShowDayNudge(false)}
        onKeepGoing={() => {
          setShowDayNudge(false)
          router.push("/session")
        }}
      />

      {/* Auth modal — guest sign in */}
      {showAuthModal && (
        <AuthModal
          context="general"
          onDismiss={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Session Card
// ─────────────────────────────────────────────

function SessionCard({
  card,
  phaseStart,
  nextUnlockDate,
  onTap,
}: {
  card: SessionCardData
  phaseStart: (typeof PHASES)[number] | null
  nextUnlockDate: string
  onTap: () => void
  index: number
}) {
  const isClickable =
    card.state !== "completed" && card.state !== "free-cap-reached"

  return (
    <div className="flex flex-col gap-0">
      {/* Phase transition banner — sits above the card, outside the flex row */}
      {phaseStart && (
        <div className="mb-3 ml-11 mt-4 space-y-0.5">
          <p className="font-mono text-[9px] tracking-widest text-primary/70 uppercase">
            Phase {phaseStart.id} — {phaseStart.name}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground/60">
            {phaseStart.description}
          </p>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Node */}
        <div className="z-10 mt-3.5 shrink-0">
          <NodeIcon state={card.state} />
        </div>

        {/* Card */}
        <button
          onClick={isClickable ? onTap : undefined}
          disabled={!isClickable}
          className={`mb-1 w-full flex-1 rounded-2xl border text-left transition-all duration-200 ${cardStyles[card.state]}`}
        >
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <p
                  className={`font-mono text-[10px] tracking-widest uppercase ${
                    card.state === "locked-premium" ||
                    card.state === "locked-progress" ||
                    card.state === "free-cap-reached"
                      ? "text-muted-foreground/30"
                      : "text-muted-foreground/70"
                  }`}
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ScoreBadge label="Eye contact" value={qualitativePresence(card.eyeContactPercent ?? 0)} />
          <ScoreBadge label="Composure" value={qualitativePresence(card.composurePercent ?? 0)} />
          <ScoreBadge label="Fillers" value={qualitativeFillers(card.fillerWordCount ?? 0)} />
          {(card.pointsEarned ?? 0) > 0 && (
            <span className="font-mono text-[10px] font-semibold text-primary">
              +{card.pointsEarned}pts
            </span>
          )}
        </div>
      )
    case "available":
      return (
        <p className="font-mono text-xs font-medium text-foreground">
          Ready — tap to begin
        </p>
      )
    case "available-at-limit":
      return (
        <p className="font-mono text-xs text-amber-500/80">
          Done for today — or keep going?
        </p>
      )
    case "free-cap-reached":
      return (
        <p className="font-mono text-xs text-muted-foreground/40">
          Returns {nextUnlockDate}
        </p>
      )
    case "locked-progress":
      return (
        <p className="font-mono text-xs text-muted-foreground/30">
          Finish the previous session first
        </p>
      )
    case "locked-premium":
      return (
        <p className="font-mono text-xs text-muted-foreground/30">
          Premium only
        </p>
      )
  }
}

function CardAction({ card }: { card: SessionCardData }) {
  switch (card.state) {
    case "available":
      return (
        <span className="shrink-0 rounded-full bg-primary px-4 py-1.5 font-mono text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20">
          Start →
        </span>
      )
    case "available-at-limit":
      return (
        <span className="shrink-0 rounded-full border border-amber-500/40 px-4 py-1.5 font-mono text-xs font-bold text-amber-500/80">
          Start →
        </span>
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
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-sm shadow-primary/30">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6l3 3 5-5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }
  if (state === "available") {
    return (
      <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
      </div>
    )
  }
  if (state === "available-at-limit") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-500/40 bg-background">
        <div className="h-2 w-2 rounded-full bg-amber-500/60" />
      </div>
    )
  }
  if (state === "free-cap-reached") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/40 bg-muted/30">
        <span className="text-[10px] opacity-50">🌙</span>
      </div>
    )
  }
  // locked-progress or locked-premium
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border/40 bg-background">
      <LockIcon className="text-muted-foreground/25" />
    </div>
  )
}

const cardStyles: Record<SessionCardState, string> = {
  completed:
    "border-primary/15 bg-primary/[0.03] cursor-default",
  available:
    "border-primary/50 bg-card shadow-md shadow-primary/10 hover:border-primary hover:shadow-primary/20 active:scale-[0.99]",
  "available-at-limit":
    "border-amber-500/30 bg-card hover:border-amber-500/50",
  "free-cap-reached":
    "border-border/20 bg-muted/20 cursor-default opacity-50",
  "locked-progress":
    "border-border/30 bg-muted/10 cursor-not-allowed opacity-50",
  "locked-premium":
    "border-border/20 bg-muted/10 cursor-not-allowed opacity-40",
}

// ─────────────────────────────────────────────
// Day nudge modal
// ─────────────────────────────────────────────

function DayNudgeModal({
  open,
  limitForToday,
  personaName,
  nextUnlockDate,
  onDismiss,
  onKeepGoing,
}: {
  open: boolean
  limitForToday: number
  personaName: string
  nextUnlockDate: string
  onDismiss: () => void
  onKeepGoing: () => void
}) {
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onDismiss() }}>
      <DrawerContent className="mx-auto max-w-lg px-6 pb-10">
        <DrawerHeader className="px-0 pt-2">
          <div className="mx-auto h-1 w-8 rounded-full bg-border" />
          <DrawerTitle className="font-mono text-base font-bold text-foreground text-left mt-3">
            That&apos;s your {limitForToday} for today.
          </DrawerTitle>
          <p className="text-sm leading-relaxed text-muted-foreground text-left">
            {personaName} will be here {nextUnlockDate}. But if you want to keep
            going - you&apos;ve earned it.
          </p>
        </DrawerHeader>
        <DrawerFooter className="px-0 space-y-2">
          <Button
            onClick={onKeepGoing}
            className="w-full rounded-full py-3.5 font-mono text-sm font-bold"
          >
            Keep going →
          </Button>
          <Button
            variant="outline"
            onClick={onDismiss}
            className="w-full rounded-full border border-border py-3.5 font-mono text-sm font-bold text-muted-foreground hover:border-primary/30 hover:text-foreground"
          >
            See you {nextUnlockDate}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─────────────────────────────────────────────
// Countdown hook — ticks every second until target
// ─────────────────────────────────────────────

function useCountdown(lastSessionDate: string | null): string | null {
  const targetMs = lastSessionDate
    ? new Date(lastSessionDate).getTime() + 24 * 60 * 60 * 1000
    : null

  const [display, setDisplay] = useState<string | null>(() =>
    targetMs ? formatCountdown(targetMs - Date.now()) : null
  )

  useEffect(() => {
    if (!targetMs) return
    const tick = () => {
      const remaining = targetMs - Date.now()
      setDisplay(remaining > 0 ? formatCountdown(remaining) : null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetMs])

  return display
}

function formatCountdown(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
}

// ─────────────────────────────────────────────
// Upgrade card
// ─────────────────────────────────────────────

function UpgradeCard({
  personaName,
  userName,
  isAuthenticated,
  lastSessionDate,
  onSignIn,
}: {
  personaName: string
  userName: string
  isAuthenticated: boolean
  lastSessionDate: string | null
  onSignIn: () => void
}) {
  const countdown = useCountdown(lastSessionDate)

  if (isAuthenticated) {
    return (
      <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="space-y-1">
          <p className="font-mono text-xs tracking-widest text-primary uppercase">
            You&apos;re on a roll, {userName}
          </p>
          <p className="font-mono text-sm leading-relaxed text-foreground">
            Premium is coming — unlimited sessions, no cap, full {personaName} coaching. You&apos;ll be first to know.
          </p>
        </div>
        <div className="w-full rounded-full border border-primary/30 py-2.5 text-center font-mono text-sm font-bold text-primary/60">
          Coming soon
        </div>
        {countdown && (
          <p className="text-center font-mono text-[10px] text-muted-foreground">
            Next free session in{" "}
            <span className="tabular-nums text-foreground">{countdown}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="space-y-1">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          Keep going, {userName}
        </p>
        <p className="font-mono text-sm leading-relaxed text-foreground">
          {personaName} has more to show you. Sign in to keep your progress across devices.
        </p>
      </div>
      <button
        onClick={onSignIn}
        className="w-full rounded-full bg-primary py-2.5 font-mono text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
      >
        Sign in to continue
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Card builder
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Qualitative labels — no raw numbers shown to users
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Card builder — dynamic feed, grows as user progresses
// ─────────────────────────────────────────────

function buildSessionCards(
  progress: UserProgress,
  daily: DailyStatus,
  isPremium: boolean
): SessionCardData[] {
  const completedCount = progress.totalSessions
  const nextSession = completedCount + 1
  // Feed always shows all completed + SESSION_PEEK_AHEAD sessions ahead
  const totalToShow = Math.max(SESSION_PEEK_AHEAD + 1, completedCount + SESSION_PEEK_AHEAD)

  const cards: SessionCardData[] = []

  for (let i = 1; i <= totalToShow; i++) {
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

    // ── Next session ──
    if (i === nextSession) {
      if (!isPremium && daily.isFreeCapReached) {
        cards.push({ sessionNumber: i, state: "free-cap-reached" as SessionCardState })
        continue
      }
      if (daily.isAtDailyLimit) {
        cards.push({ sessionNumber: i, state: "available-at-limit" as SessionCardState })
        continue
      }
      cards.push({ sessionNumber: i, state: "available" as SessionCardState })
      continue
    }

    // ── Future sessions ──
    if (!isPremium && i > FREE_SESSION_LIMIT) {
      cards.push({ sessionNumber: i, state: "locked-premium" as SessionCardState })
    } else {
      cards.push({ sessionNumber: i, state: "locked-progress" as SessionCardState })
    }
  }

  return cards
}

// ─────────────────────────────────────────────
// Helpers + sub-components
// ─────────────────────────────────────────────

function UserAvatar({
  user,
  personaColor,
  size,
}: {
  user: User
  personaColor: string
  size: "sm" | "md"
}) {
  const avatarUrl: string | undefined = user.user_metadata?.avatar_url
  const initials =
    user.user_metadata?.full_name?.[0]?.toUpperCase() ??
    user.email?.[0]?.toUpperCase() ??
    "?"

  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9"

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt="profile"
        className={`${dim} rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div
      className={`${dim} ${personaColor} flex shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white`}
    >
      {initials}
    </div>
  )
}

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

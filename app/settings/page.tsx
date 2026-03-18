"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PERSONAS } from "@/types/user"
import type { Goal, SessionsPerDay } from "@/types/user"
import { getProfile, getProfileFromSupabase, updateProfile } from "@/lib/storage/user"
import { PersonaDisplay } from "@/components/persona/PersonaSVGs"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────
// /settings
//
// Lets users change persona, goal, and session cadence.
// Works for both guests (localStorage) and auth users (Supabase sync).
// ─────────────────────────────────────────────

const GOALS: { value: Goal; label: string; detail: string }[] = [
  { value: "job-interviews",  label: "Job interviews",   detail: "Perform confidently when it counts most" },
  { value: "presentations",   label: "Presentations",    detail: "Hold the room without falling apart" },
  { value: "video-calls",     label: "Video calls",      detail: "Feel natural on Zoom, Meet, Teams" },
  { value: "content-creation",label: "Content creation", detail: "Show up on camera and actually enjoy it" },
  { value: "general-comfort", label: "General comfort",  detail: "Just want to be less anxious on camera" },
]

const CADENCE: { value: SessionsPerDay; label: string; detail: string }[] = [
  { value: 1, label: "Once a day",    detail: "Steady and sustainable" },
  { value: 2, label: "Twice a day",   detail: "Building real momentum" },
  { value: 3, label: "Three times",   detail: "All in — let's move fast" },
]

export default function SettingsPage() {
  const router = useRouter()
  const [personaId, setPersonaId]           = useState<string | null>(null)
  const [goal, setGoal]                     = useState<Goal | null>(null)
  const [sessionsPerDay, setSessionsPerDay] = useState<SessionsPerDay | null>(null)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [loaded, setLoaded]                 = useState(false)
  // Original values for dirty-checking — kept in state since auth users have no localStorage
  const [original, setOriginal]             = useState<{ personaId: string; goal: Goal; sessionsPerDay: SessionsPerDay } | null>(null)

  useEffect(() => {
    const load = async () => {
      // Try localStorage first (guest users), then Supabase (auth users whose
      // localStorage was cleared by home/page.tsx after sign-in).
      const local = getProfile()
      const profile = local ?? (await getProfileFromSupabase())
      if (!profile) {
        router.replace("/onboarding")
        return
      }
      setPersonaId(profile.personaId)
      setGoal(profile.goal)
      setSessionsPerDay(profile.sessionsPerDay)
      setOriginal({ personaId: profile.personaId, goal: profile.goal, sessionsPerDay: profile.sessionsPerDay })
      setLoaded(true)
    }
    load()
  }, [router])

  const handleSave = async () => {
    if (!personaId || !goal || !sessionsPerDay) return
    setSaving(true)
    await updateProfile({ personaId, goal, sessionsPerDay })
    setSaving(false)
    setSaved(true)
    setTimeout(() => router.push("/home"), 900)
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-5" />
      </div>
    )
  }

  const isDirty = original !== null && (
    original.personaId !== personaId ||
    original.goal !== goal ||
    original.sessionsPerDay !== sessionsPerDay
  )

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border/40">
        <button
          onClick={() => router.back()}
          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← back
        </button>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase flex-1 text-center">
          Settings
        </p>
        <span className="w-8" />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-8 max-w-lg mx-auto w-full">

        {/* ── Persona ─────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <p className="font-mono text-sm font-bold text-foreground">Your coach</p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              Who you practice with every session.
            </p>
          </div>

          <div className="flex justify-between gap-1">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersonaId(p.id)}
                className="flex flex-col items-center gap-1 flex-1 focus:outline-none"
              >
                <div
                  className={cn(
                    "rounded-2xl transition-all duration-200 overflow-visible",
                    personaId === p.id
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                      : "opacity-40 hover:opacity-70 hover:scale-105"
                  )}
                >
                  <PersonaDisplay personaId={p.id} state="idle" size={56} />
                </div>
                <span
                  className={cn(
                    "font-mono text-[9px] tracking-wide transition-colors text-center",
                    personaId === p.id ? "text-foreground font-bold" : "text-muted-foreground/60"
                  )}
                >
                  {p.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>

          {personaId && (() => {
            const p = PERSONAS.find((x) => x.id === personaId)!
            return (
              <div className="rounded-xl border border-border/50 bg-card px-4 py-3 flex items-center gap-3">
                <PersonaDisplay personaId={p.id} state="idle" size={44} />
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-foreground">{p.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    {p.communicationStyle}
                  </p>
                </div>
              </div>
            )
          })()}
        </section>

        {/* ── Goal ────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <p className="font-mono text-sm font-bold text-foreground">Your goal</p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              Shapes the kind of prompts you get.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={cn(
                  "h-auto w-full justify-start rounded-xl border px-3 py-3 text-left transition-all duration-150",
                  goal === g.value
                    ? "border-primary/50 bg-primary/[0.04]"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-mono text-sm text-foreground">{g.label}</span>
                  <span className="text-xs text-muted-foreground">{g.detail}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Cadence ─────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <p className="font-mono text-sm font-bold text-foreground">Daily rhythm</p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              How many sessions a day feels right.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {CADENCE.map((c) => (
              <button
                key={c.value}
                onClick={() => setSessionsPerDay(c.value)}
                className={cn(
                  "h-auto w-full justify-start rounded-xl border px-3 py-3 text-left transition-all duration-150",
                  sessionsPerDay === c.value
                    ? "border-primary/50 bg-primary/[0.04]"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-mono text-sm text-foreground">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{c.detail}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Footer — save */}
      <footer className="px-6 py-6 border-t border-border/40 max-w-lg mx-auto w-full">
        {saved ? (
          <p className="font-mono text-sm text-primary text-center">✓ Saved</p>
        ) : (
          <Button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="w-full rounded-full"
            size="lg"
          >
            {saving ? <><Spinner className="mr-2 size-3.5" />Saving...</> : "Save changes"}
          </Button>
        )}
      </footer>
    </div>
  )
}

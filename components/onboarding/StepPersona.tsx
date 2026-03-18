"use client"

import { useState, useEffect, useRef } from "react"
import { PERSONAS } from "@/types/user"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { PersonaDisplay } from "@/components/persona/PersonaSVGs"
import type { PersonaAnimationState } from "@/components/persona/PersonaSVGs"

interface StepPersonaProps {
  name: string
  saving: boolean
  onNext: (personaId: string) => void
}

// ── Typewriter hook ────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState("")
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDisplayed("")
    if (!text) return
    let i = 0
    const tick = () => {
      i++
      setDisplayed(text.slice(0, i))
      if (i < text.length) rafRef.current = setTimeout(tick, speed)
    }
    // Small leading delay so the card mounts first
    rafRef.current = setTimeout(tick, 120)
    return () => { if (rafRef.current) clearTimeout(rafRef.current) }
  }, [text, speed])

  return displayed
}

export function StepPersona({ name, saving, onNext }: StepPersonaProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [animState, setAnimState] = useState<PersonaAnimationState>("idle")

  const handleSelect = (id: string) => {
    if (id === selected) return
    setSelected(id)
    setAnimState("wave")
    setTimeout(() => setAnimState("idle"), 1300)
  }

  const selectedPersona = PERSONAS.find((p) => p.id === selected) ?? null
  const introText = selectedPersona?.sessionIntro ?? ""
  const typedIntro = useTypewriter(introText)

  return (
    <div className="flex flex-col gap-5 w-full pb-16 sm:pb-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-primary uppercase truncate">
          One last thing, {name}.
        </p>
        <h2 className="font-mono text-xl sm:text-2xl leading-tight font-bold text-foreground">
          Pick your coach.
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This is who&apos;ll be with you every session. You can change them
          later.
        </p>
      </div>

      {/* Avatar picker row */}
      <div className="flex justify-between gap-1">
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            onClick={() => handleSelect(persona.id)}
            className="flex flex-col items-center gap-1 flex-1 focus:outline-none"
          >
            <div
              className={cn(
                "rounded-2xl transition-all duration-200 overflow-visible",
                selected === persona.id
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                  : "opacity-50 hover:opacity-80 hover:scale-105"
              )}
            >
              <PersonaDisplay
                personaId={persona.id}
                state={selected === persona.id ? animState : "idle"}
                size={60}
              />
            </div>
            <span
              className={cn(
                "font-mono text-[9px] tracking-wide transition-colors text-center",
                selected === persona.id
                  ? "text-foreground font-bold"
                  : "text-muted-foreground/60"
              )}
            >
              {persona.name.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Detail card */}
      {selectedPersona ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 transition-all duration-300">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="shrink-0 -mt-1">
              <PersonaDisplay
                personaId={selectedPersona.id}
                state={animState}
                size={72}
              />
            </div>

            {/* Name + speech bubble */}
            <div className="min-w-0 flex-1 pt-1 space-y-2">
              <div>
                <p className="font-mono text-sm font-bold text-foreground leading-none">
                  {selectedPersona.name}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  {selectedPersona.ageRange} · {selectedPersona.personality}
                </p>
              </div>

              {/* Speech bubble */}
              <div className="relative rounded-xl rounded-tl-none bg-primary/10 border border-primary/15 px-3 py-2.5 min-h-[48px]">
                {/* Small triangle pointing left toward avatar */}
                <span
                  className="absolute -left-[6px] top-2 w-0 h-0 border-t-[5px] border-t-transparent border-r-[6px] border-r-primary/15 border-b-[5px] border-b-transparent"
                  aria-hidden
                />
                <p className="font-mono text-xs leading-relaxed text-foreground/80">
                  {typedIntro}
                  {/* Blinking cursor while typing */}
                  {typedIntro.length < introText.length && (
                    <span className="inline-block w-[2px] h-[11px] ml-[1px] bg-primary/60 align-middle animate-pulse" />
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/40 px-5 py-6 text-center">
          <p className="font-mono text-xs text-muted-foreground/40">
            Tap a coach above to learn more
          </p>
        </div>
      )}

      <Button
        onClick={() => selected && onNext(selected)}
        disabled={!selected || saving}
        size="lg"
        className="w-full rounded-full font-mono text-sm sm:text-base"
      >
        {saving && <Spinner className="mr-2 size-3.5" />}
        {saving ? "Setting things up..." : "Let\u2019s go \u2192"}
      </Button>
    </div>
  )
}

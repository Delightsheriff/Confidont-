"use client"

import { useState } from "react"
import { PERSONAS } from "@/types/user"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Persona } from "@/types/user"

interface StepPersonaProps {
  name: string
  saving: boolean
  onNext: (personaId: string) => void
}

export function StepPersona({ name, saving, onNext }: StepPersonaProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6 w-full pb-16 sm:pb-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-primary uppercase truncate">
          One last thing, {name}.
        </p>
        <h2 className="font-mono text-xl sm:text-2xl leading-tight font-bold text-foreground">
          Pick your coach.
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This is who&apos;ll be with you every session. You can change them later.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {PERSONAS.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            selected={selected === persona.id}
            onSelect={() => setSelected(persona.id)}
          />
        ))}
      </div>

      <Button
        onClick={() => selected && onNext(selected)}
        disabled={!selected || saving}
        size="lg"
        className="w-full rounded-full font-mono text-sm sm:text-base mt-2"
      >
        {saving && <Spinner className="mr-2 size-3.5" />}
        {saving ? "Setting things up..." : "Let's go →"}
      </Button>
    </div>
  )
}

interface PersonaCardProps {
  persona: Persona
  selected: boolean
  onSelect: () => void
}

function PersonaCard({ persona, selected, onSelect }: PersonaCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-150 sm:px-4 sm:py-4",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold text-white sm:size-10",
          persona.colorAccent
        )}
      >
        {persona.name[0]}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm font-bold text-foreground truncate">
            {persona.name}
          </p>
          <p className="text-xs text-muted-foreground shrink-0">{persona.ageRange}</p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {persona.communicationStyle}
        </p>
        <p className="mt-1 font-mono text-xs text-primary/70 italic truncate sm:mt-1.5">
          &quot;{persona.signatureLine}&quot;
        </p>
      </div>

      <div
        className={cn(
          "mt-1 size-4 shrink-0 rounded-full border-2 transition-all",
          selected ? "border-primary bg-primary" : "border-border"
        )}
      />
    </button>
  )
}

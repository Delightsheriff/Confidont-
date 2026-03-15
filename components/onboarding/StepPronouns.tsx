"use client"

import { Button } from "@/components/ui/button"
import type { Pronoun } from "@/types/user"

interface StepPronounsProps {
  name: string
  onNext: (pronouns: Pronoun) => void
}

const options: { value: Pronoun; label: string }[] = [
  { value: "she/her", label: "She / Her" },
  { value: "he/him", label: "He / Him" },
  { value: "they/them", label: "They / Them" },
  { value: "prefer not to say", label: "Prefer not to say" },
]

export function StepPronouns({ name, onNext }: StepPronounsProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-primary uppercase truncate">
          Nice to meet you, {name}.
        </p>
        <h2 className="font-mono text-xl sm:text-2xl leading-tight font-bold text-foreground">
          What are your pronouns?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This helps your coach speak to you naturally.
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        {options.map((o) => (
          <Button
            key={o.value}
            variant="outline"
            onClick={() => onNext(o.value)}
            className="h-auto w-full justify-start rounded-xl px-3 py-3 text-left"
          >
            <span className="font-mono text-sm text-foreground truncate">
              {o.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

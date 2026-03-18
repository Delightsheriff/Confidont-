"use client"

import { Button } from "@/components/ui/button"
import type { SessionsPerDay } from "@/types/user"

interface StepSessionsPerDayProps {
  name: string
  onNext: (sessionsPerDay: SessionsPerDay) => void
}

const options: { value: SessionsPerDay; label: string; detail: string }[] = [
  { value: 1, label: "Once a day", detail: "Steady and sustainable" },
  { value: 2, label: "Twice a day", detail: "Building real momentum" },
  { value: 3, label: "Three times", detail: "All in — let's move fast" },
]

export function StepSessionsPerDay({ name, onNext }: StepSessionsPerDayProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-primary uppercase truncate">
          Almost done.
        </p>
        <h2 className="font-mono text-xl sm:text-2xl leading-tight font-bold text-foreground">
          How often feels right for you?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-wrap balance">
          Even once a day compounds fast, {name}. You can always do more — we
          won&apos;t get in the way.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((o) => (
          <Button
            key={o.value}
            variant="outline"
            onClick={() => onNext(o.value)}
            className="h-auto w-full justify-start rounded-xl px-3 py-3 text-left"
          >
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <span className="font-mono text-sm text-foreground truncate">
                {o.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {o.detail}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}

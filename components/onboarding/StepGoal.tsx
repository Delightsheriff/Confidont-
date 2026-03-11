"use client"

import { Button } from "@/components/ui/button"
import type { Goal } from "@/types/user"

interface StepGoalProps {
  name: string
  onNext: (goal: Goal) => void
}

const options: { value: Goal; label: string; detail: string }[] = [
  {
    value: "job-interviews",
    label: "Job interviews",
    detail: "Perform confidently when it counts most",
  },
  {
    value: "presentations",
    label: "Presentations",
    detail: "Hold the room without falling apart",
  },
  {
    value: "video-calls",
    label: "Video calls",
    detail: "Feel natural on Zoom, Meet, Teams",
  },
  {
    value: "content-creation",
    label: "Content creation",
    detail: "Show up on camera and actually enjoy it",
  },
  {
    value: "general-comfort",
    label: "General comfort",
    detail: "Just want to be less anxious on camera",
  },
]

export function StepGoal({ name, onNext }: StepGoalProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-primary uppercase truncate">
          Good to know, {name}.
        </p>
        <h2 className="font-mono text-xl sm:text-2xl leading-tight font-bold text-foreground">
          Why are you here?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pick the one that fits best. You can always change this later.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
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
              <span className="text-xs text-muted-foreground line-clamp-2">
                {o.detail}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}

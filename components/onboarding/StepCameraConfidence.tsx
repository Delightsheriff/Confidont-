"use client"

import { Button } from "@/components/ui/button"
import type { CameraConfidence } from "@/types/user"

interface StepCameraConfidenceProps {
  name: string
  onNext: (cameraConfidence: CameraConfidence) => void
}

const options: { value: CameraConfidence; label: string; detail: string }[] = [
  {
    value: "avoid-entirely",
    label: "I avoid it entirely",
    detail: "Camera on? Hard pass. I'll find another way.",
  },
  {
    value: "freeze-or-fumble",
    label: "I freeze or fumble",
    detail: "I show up but it doesn't go well.",
  },
  {
    value: "manage-want-to-improve",
    label: "I manage, but want to improve",
    detail: "I get through it — just not with confidence.",
  },
]

export function StepCameraConfidence({
  name,
  onNext,
}: StepCameraConfidenceProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-primary uppercase truncate">
          Honest question.
        </p>
        <h2 className="font-mono text-lg sm:text-2xl leading-tight font-bold text-foreground">
          How would you describe yourself on camera right now, {name}?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No judgment. This helps us start in the right place.
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

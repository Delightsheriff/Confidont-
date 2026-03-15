"use client"

import { cn } from "@/lib/utils"

interface ProgressDotsProps {
  current: number
  total: number
}

export function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i + 1 === current
              ? "h-1.5 w-5 bg-primary"
              : i + 1 < current
                ? "size-1.5 bg-primary/50"
                : "size-1.5 bg-border"
          )}
        />
      ))}
    </div>
  )
}

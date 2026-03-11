"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StepNameProps {
  initial: string
  onNext: (name: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

export function StepName({ initial, onNext, inputRef }: StepNameProps) {
  const [value, setValue] = useState(initial)

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed.length < 1) return
    onNext(trimmed)
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-primary uppercase truncate">
          Welcome to Confidont
        </p>
        <h2 className="font-mono text-xl sm:text-2xl leading-tight font-bold text-foreground">
          What should we call you?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Just your first name is fine.
        </p>
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Your name"
        className="border-b-2 border-t-0 border-x-0 border-border bg-transparent pb-2 font-mono text-xl sm:text-2xl text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary focus-visible:ring-0 rounded-none"
      />
      <Button
        onClick={submit}
        disabled={value.trim().length < 1}
        size="lg"
        className="w-full rounded-full font-mono text-sm sm:text-base"
      >
        Continue →
      </Button>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { PERSONAS } from "@/types/user"
import { saveProfile } from "@/lib/storage/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type {
  OnboardingAnswers,
  Pronoun,
  Goal,
  CameraConfidence,
  SuccessDefinition,
  SessionsPerDay,
  Persona,
} from "@/types/user"

// ─────────────────────────────────────────────
// Onboarding
//
// 6 steps — each fades in/out independently.
// Step 1-5: questions. Step 6: persona selection.
// Progress dots at bottom — no step numbers shown.
//
// On complete: saves profile to storage,
// calls onComplete to navigate to home.
// ─────────────────────────────────────────────

const TOTAL_STEPS = 6

interface OnboardingProps {
  onComplete: () => void
}

type StepState = "entering" | "visible" | "exiting"

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [stepState, setStepState] = useState<StepState>("entering")
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({})
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Focus name input on step 1
  useEffect(() => {
    if (step === 1 && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 400)
    }
  }, [step])

  // Fade in on mount and on step change
  useEffect(() => {
    setStepState("entering")
    const t = setTimeout(() => setStepState("visible"), 50)
    return () => clearTimeout(t)
  }, [step])

  const advance = (update: Partial<OnboardingAnswers>) => {
    const updated = { ...answers, ...update }
    setAnswers(updated)

    if (step === TOTAL_STEPS) {
      // Save and complete
      saveProfile(updated as OnboardingAnswers)
      setStepState("exiting")
      setTimeout(onComplete, 400)
      return
    }

    setStepState("exiting")
    setTimeout(() => setStep((s) => s + 1), 350)
  }

  const stepStyles = {
    entering: "opacity-0 translate-y-4",
    visible: "opacity-100 translate-y-0",
    exiting: "opacity-0 -translate-y-4",
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      {/* Progress dots */}
      <div className="fixed top-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-300",
              i + 1 === step
                ? "h-1.5 w-5 bg-primary"
                : i + 1 < step
                  ? "size-1.5 bg-primary/50"
                  : "size-1.5 bg-border"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        className={cn(
          "w-full max-w-lg transition-all duration-350 ease-out",
          stepStyles[stepState]
        )}
      >
        {step === 1 && (
          <StepName
            initial={answers.name ?? ""}
            onNext={(name) => advance({ name })}
            inputRef={nameInputRef}
          />
        )}
        {step === 2 && (
          <StepPronouns
            name={answers.name ?? ""}
            onNext={(pronouns) => advance({ pronouns })}
          />
        )}
        {step === 3 && (
          <StepGoal
            name={answers.name ?? ""}
            onNext={(goal) => advance({ goal })}
          />
        )}
        {step === 4 && (
          <StepCameraConfidence
            name={answers.name ?? ""}
            onNext={(cameraConfidence) => advance({ cameraConfidence })}
          />
        )}
        {step === 5 && (
          <StepSessionsPerDay
            name={answers.name ?? ""}
            onNext={(sessionsPerDay) => advance({ sessionsPerDay })}
          />
        )}
        {step === 6 && (
          <StepPersona
            name={answers.name ?? ""}
            onNext={(personaId) =>
              advance({
                personaId,
                successDefinition: "feel-natural-on-calls", // default — not a question we ask
              })
            }
          />
        )}
      </div>

      {/* Back button — not on step 1 */}
      {step > 1 && stepState === "visible" && (
        <Button
          variant="ghost"
          onClick={() => {
            setStepState("exiting")
            setTimeout(() => setStep((s) => s - 1), 350)
          }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          ← back
        </Button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────

// ── Step 1: Name ─────────────────────────────

function StepName({
  initial,
  onNext,
  inputRef,
}: {
  initial: string
  onNext: (name: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  const [value, setValue] = useState(initial)

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed.length < 1) return
    onNext(trimmed)
  }

  return (
    <StepShell
      eyebrow="Welcome to Confidont"
      heading="What should we call you?"
      subtext="Just your first name is fine."
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Your name"
        className="w-full border-b-2 border-border bg-transparent pb-2 font-mono text-2xl text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary"
      />
      <ContinueButton onClick={submit} disabled={value.trim().length < 1} />
    </StepShell>
  )
}

// ── Step 2: Pronouns ──────────────────────────

function StepPronouns({
  name,
  onNext,
}: {
  name: string
  onNext: (p: Pronoun) => void
}) {
  const options: { value: Pronoun; label: string }[] = [
    { value: "she/her", label: "She / Her" },
    { value: "he/him", label: "He / Him" },
    { value: "they/them", label: "They / Them" },
    { value: "prefer not to say", label: "Prefer not to say" },
  ]

  return (
    <StepShell
      eyebrow={`Nice to meet you, ${name}.`}
      heading="What are your pronouns?"
      subtext="This helps your coach speak to you naturally."
    >
      <OptionGrid options={options} onSelect={(v) => onNext(v as Pronoun)} />
    </StepShell>
  )
}

// ── Step 3: Goal ──────────────────────────────

function StepGoal({
  name,
  onNext,
}: {
  name: string
  onNext: (g: Goal) => void
}) {
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

  return (
    <StepShell
      eyebrow={`Good to know, ${name}.`}
      heading="Why are you here?"
      subtext="Pick the one that fits best. You can always change this later."
    >
      <div className="flex w-full flex-col gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onNext(o.value)}
            className="group w-full rounded-xl border border-border px-4 py-3.5 text-left transition-all duration-150 hover:border-primary/50 hover:bg-primary/5"
          >
            <p className="font-mono text-sm text-foreground transition-colors group-hover:text-primary">
              {o.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{o.detail}</p>
          </button>
        ))}
      </div>
    </StepShell>
  )
}

// ── Step 4: Camera confidence ─────────────────

function StepCameraConfidence({
  name,
  onNext,
}: {
  name: string
  onNext: (c: CameraConfidence) => void
}) {
  const options: { value: CameraConfidence; label: string; detail: string }[] =
    [
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
        label: "I manage, but want to be better",
        detail: "I get through it — just not with confidence.",
      },
    ]

  return (
    <StepShell
      eyebrow="Honest question."
      heading={`How would you describe yourself on camera right now, ${name}?`}
      subtext="No judgment. This helps us start in the right place."
    >
      <div className="flex w-full flex-col gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onNext(o.value)}
            className="group w-full rounded-xl border border-border px-4 py-3.5 text-left transition-all duration-150 hover:border-primary/50 hover:bg-primary/5"
          >
            <p className="font-mono text-sm text-foreground transition-colors group-hover:text-primary">
              {o.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{o.detail}</p>
          </button>
        ))}
      </div>
    </StepShell>
  )
}

// ── Step 5: Sessions per day ──────────────────

function StepSessionsPerDay({
  name,
  onNext,
}: {
  name: string
  onNext: (s: SessionsPerDay) => void
}) {
  const options: { value: SessionsPerDay; label: string; detail: string }[] = [
    { value: 1, label: "Once a day", detail: "Steady and sustainable" },
    { value: 2, label: "Twice a day", detail: "Building real momentum" },
    { value: 3, label: "Three times", detail: "All in — let's move fast" },
  ]

  return (
    <StepShell
      eyebrow="Almost there."
      heading="How often do you want to practice?"
      subtext={`We'll use this to set your rhythm, ${name}. You can always do more — we won't stop you.`}
    >
      <OptionGrid
        options={options}
        onSelect={(v) => onNext(Number(v) as SessionsPerDay)}
      />
    </StepShell>
  )
}

// ── Step 6: Persona selection ─────────────────

function StepPersona({
  name,
  onNext,
}: {
  name: string
  onNext: (personaId: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <StepShell
      eyebrow={`One last thing, ${name}.`}
      heading="Pick your coach."
      subtext="This is who'll be with you every session. You can change them later."
    >
      <div className="flex w-full flex-col gap-3">
        {PERSONAS.map((p) => (
          <PersonaCard
            key={p.id}
            persona={p}
            selected={selected === p.id}
            onSelect={() => setSelected(p.id)}
          />
        ))}
      </div>

      <ContinueButton
        label="Let's go →"
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
      />
    </StepShell>
  )
}

// ─────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────

function StepShell({
  eyebrow,
  heading,
  subtext,
  children,
}: {
  eyebrow: string
  heading: string
  subtext?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          {eyebrow}
        </p>
        <h2 className="font-mono text-2xl leading-snug font-bold text-foreground">
          {heading}
        </h2>
        {subtext && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {subtext}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function OptionGrid({
  options,
  onSelect,
}: {
  options: { value: string | number; label: string; detail?: string }[]
  onSelect: (value: string | number) => void
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onSelect(o.value)}
          className="group rounded-xl border border-border px-4 py-3.5 text-left transition-all duration-150 hover:border-primary/50 hover:bg-primary/5"
        >
          <p className="font-mono text-sm text-foreground transition-colors group-hover:text-primary">
            {o.label}
          </p>
          {o.detail && (
            <p className="mt-0.5 text-xs text-muted-foreground">{o.detail}</p>
          )}
        </button>
      ))}
    </div>
  )
}

function PersonaCard({
  persona,
  selected,
  onSelect,
}: {
  persona: Persona
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-4 rounded-xl border px-4 py-4 text-left transition-all duration-150",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      {/* Avatar placeholder */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold text-white",
          persona.colorAccent
        )}
      >
        {persona.name[0]}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm font-bold text-foreground">
            {persona.name}
          </p>
          <p className="text-xs text-muted-foreground">{persona.ageRange}</p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {persona.communicationStyle}
        </p>
        <p className="mt-1.5 font-mono text-xs text-primary/70 italic">
          &quot;{persona.signatureLine}&quot;
        </p>
      </div>

      {/* Selection indicator */}
      <div
        className={cn(
          "mt-1 size-4 shrink-0 rounded-full border-2 transition-all",
          selected ? "border-primary bg-primary" : "border-border"
        )}
      />
    </button>
  )
}

function ContinueButton({
  onClick,
  disabled,
  label = "Continue →",
}: {
  onClick: () => void
  disabled?: boolean
  label?: string
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="lg"
      className="w-full rounded-full font-mono"
    >
      {label}
    </Button>
  )
}

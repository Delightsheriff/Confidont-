"use client"

import { useState, useEffect, useRef } from "react"
import { saveProfile } from "@/lib/storage/user"
import { Button } from "@/components/ui/button"
import { ProgressDots } from "./ProgressDots"
import { StepName } from "./StepName"
import { StepPronouns } from "./StepPronouns"
import { StepGoal } from "./StepGoal"
import { StepCameraConfidence } from "./StepCameraConfidence"
import { StepSessionsPerDay } from "./StepSessionsPerDay"
import { StepPersona } from "./StepPersona"
import { cn } from "@/lib/utils"
import type { OnboardingAnswers } from "@/types/user"

const TOTAL_STEPS = 6

interface OnboardingProps {
  onComplete: () => void
}

type StepState = "entering" | "visible" | "exiting"

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [stepState, setStepState] = useState<StepState>("entering")
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({})
  const [saving, setSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 1 && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 400)
    }
  }, [step])

  useEffect(() => {
    const t = setTimeout(() => setStepState("visible"), 50)
    return () => clearTimeout(t)
  }, [step])

  const advance = async (update: Partial<OnboardingAnswers>) => {
    const updated = { ...answers, ...update }
    setAnswers(updated)

    if (step === TOTAL_STEPS) {
      setSaving(true)
      saveProfile(updated as OnboardingAnswers)
      setSaving(false)
      setStepState("exiting")
      setTimeout(onComplete, 400)
      return
    }

    setStepState("exiting")
    setTimeout(() => {
      setStepState("entering")
      setStep((s) => s + 1)
    }, 350)
  }

  const stepStyles = {
    entering: "opacity-0 translate-y-4",
    visible: "opacity-100 translate-y-0",
    exiting: "opacity-0 -translate-y-4",
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:p-6 pb-20 sm:pb-6">
      <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50">
        <ProgressDots current={step} total={TOTAL_STEPS} />
      </div>

      <div
        className={cn(
          "w-full max-w-lg transition-all duration-350 ease-out px-1 sm:px-0",
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
            saving={saving}
            onNext={(personaId) => advance({ personaId })}
          />
        )}
      </div>

      {step > 1 && stepState === "visible" && !saving && (
        <Button
          variant="ghost"
          onClick={() => {
            setStepState("exiting")
            setTimeout(() => {
              setStepState("entering")
              setStep((s) => s - 1)
            }, 350)
          }}
          className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          ← back
        </Button>
      )}
    </div>
  )
}

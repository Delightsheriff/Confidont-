"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

type FormState = "idle" | "loading" | "success" | "already" | "error"

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!isValidEmail(trimmed)) return

    setFormState("loading")

    const supabase = createClient()

    const { error } = await supabase.from("waitlist").insert({ email: trimmed })

    if (error) {
      if (error.code === "23505") {
        setFormState("already")
        return
      }
      console.error("[waitlist] Supabase insert error:", error.message)
      setFormState("error")
      return
    }

    sendWaitlistEmails(trimmed).catch((err) =>
      console.error("[waitlist] Email send error:", err)
    )

    setFormState("success")
  }

  if (formState === "success") {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-2 pt-6">
          <p className="text-2xl">🎉</p>
          <p className="font-mono font-bold text-foreground">
            You&apos;re on the list.
          </p>
          <p className="text-sm text-muted-foreground">
            We&apos;ll email you the moment early access opens.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (formState === "already") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2 pt-6">
          <p className="font-mono font-bold text-foreground">
            You&apos;re already on the list.
          </p>
          <p className="text-sm text-muted-foreground">
            We haven&apos;t forgotten about you.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="your@email.com"
          className="flex-1 rounded-full px-5 py-3 font-mono text-sm"
        />
        <Button
          onClick={handleSubmit}
          disabled={formState === "loading" || !isValidEmail(email.trim())}
          size="lg"
          className="shrink-0 rounded-full px-6 font-mono"
        >
          {formState === "loading" ? "..." : "Join →"}
        </Button>
      </div>
      {formState === "error" && (
        <p className="text-center font-mono text-xs text-destructive">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  )
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function sendWaitlistEmails(email: string): Promise<void> {
  await fetch("/api/waitlist/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
}

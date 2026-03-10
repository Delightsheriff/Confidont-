"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { hasCompletedOnboarding } from "@/lib/storage/user"
import { joinWaitlist } from "@/lib/storage/waitlist"

export default function LandingPage() {
  const router = useRouter()

  const handleTryIt = () => {
    router.push(hasCompletedOnboarding() ? "/home" : "/onboarding")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-mono text-lg font-bold text-primary">
            Confidont
          </span>
          <button
            onClick={handleTryIt}
            className="rounded-full bg-primary px-5 py-2 font-mono text-xs font-bold text-primary-foreground transition-all hover:opacity-90"
          >
            Try it free →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl space-y-6 px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span className="font-mono text-xs text-primary">
            Beta — limited access
          </span>
        </div>

        <h1 className="font-mono text-5xl leading-tight font-bold tracking-tight text-foreground sm:text-6xl">
          Stop dreading
          <br />
          <span className="text-primary">the camera.</span>
        </h1>

        <p className="mx-auto max-w-xl font-mono text-lg leading-relaxed text-muted-foreground">
          Confidont is a coaching app that helps you become confident on camera
          — one short session at a time. No audience. No judgment. Just you and
          your coach.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <button
            onClick={handleTryIt}
            className="w-full rounded-full bg-primary px-8 py-3.5 font-mono text-sm font-bold text-primary-foreground transition-all hover:opacity-90 sm:w-auto"
          >
            Try it free →
          </button>
          <a
            href="#waitlist"
            className="w-full rounded-full border border-border px-8 py-3.5 text-center font-mono text-sm font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground sm:w-auto"
          >
            Join the waitlist
          </a>
        </div>

        <p className="font-mono text-xs text-muted-foreground/50">
          No account needed to start. Your video never leaves your device.
        </p>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card px-6 py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          <div className="space-y-2 text-center">
            <p className="font-mono text-xs tracking-widest text-primary uppercase">
              How it works
            </p>
            <h2 className="font-mono text-3xl font-bold text-foreground">
              Three steps. Real progress.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Meet your coach",
                body: "Pick a coach that matches your vibe. They'll be with you every session — warm, honest, and in your corner.",
              },
              {
                step: "02",
                title: "Speak on a topic",
                body: "Your coach gives you a prompt. You speak. No scripts, no rehearsals. Just you practicing being you.",
              },
              {
                step: "03",
                title: "See yourself improve",
                body: "After each session, your coach breaks down what went well and what to focus on next. Progress you can actually see.",
              },
            ].map((item) => (
              <div key={item.step} className="space-y-3">
                <p className="font-mono text-3xl font-bold text-primary/20">
                  {item.step}
                </p>
                <h3 className="font-mono text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          <div className="space-y-2 text-center">
            <p className="font-mono text-xs tracking-widest text-primary uppercase">
              Who it&apos;s for
            </p>
            <h2 className="font-mono text-3xl font-bold text-foreground">
              If the camera makes you nervous,
              <br />
              you&apos;re in the right place.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: "💼",
                title: "Job seekers",
                body: "Video interviews are unavoidable. Walk in ready.",
              },
              {
                icon: "📊",
                title: "Presenters",
                body: "Own the room — whether it's 5 people or 500.",
              },
              {
                icon: "🎥",
                title: "Content creators",
                body: "Show up on camera and actually enjoy it.",
              },
              {
                icon: "💻",
                title: "Remote workers",
                body: "Feel natural on Zoom, Meet, and Teams every day.",
              },
              {
                icon: "🙋",
                title: "Anyone, really",
                body: "Camera anxiety is more common than you think. You're not alone.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4"
              >
                <span className="mt-0.5 shrink-0 text-xl">{item.icon}</span>
                <div>
                  <p className="font-mono text-sm font-bold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section
        id="waitlist"
        className="border-t border-border bg-card px-6 py-20"
      >
        <div className="mx-auto max-w-lg space-y-8 text-center">
          <div className="space-y-3">
            <p className="font-mono text-xs tracking-widest text-primary uppercase">
              Waitlist
            </p>
            <h2 className="font-mono text-3xl font-bold text-foreground">
              Get early access.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Confidont is in beta. Join the waitlist and be among the first to
              get full access when we launch.
            </p>
          </div>
          <WaitlistForm />
          <p className="font-mono text-xs text-muted-foreground/50">
            No spam. Just one email when we&apos;re ready for you.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="font-mono text-sm font-bold text-primary">
            Confidont
          </span>
          <p className="font-mono text-xs text-muted-foreground">
            Your video never leaves your device.
          </p>
        </div>
      </footer>
    </div>
  )
}

// ── Waitlist form ──────────────────────────────

type FormState = "idle" | "loading" | "success" | "already" | "error"

function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!isValidEmail(trimmed)) return
    setFormState("loading")
    const result = await joinWaitlist(trimmed)
    if (!result.success) {
      setFormState("error")
      return
    }
    if (result.alreadyJoined) {
      setFormState("already")
      return
    }
    setFormState("success")
  }

  if (formState === "success") {
    return (
      <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8">
        <p className="text-2xl">🎉</p>
        <p className="font-mono font-bold text-foreground">
          You&apos;re on the list.
        </p>
        <p className="text-sm text-muted-foreground">
          We&apos;ll email you the moment early access opens.
        </p>
      </div>
    )
  }

  if (formState === "already") {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-card px-6 py-8">
        <p className="font-mono font-bold text-foreground">
          You&apos;re already on the list.
        </p>
        <p className="text-sm text-muted-foreground">
          We haven&apos;t forgotten about you.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="your@email.com"
          className="flex-1 rounded-full border border-border bg-background px-5 py-3 font-mono text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground/40 focus:border-primary"
        />
        <button
          onClick={handleSubmit}
          disabled={formState === "loading" || !isValidEmail(email.trim())}
          className={`shrink-0 rounded-full px-6 py-3 font-mono text-sm font-bold transition-all ${
            formState === "loading" || !isValidEmail(email.trim())
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {formState === "loading" ? "..." : "Join →"}
        </button>
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

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hasCompletedOnboarding } from "@/lib/storage/user"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WaitlistForm } from "@/components/landing"
import AuthModal from "@/components/auth/AuthModal"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const HOW_IT_WORKS = [
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
]

const WHO_IT_FOR = [
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
]

export default function LandingPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (authLoading) return
    
    const init = async () => {
      // Already authenticated with profile → go to home
      if (hasCompletedOnboarding()) {
        router.replace("/home")
        return
      }
      
      // Already authenticated but no local profile → recover from Supabase
      if (user) {
        router.replace("/home")
        return
      }
      
      // Not authenticated, no local profile → stay on landing
      // User will choose "Try it free" or "I already have an account"
    }
    
    init()
  }, [user, authLoading, router])

  const handleTryIt = () => {
    router.push("/onboarding")
  }

  const handleSignIn = () => {
    setShowAuthModal(true)
  }

  const handleAuthSuccess = async () => {
    setShowAuthModal(false)
    // /home will handle profile recovery
    router.push("/home")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-mono text-lg font-bold text-primary">
            Confidont
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleSignIn}
              size="sm"
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Button>
            <Button
              onClick={handleTryIt}
              size="sm"
              className="rounded-full px-5 font-mono text-xs"
            >
              Try it free →
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-20 pb-24 text-center">
        <Badge
          variant="outline"
          className="h-auto gap-2 rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 font-mono text-xs text-primary"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Beta — limited access
        </Badge>

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
          <Button
            onClick={handleTryIt}
            size="lg"
            className="w-full rounded-full px-8 font-mono sm:w-auto"
          >
            Try it free →
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleSignIn}
            className="w-full rounded-full px-8 font-mono sm:w-auto"
          >
            I already have an account
          </Button>
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          No account needed to start. Your video never leaves your device.
        </p>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card px-6 py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-12">
          <div className="flex flex-col gap-2 text-center">
            <p className="font-mono text-xs tracking-widest text-primary uppercase">
              How it works
            </p>
            <h2 className="font-mono text-3xl font-bold text-foreground">
              Three steps. Real progress.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <Card key={item.step} className="border-primary/10 bg-card/50">
                <CardHeader>
                  <p className="font-mono text-3xl font-bold text-primary/20">
                    {item.step}
                  </p>
                  <CardTitle className="font-mono text-base">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-12">
          <div className="flex flex-col gap-2 text-center">
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
            {WHO_IT_FOR.map((item) => (
              <Card key={item.title} className="flex items-start gap-4 p-4">
                <span className="mt-0.5 shrink-0 text-xl">{item.icon}</span>
                <div>
                  <CardTitle className="font-mono text-sm">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs leading-relaxed">
                    {item.body}
                  </CardDescription>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section
        id="waitlist"
        className="border-t border-border bg-card px-6 py-20"
      >
        <div className="mx-auto flex max-w-lg flex-col gap-8 text-center">
          <CardHeader>
            <p className="font-mono text-xs tracking-widest text-primary uppercase">
              Waitlist
            </p>
            <CardTitle className="font-mono text-3xl font-bold text-foreground">
              Get early access.
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Confidont is in beta. Join the waitlist and be among the first
              to get full access when we launch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WaitlistForm />
          </CardContent>
          <CardFooter className="justify-center">
            <p className="font-mono text-xs text-muted-foreground">
              No spam. Just one email when we&apos;re ready for you.
            </p>
          </CardFooter>
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

      {/* Auth modal for returning users */}
      {showAuthModal && (
        <AuthModal
          context="general"
          onDismiss={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  )
}

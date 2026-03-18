"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// ─────────────────────────────────────────────
// AuthModal
//
// Bottom sheet sign-in — Google OAuth + magic link.
//
// After successful auth:
// 1. syncProgressFromSupabase() — pushes local
//    sessions up to Supabase
// 2. clearGuestSessionCount() — reset the counter
// 3. onSuccess() — caller closes modal / updates UI
//
// Copy varies by guestSessionCount:
// 1 session → "Keep this safe"
// 2+ sessions → "Don't lose your streak"
// ─────────────────────────────────────────────

interface AuthModalProps {
  onDismiss: () => void
  onSuccess?: () => void
  context?: "save" | "general"
  guestSessionCount?: number
}

type ModalState = "idle" | "loading" | "magic-sent" | "error"

export default function AuthModal({
  onDismiss,
  context = "general",
  guestSessionCount = 0,
}: AuthModalProps) {
  const { signInWithGoogle, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState("")
  const [modalState, setModalState] = useState<ModalState>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleGoogle = async () => {
    setModalState("loading")
    await signInWithGoogle()
  }

  const handleMagicLink = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!isValidEmail(trimmed)) return
    setModalState("loading")
    const { error } = await signInWithMagicLink(trimmed)
    if (error) {
      setErrorMsg(error)
      setModalState("error")
      return
    }
    setModalState("magic-sent")
  }

  const { headline, subtext } = getCopy(context, guestSessionCount)

  return (
    <Drawer open onOpenChange={(open) => { if (!open) onDismiss() }}>
      <DrawerContent className="mx-auto max-w-lg px-6 pb-10">
        <DrawerHeader className="px-0 pt-2 pb-0">
          <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-border" />
        </DrawerHeader>

        <div className="space-y-5">
          {modalState === "magic-sent" ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-2xl">📬</p>
              <p className="font-mono font-bold text-foreground">
                Check your email.
              </p>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to{" "}
                <span className="text-foreground">{email}</span>. Click it to
                continue.
              </p>
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="mt-2 font-mono text-xs text-muted-foreground"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="font-mono text-base font-bold text-foreground">
                  {headline}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {subtext}
                </p>
              </div>

              <div className="space-y-3">
                {/* Google */}
                <Button
                  onClick={handleGoogle}
                  disabled={modalState === "loading"}
                  variant="outline"
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-border py-3.5 font-mono text-sm font-bold text-foreground hover:border-primary/40 hover:bg-primary/5"
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    or
                  </span>
                  <Separator className="flex-1" />
                </div>

                {/* Magic link */}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                    placeholder="your@email.com"
                    className="flex-1 rounded-full border border-border bg-background px-5 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary"
                  />
                  <Button
                    onClick={handleMagicLink}
                    disabled={
                      modalState === "loading" || !isValidEmail(email.trim())
                    }
                    className={`shrink-0 rounded-full px-5 py-3 font-mono text-sm font-bold transition-all ${
                      modalState === "loading" || !isValidEmail(email.trim())
                        ? "cursor-not-allowed bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {modalState === "loading" ? "..." : "→"}
                  </Button>
                </div>

                {modalState === "error" && errorMsg && (
                  <p className="text-center font-mono text-xs text-destructive">
                    {errorMsg}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] text-muted-foreground/50">
                  No password needed.
                </p>
                <Button
                  variant="ghost"
                  onClick={onDismiss}
                  className="font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground"
                >
                  Maybe later
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// ─────────────────────────────────────────────
// Copy by context + session count
// ─────────────────────────────────────────────

function getCopy(
  context: string,
  count: number
): { headline: string; subtext: string } {
  if (context === "save") {
    if (count >= 2) {
      return {
        headline: "Don't lose your streak.",
        subtext:
          "You've done the work. Sign in to keep your progress safe and pick up where you left off on any device.",
      }
    }
    return {
      headline: "Keep this safe.",
      subtext: "Sign in to save your progress across devices. Takes 5 seconds.",
    }
  }
  return {
    headline: "Create your account.",
    subtext: "Sign in to keep your progress safe and access it anywhere.",
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z"
        fill="#4285F4"
      />
      <path
        d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 01-2.72.76 4.79 4.79 0 01-4.5-3.32H.86v2.06A8 8 0 008 16z"
        fill="#34A853"
      />
      <path
        d="M3.5 9.5a4.8 4.8 0 010-3l-2.64-2.05a8 8 0 000 7.1L3.5 9.5z"
        fill="#FBBC05"
      />
      <path
        d="M8 3.18a4.33 4.33 0 013.06 1.2l2.3-2.3A7.7 7.7 0 008 0 8 8 0 00.86 4.45L3.5 6.5A4.79 4.79 0 018 3.18z"
        fill="#EA4335"
      />
    </svg>
  )
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

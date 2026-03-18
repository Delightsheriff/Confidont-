"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type Category = "bug" | "suggestion" | "general"

const CATEGORIES: { value: Category; label: string; hint: string }[] = [
  { value: "bug", label: "Bug", hint: "Something broke" },
  { value: "suggestion", label: "Idea", hint: "Make it better" },
  { value: "general", label: "General", hint: "Anything else" },
]

export default function BetaFeedback() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>("general")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [glowing, setGlowing] = useState(false)
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerGlow = () => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
    setGlowing(true)
    glowTimerRef.current = setTimeout(() => setGlowing(false), 3500)
  }

  // Glow on initial mount (page load)
  useEffect(() => {
    const t = setTimeout(triggerGlow, 800) // slight delay so page has settled
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Glow when session ends — SessionSummary dispatches this event
  useEffect(() => {
    const handler = () => triggerGlow()
    window.addEventListener("beta-feedback-glow", handler)
    return () => window.removeEventListener("beta-feedback-glow", handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
  }, [])

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      })

      if (!res.ok) throw new Error("Failed")

      toast("Feedback received — thank you.")
      setMessage("")
      setCategory("general")
      setOpen(false)
    } catch {
      toast.error("Couldn't send feedback. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => { setOpen(true); setGlowing(false) }}
        aria-label="Send beta feedback"
        className={`fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border bg-background/90 shadow-lg shadow-black/20 backdrop-blur-sm transition-all active:scale-95 ${
          glowing
            ? "border-primary/70 bg-primary/15 shadow-primary/30 hover:border-primary hover:bg-primary/20"
            : "border-primary/30 hover:border-primary/60 hover:bg-primary/10"
        }`}
      >
        {/* Glow pulse ring */}
        {glowing && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
        )}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`relative transition-colors duration-300 ${glowing ? "text-primary" : "text-primary"}`}>
          <path
            d="M14 1H2a1 1 0 00-1 1v8a1 1 0 001 1h4l2 3 2-3h4a1 1 0 001-1V2a1 1 0 00-1-1z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="5.5" cy="5.5" r="0.6" fill="currentColor" />
          <circle cx="8" cy="5.5" r="0.6" fill="currentColor" />
          <circle cx="10.5" cy="5.5" r="0.6" fill="currentColor" />
        </svg>
      </button>

      {/* Feedback drawer */}
      <Drawer open={open} onOpenChange={(o) => { if (!o && !submitting) setOpen(false) }}>
        <DrawerContent className="mx-auto max-w-lg px-6 pb-10">
          <DrawerHeader className="px-0 pt-2">
            <div className="mx-auto h-1 w-8 rounded-full bg-border" />
            <DrawerTitle className="mt-3 text-left font-mono text-base font-bold text-foreground">
              Beta feedback
            </DrawerTitle>
            <p className="text-left text-sm text-muted-foreground">
              Found something? Have an idea? We&apos;re listening.
            </p>
          </DrawerHeader>

          <div className="space-y-4">
            {/* Category selector */}
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                    category === c.value
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <p className={`font-mono text-xs font-bold ${category === c.value ? "text-primary" : "text-foreground"}`}>
                    {c.label}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">{c.hint}</p>
                </button>
              ))}
            </div>

            {/* Message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened or what you'd change..."
              rows={4}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-0 disabled:opacity-50"
              disabled={submitting}
            />
            {message.length > 1800 && (
              <p className="text-right font-mono text-[10px] text-muted-foreground">
                {2000 - message.length} chars left
              </p>
            )}
          </div>

          <DrawerFooter className="px-0 pt-4 space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || submitting}
              className="w-full rounded-full"
            >
              {submitting ? <Spinner className="size-4" /> : "Send feedback"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="w-full font-mono text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}

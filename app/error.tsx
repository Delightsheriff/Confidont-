"use client"

// app/error.tsx
// Global error boundary — catches unhandled runtime errors

import { useRouter } from "next/navigation"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  const router = useRouter()

  // Error boundaries render once per caught error — safe to log inline.
  // useEffect would be equivalent but adds unnecessary indirection here.
  console.error("[Confidont error]", error)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-foreground">
      {/* Glitch wordmark */}
      <div className="space-y-1 text-center select-none">
        <p className="font-mono text-[10px] tracking-[0.3em] text-primary/60 uppercase">
          Confidont
        </p>
        <div className="relative">
          <h1 className="font-mono text-6xl leading-none font-bold text-foreground/10">
            error
          </h1>
          <h1
            className="absolute inset-0 font-mono text-6xl leading-none font-bold text-primary"
            style={{ clipPath: "inset(0 0 60% 0)" }}
          >
            error
          </h1>
          <h1
            className="absolute inset-0 font-mono text-6xl leading-none font-bold text-foreground"
            style={{ clipPath: "inset(40% 0 0 0)" }}
          >
            error
          </h1>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <p className="font-mono text-sm font-bold text-foreground">
            Something broke.
          </p>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            An unexpected error occurred. Your progress is safe — this is on us,
            not you.
          </p>
        </div>

        {/* Error digest for debugging */}
        {error.digest && (
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="font-mono text-[10px] text-muted-foreground/50">
              ref: {error.digest}
            </p>
          </div>
        )}

        <div className="space-y-2 pt-1">
          <button
            onClick={reset}
            className="w-full rounded-full bg-primary py-3 font-mono text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-full border border-border py-3 font-mono text-sm font-bold text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}

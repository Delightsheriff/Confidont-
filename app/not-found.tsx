"use client"

// app/not-found.tsx
// 404 — shown when a route doesn't exist

import { useRouter } from "next/navigation"

export default function NotFoundPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-foreground">
      {/* Large 404 */}
      <div className="space-y-2 text-center select-none">
        <p className="font-mono text-[10px] tracking-[0.3em] text-primary/60 uppercase">
          Confidont
        </p>
        <div className="relative">
          {/* Background layer */}
          <p className="font-mono text-[120px] leading-none font-bold text-foreground/5">
            404
          </p>
          {/* Foreground — partial reveal */}
          <p
            className="absolute inset-0 font-mono text-[120px] leading-none font-bold text-primary"
            style={{ clipPath: "inset(0 0 55% 0)" }}
          >
            404
          </p>
          {/* Floating label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 font-mono text-xs text-primary">
              page not found
            </span>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <p className="font-mono text-sm font-bold text-foreground">
            Nothing here.
          </p>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have
            moved.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-full bg-primary py-3 font-mono text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
          >
            Back to home
          </button>
          <button
            onClick={() => router.back()}
            className="w-full rounded-full border border-border py-3 font-mono text-sm font-bold text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}

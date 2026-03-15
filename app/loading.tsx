// app/loading.tsx
// Global loading state — shown during route transitions and suspense boundaries

"use client"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      {/* Wordmark */}
      <div className="relative">
        <span className="font-mono text-xl font-bold text-primary opacity-60 select-none">
          Confidont
        </span>
        {/* Scanning line */}
        <div className="absolute -bottom-1 left-0 h-px w-full overflow-hidden bg-primary/30">
          <div className="h-full w-1/3 animate-[scan_1.2s_ease-in-out_infinite] bg-primary" />
        </div>
      </div>

      {/* Dot trail */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 w-1 rounded-full bg-primary"
            style={{
              animation: `pulse 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
              opacity: 0.3,
            }}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-foreground">
      <div className="space-y-2 text-center">
        <h1 className="font-mono text-2xl font-bold text-primary">Confidont</h1>
        <p className="font-mono text-base text-foreground">
          Something went wrong during sign-in.
        </p>
        <p className="font-mono text-sm text-muted-foreground">
          This can happen if the link expired or was already used.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="rounded-full px-6 font-mono"
        >
          Back to home
        </Button>
        <Button
          onClick={() => router.push("/")}
          className="rounded-full px-6 font-mono"
        >
          Try again
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import JourneyMap from "@/components/home/JourneyMap"
import { hasCompletedOnboarding } from "@/lib/storage/user"

// ─────────────────────────────────────────────
// /home page
//
// Gate: redirect to onboarding if no profile.
// Otherwise render the journey map.
// ─────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      router.replace("/onboarding")
    }
  }, [router])

  return <JourneyMap />
}

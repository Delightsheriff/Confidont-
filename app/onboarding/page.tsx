"use client"

import { useRouter } from "next/navigation"
import { Onboarding } from "@/components/onboarding"
import { hasCompletedOnboarding } from "@/lib/storage/user"

export default function OnboardingPage() {
  const router = useRouter()

  // Guard: already onboarded → go to home
  if (hasCompletedOnboarding()) {
    router.replace("/home")
    return null
  }

  return <Onboarding onComplete={() => router.push("/home")} />
}

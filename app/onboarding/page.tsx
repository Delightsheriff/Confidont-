"use client"

import Onboarding from "@/components/onboarding/onboarding"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()

  return <Onboarding onComplete={() => router.push("/home")} />
}

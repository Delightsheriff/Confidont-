"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Onboarding } from "@/components/onboarding"
import { hasCompletedOnboarding, getProfileFromSupabase } from "@/lib/storage/user"
import { Spinner } from "@/components/ui/spinner"

export default function OnboardingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const guard = async () => {
      // Fast path: localStorage profile means they onboarded as a guest
      if (hasCompletedOnboarding()) {
        router.replace("/home")
        return
      }
      // Slower path: auth users have localStorage cleared — check Supabase
      const supabaseProfile = await getProfileFromSupabase()
      if (supabaseProfile) {
        router.replace("/home")
        return
      }
      setChecking(false)
    }
    guard()
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-5" />
      </div>
    )
  }

  return <Onboarding onComplete={() => router.push("/home")} />
}

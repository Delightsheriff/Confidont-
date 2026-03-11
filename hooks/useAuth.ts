"use client"

import { useEffect, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { syncProgressFromSupabase } from "@/lib/storage/session"
import {
  clearGuestSessionCount,
  getGuestSessionCount,
} from "@/lib/storage/guestSessions"

export interface UseAuthReturn {
  user: User | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Post-auth sync — handles both Google OAuth (flag) and magic link (guest count)
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const postAuthFlag = sessionStorage.getItem("confidont_post_auth_sync")
      const guestCount = getGuestSessionCount()

      if (postAuthFlag || guestCount > 0) {
        if (postAuthFlag) sessionStorage.removeItem("confidont_post_auth_sync")
        syncProgressFromSupabase().then(() => clearGuestSessionCount())
      }
    }
  }, [user])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }, [supabase])

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { error: error?.message ?? null }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  return { user, isLoading, signInWithGoogle, signInWithMagicLink, signOut }
}

"use client"

// ─────────────────────────────────────────────
// hooks/useAuth.ts
//
// Auth state and actions for client components.
//
// Returns:
// - user — current Supabase user or null
// - isLoading — auth state resolving
// - signInWithGoogle()
// - signInWithMagicLink(email)
// - signOut()
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { browser } from "@/lib/supabase/client"

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
  const supabase = browser()

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

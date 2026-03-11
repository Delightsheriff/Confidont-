"use client"

// ─────────────────────────────────────────────
// hooks/useAuth.ts
// ─────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { pushProfileToSupabase } from "@/lib/storage/user"
import { syncProgressFromSupabase } from "@/lib/storage/session"
import { clearGuestSessionCount } from "@/lib/storage/guestSessions"

export interface UseAuthReturn {
  user:                User | null
  isLoading:           boolean
  signInWithGoogle:    () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut:             () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user,      setUser]      = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Post-auth sync — fires once when user transitions null → authenticated
  // Pushes locally saved profile + sessions up to Supabase
  const prevUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      prevUserRef.current = null
      return
    }
    // Only fire on the transition, not on every render
    if (prevUserRef.current === user.id) return
    prevUserRef.current = user.id

    Promise.all([
      pushProfileToSupabase(),
      syncProgressFromSupabase(),
    ])
      .then(() => clearGuestSessionCount())
      .catch(console.error)
  }, [user])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }, [supabase])

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  return { user, isLoading, signInWithGoogle, signInWithMagicLink, signOut }
}

"use client"

import { createContext, useContext, useEffect, useState, useMemo, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { pushProfileToSupabase, clearProfile } from "@/lib/storage/user"
import { syncProgressFromSupabase, clearProgress } from "@/lib/storage/session"
import { clearGuestSessionCount } from "@/lib/storage/guestSessions"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export type UseAuthReturn = AuthContextValue

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

interface AuthProviderProps {
  children: React.ReactNode
  initialUser: User | null
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const [isInitialized, setIsInitialized] = useState(!!initialUser)
  const supabase = useMemo(() => createClient(), [])
  const prevUserRef = useRef<string | null>(initialUser?.id ?? null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user && initialUser) {
        setUser(null)
      }
      setIsLoading(false)
      setIsInitialized(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
        setIsInitialized(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, initialUser])

  useEffect(() => {
    if (!user) {
      prevUserRef.current = null
      return
    }
    if (prevUserRef.current === user.id) return
    prevUserRef.current = user.id

    pushProfileToSupabase()
      .then(() => syncProgressFromSupabase())
      .then(() => clearGuestSessionCount())
      .catch(console.error)
  }, [user])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    clearProfile()
    clearProgress()
    clearGuestSessionCount()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isInitialized,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

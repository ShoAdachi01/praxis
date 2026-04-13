import { useState, useEffect, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase'

function normalizeSupabaseError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch' || /fetch failed/i.test(error.message)) {
      return 'cannot reach backend'
    }
    return error.message || fallback
  }

  if (error && typeof error === 'object' && 'status' in error && error.status === 0) {
    return 'cannot reach backend'
  }

  return fallback
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessingCallback, setIsProcessingCallback] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('code')
  })

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setAuthError(null)
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email)
        } else {
          setLoading(false)
        }
      } catch (error) {
        setAuthError(normalizeSupabaseError(error, 'unable to initialize auth'))
        setLoading(false)
      } finally {
        // If there's no PKCE callback in progress, clear the flag immediately.
        // When there IS a callback, onAuthStateChange will clear it after the
        // code exchange and replaceState are complete.
        if (!new URLSearchParams(window.location.search).has('code')) {
          setIsProcessingCallback(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setAuthError(null)
          setSession(session)
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchProfile(session.user.id, session.user.email)
          } else {
            setProfile(null)
            setLoading(false)
          }
        } finally {
          // Auth callback (PKCE code exchange + replaceState) is complete
          setIsProcessingCallback(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      setProfileError(null)
      console.log('[useAuth] fetchProfile called', { userId, email })

      // Try to fetch existing profile
      // Wrap in a timeout so the UI never hangs forever
      // (e.g. if an RLS policy causes a recursive/hanging query)
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      let { data, error } = await Promise.race([
        query.then(res => res),
        new Promise<{ data: null; error: { message: string; code: string } }>((resolve) =>
          setTimeout(() => resolve({
            data: null,
            error: { message: 'profile query timed out', code: 'TIMEOUT' },
          }), 10000)
        ),
      ])

      console.log('[useAuth] fetch result', { data, error, errorCode: error?.code })

      // If no profile exists, create one (handles pre-migration users)
      if (error?.code === 'PGRST116' && email) {
        console.log('[useAuth] No profile found, creating one...')
        const displayInitial = email.charAt(0).toUpperCase()
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            display_initial: displayInitial,
          })
          .select()
          .single()

        console.log('[useAuth] insert result', { newProfile, insertError })

        if (!insertError && newProfile) {
          data = newProfile
          error = null
        } else if (insertError) {
          // Propagate insert failure so the else branch below catches it
          error = insertError
        }
      }

      if (!error && data) {
        console.log('[useAuth] Setting profile', data)
        setProfile(data)
      } else {
        // Profile fetch/create failed — surface the error to the UI
        // so it can offer retry/sign-out instead of infinite loading
        console.error('[useAuth] Profile fetch failed:', error)
        setProfileError(error?.message ?? 'unable to load profile')
      }
    } catch (err) {
      // Handle thrown exceptions (network failures, CORS errors, offline)
      // that bypass the Supabase error-return pattern
        console.error('[useAuth] Profile fetch threw:', err)
      setProfileError(err instanceof Error ? err.message : 'unable to load profile')
    } finally {
      setLoading(false)
    }
  }

  const retryProfile = useCallback(async () => {
    if (!user) return
    setLoading(true)
    await fetchProfile(user.id, user.email ?? undefined)
  }, [user])

  const signInWithEmail = useCallback(async (email: string) => {
    try {
      setAuthError(null)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      return { error: error ? new Error(normalizeSupabaseError(error, 'unable to send email')) : null }
    } catch (error) {
      return { error: new Error(normalizeSupabaseError(error, 'unable to send email')) }
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
    setProfileError(null)
    setAuthError(null)
  }, [])

  // Bypass login with real Supabase auth
  // Set VITE_BYPASS_1_CODE, VITE_BYPASS_1_EMAIL, VITE_BYPASS_1_PASSWORD, etc. in Vercel
  const devSignIn = useCallback(async (code: string): Promise<boolean> => {
    const bypassUsers: Record<string, { email: string; password: string }> = {}

    const bypass1Code = import.meta.env.VITE_BYPASS_1_CODE
    const bypass1Email = import.meta.env.VITE_BYPASS_1_EMAIL
    const bypass1Password = import.meta.env.VITE_BYPASS_1_PASSWORD

    const bypass2Code = import.meta.env.VITE_BYPASS_2_CODE
    const bypass2Email = import.meta.env.VITE_BYPASS_2_EMAIL
    const bypass2Password = import.meta.env.VITE_BYPASS_2_PASSWORD

    if (bypass1Code && bypass1Email && bypass1Password) {
      bypassUsers[bypass1Code] = { email: bypass1Email, password: bypass1Password }
    }
    if (bypass2Code && bypass2Email && bypass2Password) {
      bypassUsers[bypass2Code] = { email: bypass2Email, password: bypass2Password }
    }

    const bypassUser = bypassUsers[code]
    if (!bypassUser) return false

    try {
      setAuthError(null)
      const { error } = await supabase.auth.signInWithPassword({
        email: bypassUser.email,
        password: bypassUser.password,
      })

      if (error) {
        setAuthError(normalizeSupabaseError(error, 'unable to sign in'))
        return false
      }

      return true
    } catch (error) {
      setAuthError(normalizeSupabaseError(error, 'unable to sign in'))
      return false
    }
  }, [])

  return {
    session,
    user,
    profile,
    profileError,
    authError,
    loading,
    isProcessingCallback,
    signInWithEmail,
    signOut,
    devSignIn,
    retryProfile,
  }
}

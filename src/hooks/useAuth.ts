import { useState, useEffect, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      console.log('[useAuth] fetchProfile called', { userId, email })

      // Try to fetch existing profile
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

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
        }
      }

      if (!error && data) {
        console.log('[useAuth] Setting profile', data)
        setProfile(data)
      } else if (error && error.code !== 'PGRST116') {
        // Profile fetch failed with unexpected error (auth expired, network, RLS, etc.)
        // Sign out to allow fresh login instead of getting stuck on loading screen
        console.error('[useAuth] Profile fetch failed, signing out:', error)
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setProfile(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
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

    const { error } = await supabase.auth.signInWithPassword({
      email: bypassUser.email,
      password: bypassUser.password,
    })

    return !error
  }, [])

  return {
    session,
    user,
    profile,
    loading,
    signInWithEmail,
    signOut,
    devSignIn,
  }
}

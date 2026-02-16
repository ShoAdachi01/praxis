import { useState, useEffect, useCallback } from 'react'
import { supabase, SocialConnection } from '@/lib/supabase'

const X_AUTHORIZE_URL = 'https://twitter.com/i/oauth2/authorize'
const X_SCOPES = 'tweet.read tweet.write users.read offline.access'

/** Generate a random string for PKCE code_verifier */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Derive SHA-256 code_challenge from code_verifier */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function useXConnection(userId: string | undefined) {
  const [connection, setConnection] = useState<SocialConnection | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch current connection status
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    supabase
      .from('my_social_connections')
      .select('*')
      .eq('provider', 'x')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setConnection(data)
        setLoading(false)
      })
  }, [userId])

  // Initiate X OAuth PKCE flow
  const connectX = useCallback(async () => {
    const clientId = import.meta.env.VITE_X_CLIENT_ID
    if (!clientId) {
      console.error('VITE_X_CLIENT_ID not set')
      return
    }

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = crypto.randomUUID()
    const redirectUri = `${window.location.origin}/connect/x/callback`

    // Store for callback
    sessionStorage.setItem('x_code_verifier', codeVerifier)
    sessionStorage.setItem('x_oauth_state', state)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: X_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    window.location.href = `${X_AUTHORIZE_URL}?${params.toString()}`
  }, [])

  // Exchange auth code for tokens (called from callback route)
  const exchangeCode = useCallback(async (code: string): Promise<{ username: string } | null> => {
    const codeVerifier = sessionStorage.getItem('x_code_verifier')
    if (!codeVerifier) return null

    const redirectUri = `${window.location.origin}/connect/x/callback`

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const res = await supabase.functions.invoke('exchange-x-token', {
      body: { code, code_verifier: codeVerifier, redirect_uri: redirectUri },
    })

    // Clean up
    sessionStorage.removeItem('x_code_verifier')
    sessionStorage.removeItem('x_oauth_state')

    if (res.error || !res.data?.connected) return null

    // Refresh connection state
    const { data } = await supabase
      .from('my_social_connections')
      .select('*')
      .eq('provider', 'x')
      .maybeSingle()

    if (data) setConnection(data)

    return { username: res.data.username }
  }, [])

  // Toggle auto_publish
  const toggleAutoPublish = useCallback(async () => {
    if (!connection) return

    const newValue = !connection.auto_publish

    const { error } = await supabase
      .from('social_accounts')
      .update({ auto_publish: newValue })
      .eq('id', connection.id)

    if (!error) {
      setConnection((prev) => prev ? { ...prev, auto_publish: newValue } : null)
    }
  }, [connection])

  // Publish a stone to X (fire-and-forget)
  const publishStone = useCallback(async (text: string) => {
    if (!connection?.auto_publish) return

    supabase.functions.invoke('publish-to-x', {
      body: { text },
    }).catch((err) => {
      console.error('publish-to-x failed:', err)
    })
  }, [connection?.auto_publish])

  return {
    connection,
    loading,
    connectX,
    exchangeCode,
    toggleAutoPublish,
    publishStone,
  }
}

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient } from '../_shared/supabase.ts'
import { postTweet, refreshAccessToken } from '../_shared/x-api.ts'

/** Buffer before actual expiry to trigger proactive refresh */
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ published: false, reason: 'Missing authorization header' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userClient = createUserClient(authHeader)
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ published: false, reason: 'Invalid token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Parse request body
    const { text } = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ published: false, reason: 'Missing text' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Read user's X tokens via service_role (bypasses RLS)
    const serviceClient = createServiceClient()
    const { data: account, error: fetchError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'x')
      .single()

    if (fetchError || !account) {
      return new Response(
        JSON.stringify({ published: false, reason: 'X account not connected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 4. Check auto_publish server-side
    if (!account.auto_publish) {
      return new Response(
        JSON.stringify({ published: false, reason: 'Auto-publish is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 5. Refresh token if it expires within the buffer window
    let accessToken = account.access_token

    if (account.token_expires_at && account.refresh_token) {
      const expiresAt = new Date(account.token_expires_at).getTime()
      const needsRefresh = expiresAt - Date.now() < REFRESH_BUFFER_MS

      if (needsRefresh) {
        try {
          const tokens = await refreshAccessToken(account.refresh_token)
          accessToken = tokens.access_token

          // Update stored tokens
          await serviceClient
            .from('social_accounts')
            .update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token ?? account.refresh_token,
              token_expires_at: tokens.expires_in
                ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
                : account.token_expires_at,
            })
            .eq('id', account.id)
        } catch (refreshErr) {
          console.error('Token refresh failed:', refreshErr)
          return new Response(
            JSON.stringify({ published: false, reason: 'Token refresh failed — reconnect X account' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }
    }

    // 6. Post tweet
    await postTweet(accessToken, text)

    return new Response(
      JSON.stringify({ published: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('publish-to-x error:', err)
    // Always return 200 — this is fire-and-forget
    return new Response(
      JSON.stringify({ published: false, reason: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient } from '../_shared/supabase.ts'
import { exchangeCodeForTokens, getXUser } from '../_shared/x-api.ts'

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
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userClient = createUserClient(authHeader)
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Parse request body
    const { code, code_verifier, redirect_uri } = await req.json()

    if (!code || !code_verifier || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code, code_verifier, redirect_uri' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, code_verifier, redirect_uri)

    // 4. Fetch X user profile
    const xUser = await getXUser(tokens.access_token)

    // 5. Upsert into social_accounts (service_role bypasses RLS)
    const serviceClient = createServiceClient()
    const { error: upsertError } = await serviceClient
      .from('social_accounts')
      .upsert(
        {
          user_id: user.id,
          provider: 'x',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          provider_user_id: xUser.id,
          provider_username: xUser.username,
          auto_publish: false,
        },
        { onConflict: 'user_id,provider' },
      )

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 6. Return success (no tokens in response)
    return new Response(
      JSON.stringify({ connected: true, username: xUser.username }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('exchange-x-token error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token'
const TWEET_URL = 'https://api.twitter.com/2/tweets'
const USER_URL = 'https://api.twitter.com/2/users/me'

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

type XUser = {
  id: string
  username: string
}

/** Exchange an OAuth authorization code for tokens using PKCE */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const clientId = Deno.env.get('X_CLIENT_ID')!

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${body}`)
  }

  return res.json()
}

/** Refresh an expired access token */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const clientId = Deno.env.get('X_CLIENT_ID')!

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token refresh failed (${res.status}): ${body}`)
  }

  return res.json()
}

/** Fetch the authenticated user's X profile */
export async function getXUser(accessToken: string): Promise<XUser> {
  const res = await fetch(USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to fetch X user (${res.status}): ${body}`)
  }

  const json = await res.json()
  return json.data as XUser
}

/** Post a tweet */
export async function postTweet(
  accessToken: string,
  text: string,
): Promise<{ id: string }> {
  const res = await fetch(TWEET_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tweet failed (${res.status}): ${body}`)
  }

  const json = await res.json()
  return json.data
}

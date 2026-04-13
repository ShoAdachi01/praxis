import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

function normalizePartnerError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch' || /fetch failed/i.test(error.message)) {
      return 'cannot reach backend'
    }
    return error.message || fallback
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message || fallback
  }

  return fallback
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function usePartner(userId: string | undefined) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInvite = useCallback(async () => {
    if (!userId) return null

    setLoading(true)
    setError(null)
    try {
      const code = generateInviteCode()

      const { data, error: err } = await supabase
        .from('invites')
        .insert({
          code,
          created_by: userId,
        })
        .select()
        .single()

      if (err) {
        setError(normalizePartnerError(err, 'could not create invite'))
        return null
      }

      return data
    } catch (error) {
      setError(normalizePartnerError(error, 'could not create invite'))
      return null
    } finally {
      setLoading(false)
    }
  }, [userId])

  const claimInvite = useCallback(async (code: string) => {
    if (!userId) return false

    setLoading(true)
    setError(null)

    try {
      const { error: claimError } = await supabase.rpc('claim_invite', {
        invite_code: code.toUpperCase(),
      })

      if (claimError) {
        console.error('[usePartner] claim_invite failed:', claimError)
        setError(normalizePartnerError(claimError, 'could not connect accounts'))
        return false
      }

      return true
    } catch (error) {
      setError(normalizePartnerError(error, 'could not connect accounts'))
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  return {
    createInvite,
    claimInvite,
    loading,
    error,
  }
}

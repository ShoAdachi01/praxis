import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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

    const code = generateInviteCode()

    const { data, error: err } = await supabase
      .from('invites')
      .insert({
        code,
        created_by: userId,
      })
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError('Could not create invite')
      return null
    }

    return data
  }, [userId])

  const claimInvite = useCallback(async (code: string) => {
    if (!userId) return false

    setLoading(true)
    setError(null)

    // Find the invite
    const { data: invite, error: findError } = await supabase
      .from('invites')
      .select('*')
      .eq('code', code.toUpperCase())
      .is('claimed_by', null)
      .single()

    if (findError || !invite) {
      setError('Invalid or already used invite')
      setLoading(false)
      return false
    }

    // Can't claim your own invite
    if (invite.created_by === userId) {
      setError('Cannot use your own invite')
      setLoading(false)
      return false
    }

    // Link both users as partners
    const { error: linkError } = await supabase.rpc('link_partners', {
      user_a: userId,
      user_b: invite.created_by,
    })

    if (linkError) {
      console.error('[usePartner] link_partners failed:', linkError)
      setError('Could not connect accounts')
      setLoading(false)
      return false
    }

    // Mark invite as claimed
    await supabase
      .from('invites')
      .update({ claimed_by: userId })
      .eq('id', invite.id)

    setLoading(false)
    return true
  }, [userId])

  return {
    createInvite,
    claimInvite,
    loading,
    error,
  }
}

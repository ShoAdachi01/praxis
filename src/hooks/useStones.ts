import { useState, useEffect, useCallback } from 'react'
import { supabase, Stone } from '@/lib/supabase'

export function useStones(userId: string | undefined, partnerId: string | null) {
  const [myStones, setMyStones] = useState<Stone[]>([])
  const [partnerStones, setPartnerStones] = useState<Stone[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch stones on mount and when user changes
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchStones = async () => {
      // Fetch my stones
      const { data: mine } = await supabase
        .from('stones')
        .select('*')
        .eq('user_id', userId)
        .order('placed_at', { ascending: false })

      if (mine) setMyStones(mine)

      // Fetch partner's stones if linked
      if (partnerId) {
        const { data: theirs } = await supabase
          .from('stones')
          .select('*')
          .eq('user_id', partnerId)
          .order('placed_at', { ascending: false })

        if (theirs) setPartnerStones(theirs)
      }

      setLoading(false)
    }

    fetchStones()

    // Subscribe to realtime changes
    const myChannel = supabase
      .channel('my-stones')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stones',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newStone = payload.new as Stone
          setMyStones(prev => {
            // Avoid duplicates from optimistic update
            if (prev.some(s => s.id === newStone.id)) return prev
            return [newStone, ...prev]
          })
        }
      )
      .subscribe()

    let partnerChannel: ReturnType<typeof supabase.channel> | null = null

    if (partnerId) {
      partnerChannel = supabase
        .channel('partner-stones')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'stones',
            filter: `user_id=eq.${partnerId}`,
          },
          (payload) => {
            const newStone = payload.new as Stone
            setPartnerStones(prev => {
              // Avoid duplicates from optimistic update
              if (prev.some(s => s.id === newStone.id)) return prev
              return [newStone, ...prev]
            })
          }
        )
        .subscribe()
    }

    return () => {
      myChannel.unsubscribe()
      partnerChannel?.unsubscribe()
    }
  }, [userId, partnerId])

  const placeStone = useCallback(async (text: string) => {
    if (!userId || !text.trim()) return { error: new Error('Invalid input') }

    const { data, error } = await supabase
      .from('stones')
      .insert({
        user_id: userId,
        text: text.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      // Optimistically add to local state (realtime will also trigger)
      setMyStones(prev => [data, ...prev])
    }

    return { data, error }
  }, [userId])

  // Get today's stones only
  const todayStones = useCallback((stones: Stone[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return stones.filter(s => new Date(s.placed_at) >= today)
  }, [])

  return {
    myStones,
    partnerStones,
    myTodayStones: todayStones(myStones),
    partnerTodayStones: todayStones(partnerStones),
    loading,
    placeStone,
  }
}

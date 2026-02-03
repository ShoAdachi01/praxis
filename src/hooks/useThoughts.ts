import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, Thought } from '@/lib/supabase'

export function useThoughts(
  stoneIds: string[],
  userId: string | undefined,
  partnerId: string | null
) {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch thoughts for all accessible stones
  useEffect(() => {
    if (!userId || stoneIds.length === 0) {
      setLoading(false)
      return
    }

    const fetchThoughts = async () => {
      const { data } = await supabase
        .from('thoughts')
        .select('*')
        .in('stone_id', stoneIds)
        .order('created_at', { ascending: true })

      if (data) setThoughts(data)
      setLoading(false)
    }

    fetchThoughts()

    // Subscribe to realtime changes for new thoughts
    const channel = supabase
      .channel('thoughts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'thoughts',
        },
        (payload) => {
          const newThought = payload.new as Thought
          // Only add if it's for one of our stones and not already present
          if (stoneIds.includes(newThought.stone_id)) {
            setThoughts(prev => {
              // Avoid duplicates from optimistic update
              if (prev.some(t => t.id === newThought.id)) return prev
              return [...prev, newThought]
            })
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, partnerId, stoneIds.join(',')])

  // Group thoughts by stone_id for easy access
  const thoughtsByStone = useMemo(() => {
    const map = new Map<string, Thought[]>()
    for (const thought of thoughts) {
      const existing = map.get(thought.stone_id) || []
      map.set(thought.stone_id, [...existing, thought])
    }
    return map
  }, [thoughts])

  const addThought = useCallback(async (stoneId: string, text: string) => {
    if (!userId || !text.trim()) {
      return { error: new Error('Invalid input') }
    }

    const { data, error } = await supabase
      .from('thoughts')
      .insert({
        stone_id: stoneId,
        user_id: userId,
        text: text.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      // Optimistically add to local state
      setThoughts(prev => [...prev, data])
    }

    return { data, error }
  }, [userId])

  return {
    thoughts,
    thoughtsByStone,
    loading,
    addThought,
  }
}

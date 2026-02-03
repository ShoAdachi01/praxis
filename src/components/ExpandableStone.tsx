import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stone, Thought } from '@/lib/supabase'
import { ThoughtInput } from './ThoughtInput'

interface ExpandableStoneProps {
  stone: Stone
  thoughts: Thought[]
  initial?: string
  userInitial: string
  partnerInitial?: string
  userId: string
  onAddThought: (stoneId: string, text: string) => Promise<{ error: Error | null }>
  animationDelay?: number
  direction?: 'up' | 'down'
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ExpandableStone({
  stone,
  thoughts,
  initial,
  userInitial,
  partnerInitial,
  userId,
  onAddThought,
  animationDelay = 0,
  direction = 'up',
}: ExpandableStoneProps) {
  const [expanded, setExpanded] = useState(false)
  const yOffset = direction === 'up' ? 30 : -30

  const getInitialForThought = (thought: Thought) => {
    if (thought.user_id === userId) return userInitial
    return partnerInitial || '?'
  }

  const handleAddThought = async (text: string) => {
    await onAddThought(stone.id, text)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: yOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: animationDelay,
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
        layout: { duration: 0.3 },
      }}
      className="text-center"
    >
      {/* Stone text - tappable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-center focus:outline-none"
      >
        <p className="intention-text leading-relaxed">
          {stone.text}
        </p>
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
          {initial && (
            <span className="font-medium">{initial}</span>
          )}
          <span>{formatRelativeTime(stone.placed_at)}</span>
          {thoughts.length > 0 && (
            <span className="opacity-60">
              {thoughts.length} {thoughts.length === 1 ? 'thought' : 'thoughts'}
            </span>
          )}
        </div>
      </button>

      {/* Expanded thoughts section */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-4 border-t border-[var(--text-muted)] border-opacity-10">
              {/* Existing thoughts */}
              {thoughts.length > 0 && (
                <div className="space-y-4 mb-6">
                  {thoughts.map((thought) => (
                    <motion.div
                      key={thought.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-left"
                    >
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {thought.text}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                        <span>{getInitialForThought(thought)}</span>
                        <span>{formatRelativeTime(thought.created_at)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Add thought input */}
              <div className="text-left">
                <ThoughtInput
                  onSubmit={handleAddThought}
                  autoFocus={thoughts.length === 0}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

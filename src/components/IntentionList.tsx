import { motion } from 'framer-motion'
import { Stone } from '@/lib/supabase'

interface IntentionListProps {
  stones: Stone[]
  initial?: string // display initial for the person
  direction?: 'up' | 'down' // animation direction
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

export function IntentionList({ stones, initial, direction = 'up' }: IntentionListProps) {
  const yOffset = direction === 'up' ? 30 : -30

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-12 px-8">
      <div className="max-w-md mx-auto space-y-8">
        {stones.map((stone, index) => (
          <motion.div
            key={stone.id}
            initial={{ opacity: 0, y: yOffset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.08,
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="text-center"
          >
            <p className="intention-text leading-relaxed">
              {stone.text}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
              {initial && (
                <span className="font-medium">{initial}</span>
              )}
              <span>{formatRelativeTime(stone.placed_at)}</span>
            </div>
          </motion.div>
        ))}

        {stones.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.3 }}
            className="text-center text-[var(--text-muted)] text-sm"
          >
            {direction === 'up' ? 'nothing yet' : 'quiet today'}
          </motion.p>
        )}
      </div>
    </div>
  )
}

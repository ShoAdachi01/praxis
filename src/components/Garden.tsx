import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IntentionInput } from './IntentionInput'
import { History } from './History'
import { EdgeTrigger } from './EdgeTrigger'
import { Stone, Profile, Thought } from '@/lib/supabase'

type GardenView = 'self' | 'history'

interface GardenProps {
  profile: Profile
  myStones: Stone[]
  partnerStones: Stone[]
  partnerInitial?: string
  onPlaceStone: (text: string) => Promise<{ error: Error | null }>
  hasPartner: boolean
  theme?: 'moss' | 'stone'
  thoughtsByStone: Map<string, Thought[]>
  onAddThought: (stoneId: string, text: string) => Promise<{ error: Error | null }>
  onToggleTheme?: () => void
}

const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

export function Garden({
  profile,
  myStones,
  partnerStones,
  partnerInitial,
  onPlaceStone,
  hasPartner,
  theme = 'stone',
  thoughtsByStone,
  onAddThought,
  onToggleTheme,
}: GardenProps) {
  const [view, setView] = useState<GardenView>('self')

  const handleSubmit = useCallback(async (text: string) => {
    await onPlaceStone(text)
  }, [onPlaceStone])

  // Total stone count for hint
  const totalStones = myStones.length + partnerStones.length

  return (
    <motion.div
      className="h-full w-full overflow-hidden grain space-self"
      animate={{
        backgroundColor: 'var(--bg-self)',
      }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Bottom edge trigger - history (all stones) */}
      {view === 'self' && (
        <EdgeTrigger
          position="bottom"
          onTrigger={() => setView('history')}
          hint={theme === 'stone' ? `${totalStones}` : undefined}
        />
      )}

      {/* Main content area */}
      <AnimatePresence mode="wait">
        {view === 'self' && (
          <motion.div
            key="self"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full flex flex-col items-center justify-center relative"
          >
            <IntentionInput onSubmit={handleSubmit} />

            {/* User initial badge - tap to toggle theme */}
            <motion.button
              onClick={onToggleTheme}
              whileTap={{ scale: 0.95 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--text-muted)',
                color: 'var(--bg-self)',
                opacity: 0.3,
              }}
              whileHover={{ opacity: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {profile?.display_initial}
            </motion.button>
          </motion.div>
        )}

        {view === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={springTransition}
            className="h-full relative"
          >
            <History
              myStones={myStones}
              partnerStones={partnerStones}
              thoughtsByStone={thoughtsByStone}
              userInitial={profile.display_initial}
              partnerInitial={partnerInitial}
              userId={profile.id}
              hasPartner={hasPartner}
              onAddThought={onAddThought}
              onSwipeUp={() => setView('self')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

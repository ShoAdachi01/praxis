import { useState, useRef } from 'react'
import { motion, PanInfo, useAnimation } from 'framer-motion'
import { Stone, Thought } from '@/lib/supabase'
import { ExpandableStone } from './ExpandableStone'
import { NavArrow } from './NavArrow'

interface HistoryProps {
  myStones: Stone[]
  partnerStones: Stone[]
  thoughtsByStone: Map<string, Thought[]>
  userInitial: string
  partnerInitial?: string
  userId: string
  hasPartner: boolean
  onAddThought: (stoneId: string, text: string) => Promise<{ error: Error | null }>
  onSwipeUp: () => void
}

export function History({
  myStones,
  partnerStones,
  thoughtsByStone,
  userInitial,
  partnerInitial,
  userId,
  hasPartner,
  onAddThought,
  onSwipeUp,
}: HistoryProps) {
  // 0 = my stones, 1 = partner's stones
  const [page, setPage] = useState(0)
  const controls = useAnimation()
  const containerRef = useRef<HTMLDivElement>(null)

  const pageWidth = typeof window !== 'undefined' ? window.innerWidth : 375

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50
    const velocityThreshold = 300

    // Horizontal swipe for pagination (only if has partner)
    if (hasPartner) {
      if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        // Swipe left - go to partner's page
        setPage(Math.min(1, page + 1))
      } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        // Swipe right - go to your page
        setPage(Math.max(0, page - 1))
      }
    }

    // Reset drag position
    controls.start({ x: 0 })
  }

  // Handle tap on back area
  const handleBackTap = () => {
    onSwipeUp()
  }

  return (
    <div className="h-full w-full overflow-hidden relative" ref={containerRef}>
      {/* Tap area to go back - at the top */}
      <button
        onClick={handleBackTap}
        className="absolute top-0 left-0 right-0 h-16 z-20"
        aria-label="Go back"
      />

      {/* Page indicator */}
      {hasPartner && (
        <div className="absolute top-4 left-0 right-0 z-10 flex justify-center gap-2 pointer-events-none">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--text-muted)' }}
            animate={{ opacity: page === 0 ? 0.6 : 0.2 }}
          />
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--text-muted)' }}
            animate={{ opacity: page === 1 ? 0.6 : 0.2 }}
          />
        </div>
      )}

      {/* Back hint - pill at top */}
      <motion.div
        className="absolute top-6 left-0 right-0 z-10 flex justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.5 }}
      >
        <div
          className="w-10 h-1 rounded-full"
          style={{ backgroundColor: 'var(--text-muted)' }}
        />
      </motion.div>

      {/* Swipeable content area */}
      <motion.div
        className="h-full"
        style={{ touchAction: 'pan-y' }}
        drag={hasPartner ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={controls}
      >
        {/* Horizontal sliding container */}
        <motion.div
          className="flex h-full"
          style={{ width: hasPartner ? pageWidth * 2 : pageWidth }}
          animate={{ x: -page * pageWidth }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Your stones page */}
          <div className="h-full flex-shrink-0" style={{ width: pageWidth }}>
            <StonesList
              stones={myStones}
              thoughtsByStone={thoughtsByStone}
              initial={userInitial}
              userInitial={userInitial}
              partnerInitial={partnerInitial}
              userId={userId}
              onAddThought={onAddThought}
              emptyMessage="nothing here yet"
            />
          </div>

          {/* Partner's stones page */}
          {hasPartner && (
            <div className="h-full flex-shrink-0" style={{ width: pageWidth }}>
              <StonesList
                stones={partnerStones}
                thoughtsByStone={thoughtsByStone}
                initial={partnerInitial}
                userInitial={userInitial}
                partnerInitial={partnerInitial}
                userId={userId}
                onAddThought={onAddThought}
                emptyMessage="quiet today"
              />
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Navigation arrows */}
      {/* Up arrow - back to garden (always visible) */}
      <div className="absolute top-14 left-0 right-0 z-10 flex justify-center">
        <NavArrow
          direction="up"
          visible={true}
          onClick={handleBackTap}
          label="Back to garden"
        />
      </div>

      {/* Left arrow - go to your stones (visible when on partner's page) */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
        <NavArrow
          direction="left"
          visible={hasPartner && page === 1}
          onClick={() => setPage(0)}
          label="View your stones"
        />
      </div>

      {/* Right arrow - go to partner's stones (visible when on your page) */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
        <NavArrow
          direction="right"
          visible={hasPartner && page === 0}
          onClick={() => setPage(1)}
          label="View partner's stones"
        />
      </div>
    </div>
  )
}

interface StonesListProps {
  stones: Stone[]
  thoughtsByStone: Map<string, Thought[]>
  initial?: string
  userInitial: string
  partnerInitial?: string
  userId: string
  onAddThought: (stoneId: string, text: string) => Promise<{ error: Error | null }>
  emptyMessage: string
}

function StonesList({
  stones,
  thoughtsByStone,
  initial,
  userInitial,
  partnerInitial,
  userId,
  onAddThought,
  emptyMessage,
}: StonesListProps) {
  return (
    <div className="h-full overflow-y-auto no-scrollbar py-16 px-8" style={{ touchAction: 'pan-y' }}>
      <div className="max-w-md mx-auto space-y-8">
        {stones.map((stone, index) => (
          <ExpandableStone
            key={stone.id}
            stone={stone}
            thoughts={thoughtsByStone.get(stone.id) || []}
            initial={initial}
            userInitial={userInitial}
            partnerInitial={partnerInitial}
            userId={userId}
            onAddThought={onAddThought}
            animationDelay={index * 0.08}
          />
        ))}

        {stones.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.3 }}
            className="text-center text-[var(--text-muted)] text-sm"
          >
            {emptyMessage}
          </motion.p>
        )}
      </div>
    </div>
  )
}

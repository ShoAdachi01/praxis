import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface EdgeTriggerProps {
  position: 'top' | 'bottom'
  onTrigger: () => void
  hint?: ReactNode // Optional visual hint
  active?: boolean
}

export function EdgeTrigger({ position, onTrigger, hint, active }: EdgeTriggerProps) {
  const isTop = position === 'top'

  return (
    <motion.button
      onClick={onTrigger}
      className={`
        absolute left-0 right-0 z-10
        h-16 flex items-center justify-center
        ${isTop ? 'top-0 safe-area-top' : 'bottom-0 safe-area-bottom'}
      `}
      whileTap={{ scale: 0.98 }}
    >
      {/* Subtle glow on active state */}
      {active && (
        <motion.div
          className={`
            absolute inset-x-0 h-24
            ${isTop ? 'top-0 bg-gradient-to-b' : 'bottom-0 bg-gradient-to-t'}
            from-[var(--accent-self)] to-transparent
          `}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Visual hint content */}
      {hint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-[var(--text-muted)] text-xs"
        >
          {hint}
        </motion.div>
      )}
    </motion.button>
  )
}

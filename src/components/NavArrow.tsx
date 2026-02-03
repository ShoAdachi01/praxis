import { motion, AnimatePresence } from 'framer-motion'

type Direction = 'up' | 'down' | 'left' | 'right'

interface NavArrowProps {
  direction: Direction
  visible: boolean
  onClick: () => void
  className?: string
  label?: string
}

// SVG path data for chevron pointing right - we rotate for other directions
const chevronPath = "M9 18l6-6-6-6"

const rotations: Record<Direction, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
}

export function NavArrow({
  direction,
  visible,
  onClick,
  className = '',
  label
}: NavArrowProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          whileHover={{ opacity: 0.6 }}
          whileTap={{ scale: 0.9, opacity: 0.6 }}
          transition={{ duration: 0.2 }}
          onClick={onClick}
          className={`p-2.5 ${className}`}
          aria-label={label || `Navigate ${direction}`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: 'var(--text-muted)',
              transform: `rotate(${rotations[direction]}deg)`,
            }}
          >
            <path d={chevronPath} />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

import { motion, AnimatePresence } from 'framer-motion'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  initial: string
  theme: 'moss' | 'stone'
  onToggleTheme: () => void
  xUsername: string | null
  xAutoPublish: boolean
  xLoading: boolean
  onConnectX: () => void
  onToggleAutoPublish: () => void
}

export function SettingsPanel({
  open,
  onClose,
  initial,
  theme,
  onToggleTheme,
  xUsername,
  xAutoPublish,
  xLoading,
  onConnectX,
  onToggleAutoPublish,
}: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-12 pt-8 px-8 safe-area-bottom"
            style={{ background: 'var(--bg-self)' }}
          >
            {/* Initial badge */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-8"
              style={{
                backgroundColor: 'var(--text-self)',
                color: 'var(--bg-self)',
                opacity: 0.2,
              }}
            >
              {initial}
            </div>

            {/* X connection */}
            <div className="w-full max-w-xs mb-6">
              <p
                className="text-[10px] tracking-[0.2em] uppercase mb-3"
                style={{ opacity: 0.25 }}
              >
                x
              </p>

              {xLoading ? (
                <p className="text-xs" style={{ opacity: 0.3 }}>
                  loading...
                </p>
              ) : xUsername ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ opacity: 0.5 }}>
                    @{xUsername}
                  </span>
                  <button
                    onClick={onToggleAutoPublish}
                    className="relative w-8 h-[18px] rounded-full transition-colors duration-300"
                    style={{
                      backgroundColor: xAutoPublish
                        ? 'var(--accent-self)'
                        : 'var(--text-self)',
                      opacity: xAutoPublish ? 0.7 : 0.15,
                    }}
                  >
                    <motion.div
                      className="absolute top-[2px] w-[14px] h-[14px] rounded-full"
                      style={{ backgroundColor: 'var(--bg-self)' }}
                      animate={{ left: xAutoPublish ? 14 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onConnectX}
                  className="text-xs transition-opacity duration-300"
                  style={{ opacity: 0.35 }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.6')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.35')}
                >
                  connect →
                </button>
              )}
            </div>

            {/* Theme */}
            <div className="w-full max-w-xs mb-8">
              <p
                className="text-[10px] tracking-[0.2em] uppercase mb-3"
                style={{ opacity: 0.25 }}
              >
                theme
              </p>
              <div className="flex gap-4">
                <button
                  onClick={theme === 'stone' ? undefined : onToggleTheme}
                  className="text-xs transition-opacity duration-300"
                  style={{ opacity: theme === 'stone' ? 0.6 : 0.25 }}
                >
                  stone
                </button>
                <span className="text-xs" style={{ opacity: 0.15 }}>·</span>
                <button
                  onClick={theme === 'moss' ? undefined : onToggleTheme}
                  className="text-xs transition-opacity duration-300"
                  style={{ opacity: theme === 'moss' ? 0.6 : 0.25 }}
                >
                  moss
                </button>
              </div>
            </div>

            {/* Close hint */}
            <button
              onClick={onClose}
              className="text-[10px] transition-opacity duration-300"
              style={{ opacity: 0.15 }}
            >
              close
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

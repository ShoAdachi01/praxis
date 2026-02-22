import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AuthGateProps {
  onSignIn: (email: string) => Promise<{ error: Error | null }>
  onDevSignIn?: (code: string) => Promise<boolean>
}

export function AuthGate({ onSignIn, onDevSignIn }: AuthGateProps) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || loading) return

    setLoading(true)
    setError(null)

    // Bypass login: try bypass first, falls through if code doesn't match
    if (onDevSignIn) {
      const success = await onDevSignIn(email.trim())
      if (success) return // auth state change will handle the rest
      // If input looks like a bypass code (no @), show specific error
      if (!email.includes('@')) {
        setLoading(false)
        setError('invalid code')
        return
      }
    }

    // Simple email validation
    if (!email.includes('@')) {
      setLoading(false)
      setError('enter a valid email')
      return
    }

    const { error: signInError } = await onSignIn(email)
    setLoading(false)

    if (signInError) {
      setError('unable to send email')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 grain">
      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onSubmit={handleSubmit}
            className="w-full max-w-xs"
          >
            {/* Minimal input - just an underline, cursor is the only indicator */}
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-current
                       text-center py-3 text-lg font-light tracking-wide
                       focus:outline-none transition-colors duration-300"
              style={{ borderColor: 'currentColor', opacity: 0.2 }}
              autoFocus
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={loading}
            />

            {/* Submit is just pressing enter - no visible button needed */}
            <button type="submit" className="sr-only">
              Continue
            </button>

            {/* Subtle hint that appears after a moment */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ delay: 2, duration: 1 }}
              className="text-center text-xs mt-8"
            >
              enter your email
            </motion.p>

            {/* Error message */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-center text-xs mt-4"
                style={{ color: 'var(--text-muted)' }}
              >
                {error}
              </motion.p>
            )}
          </motion.form>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="intention-text opacity-50">
              check your email
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

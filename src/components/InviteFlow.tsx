import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface InviteFlowProps {
  onCreateInvite: () => Promise<{ code: string } | null>
  onClaimInvite: (code: string) => Promise<boolean>
  onSkip: () => void
}

export function InviteFlow({ onCreateInvite, onClaimInvite, onSkip }: InviteFlowProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [inviteCode, setInviteCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    const result = await onCreateInvite()
    setLoading(false)
    if (result) {
      setGeneratedCode(result.code)
      setMode('create')
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    setError('')
    const success = await onClaimInvite(inviteCode)
    setLoading(false)
    if (!success) {
      setError('invalid code')
    }
  }

  const handleCopy = async () => {
    const link = `${window.location.origin}/join/${generatedCode}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 grain">
      <AnimatePresence mode="wait">
        {mode === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-12"
          >
            <p className="intention-text text-[var(--text-muted)]">
              connect with someone?
            </p>

            <div className="space-y-4">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="block w-full py-3 text-sm tracking-wide
                         border-b border-[var(--border-subtle)]
                         hover:border-[var(--accent-self)] transition-colors"
              >
                create an invite
              </button>

              <button
                onClick={() => setMode('join')}
                className="block w-full py-3 text-sm tracking-wide
                         border-b border-[var(--border-subtle)]
                         hover:border-[var(--accent-self)] transition-colors"
              >
                join with code
              </button>

              <button
                onClick={onSkip}
                className="block w-full py-3 text-xs text-[var(--text-muted)]
                         hover:text-[var(--text-self)] transition-colors"
              >
                continue alone
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-8"
          >
            <p className="text-sm text-[var(--text-muted)]">
              share this link
            </p>

            <button
              onClick={handleCopy}
              className="intention-text tracking-widest"
            >
              {generatedCode}
            </button>

            <p className="text-xs text-[var(--text-muted)]">
              {copied ? 'copied' : 'tap to copy'}
            </p>

            <button
              onClick={onSkip}
              className="text-xs text-[var(--text-muted)]
                       hover:text-[var(--text-self)] transition-colors"
            >
              continue
            </button>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-8 w-full max-w-xs"
          >
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder=""
              maxLength={6}
              className="w-full bg-transparent border-0 border-b border-[var(--text-muted)]
                       text-center py-3 intention-text tracking-widest
                       focus:outline-none focus:border-[var(--accent-self)]
                       transition-colors uppercase"
              autoFocus
            />

            {error && (
              <p className="text-xs text-[var(--accent-self)]">{error}</p>
            )}

            <div className="flex justify-center gap-8">
              <button
                onClick={() => setMode('choose')}
                className="text-xs text-[var(--text-muted)]"
              >
                back
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || inviteCode.length < 6}
                className="text-xs disabled:opacity-30"
              >
                join
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

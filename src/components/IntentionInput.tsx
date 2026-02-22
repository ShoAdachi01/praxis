import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'

interface IntentionInputProps {
  onSubmit: (text: string) => void | Promise<void>
  maxLength?: number
}

export function IntentionInput({ onSubmit, maxLength = 140 }: IntentionInputProps) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [text])

  // Handle visual viewport resize (mobile keyboard)
  // When keyboard opens, scroll the input into view
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || !window.visualViewport) return

    const handleResize = () => {
      // Only scroll into view if this textarea is focused
      if (document.activeElement === textarea) {
        // Small delay to let the viewport settle
        requestAnimationFrame(() => {
          textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }
    }

    window.visualViewport.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim() && !submitting) {
        setSubmitting(true)
        const trimmed = text.trim()
        setText('')
        await onSubmit(trimmed)
        setSubmitting(false)
      }
    }
  }

  // Click anywhere in the container to focus - tap fallback for mobile
  const handleContainerClick = useCallback(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div
      className="relative w-full max-w-md mx-auto px-8 cursor-text"
      onClick={handleContainerClick}
    >
      <motion.div
        animate={{
          scale: focused ? 1.01 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="invisible-input min-h-[3rem] max-h-[50vh]"
          rows={1}
          autoFocus
        />
      </motion.div>

      {/* Subtle placeholder - appears when empty and unfocused */}
      {!text && !focused && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none text-center intention-text"
        >
          place a stone
        </motion.p>
      )}

      {/* Subtle character count - only when near limit */}
      {text.length > maxLength * 0.8 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs"
        >
          {maxLength - text.length}
        </motion.div>
      )}
    </div>
  )
}

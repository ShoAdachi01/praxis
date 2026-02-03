import { useState, useRef, useEffect, KeyboardEvent } from 'react'
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

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [text])

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

  return (
    <div className="relative w-full max-w-md mx-auto px-8">
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
        />
      </motion.div>

      {/* No indicator - the blinking cursor is enough */}

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

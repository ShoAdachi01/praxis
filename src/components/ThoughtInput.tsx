import { useState, useRef, useEffect } from 'react'

interface ThoughtInputProps {
  onSubmit: (text: string) => void | Promise<void>
  autoFocus?: boolean
}

export function ThoughtInput({ onSubmit, autoFocus = true }: ThoughtInputProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const maxLength = 280

  useEffect(() => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [text])

  const handleKeyDown = async (e: React.KeyboardEvent) => {
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
    <div className="relative">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent border-none outline-none resize-none
                 text-sm leading-relaxed placeholder-transparent"
        style={{
          color: 'var(--text-primary)',
          caretColor: 'var(--text-muted)',
        }}
        rows={1}
        placeholder=""
        autoFocus={autoFocus}
      />
      {text.length > maxLength * 0.8 && (
        <span
          className="absolute right-0 bottom-0 text-xs"
          style={{ color: 'var(--text-muted)', opacity: 0.5 }}
        >
          {maxLength - text.length}
        </span>
      )}
    </div>
  )
}

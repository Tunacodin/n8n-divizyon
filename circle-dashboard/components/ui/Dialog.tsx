'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'

const SIZE_CLASS: Record<DialogSize, string> = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-3xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
  '4xl': 'max-w-6xl',
  '5xl': 'max-w-7xl',
  full: 'max-w-[95vw]',
}

interface DialogProps {
  open: boolean
  onClose: () => void
  size?: DialogSize
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  showClose?: boolean
  className?: string
  contentClassName?: string
  children: ReactNode
}

/**
 * Centered modal popup with backdrop, ESC + body scroll lock.
 * Replaces the old right-slide-in drawer pattern across the app.
 */
export function Dialog({
  open,
  onClose,
  size = '3xl',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = true,
  className,
  contentClassName,
  children,
}: DialogProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) onClose()
    },
    [onClose, closeOnEscape]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [open, handleKey])

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn('fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6', className)}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              'relative w-full bg-card text-foreground rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col',
              'max-h-[90vh]',
              SIZE_CLASS[size],
              contentClassName
            )}
          >
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Kapat"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

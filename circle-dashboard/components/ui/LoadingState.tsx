'use client'

import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ label, className, size = 'md' }: LoadingStateProps) {
  const dim = size === 'sm' ? 'h-5 w-5 border-2' : size === 'lg' ? 'h-10 w-10 border-[3px]' : 'h-8 w-8 border-2'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 gap-3',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'animate-spin rounded-full border-muted border-t-primary',
          dim
        )}
      />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}

'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems?: number
  perPage?: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  perPage,
  onChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const goTo = (p: number) => onChange(Math.max(1, Math.min(totalPages, p)))

  const visible = pageWindow(page, totalPages)

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-3 border-t border-border',
        className
      )}
    >
      {totalItems !== undefined && perPage !== undefined ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalItems}</span> kayıttan{' '}
          <span className="font-semibold text-foreground">
            {(page - 1) * perPage + 1}
          </span>
          –
          <span className="font-semibold text-foreground">
            {Math.min(page * perPage, totalItems)}
          </span>{' '}
          arası
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sayfa <span className="font-semibold text-foreground">{page}</span> / <span className="font-semibold text-foreground">{totalPages}</span>
        </p>
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Önceki sayfa"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        {visible.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-2 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              className={cn(
                'h-8 min-w-[2rem] px-2 rounded-md text-xs font-medium transition-colors cursor-pointer',
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Sonraki sayfa"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function pageWindow(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const result: (number | '…')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) result.push('…')
  for (let p = start; p <= end; p++) result.push(p)
  if (end < totalPages - 1) result.push('…')
  result.push(totalPages)
  return result
}

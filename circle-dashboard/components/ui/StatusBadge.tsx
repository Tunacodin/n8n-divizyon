'use client'

import { cn } from '@/lib/utils'

export type StatusKey =
  | 'basvuru'
  | 'kontrol'
  | 'kesin_ret'
  | 'kesin_kabul'
  | 'nihai_olmayan'
  | 'nihai_uye'
  | 'etkinlik'
  | 'deaktive'
  | 'yas_kucuk'

export const STATUS_LABELS: Record<StatusKey, string> = {
  basvuru: 'Başvuru',
  kontrol: 'Kontrol',
  kesin_ret: 'Kesin Ret',
  kesin_kabul: 'Kesin Kabul',
  nihai_olmayan: 'Kesin Kabul',
  nihai_uye: 'Nihai Ağ Üyesi',
  etkinlik: 'Etkinlik',
  deaktive: 'Deaktive',
  yas_kucuk: '18 Yaş Altı',
}

const STATUS_CLASSES: Record<StatusKey, string> = {
  basvuru: 'bg-info/15 text-info',
  kontrol: 'bg-warning/15 text-warning',
  kesin_ret: 'bg-destructive/15 text-destructive',
  kesin_kabul: 'bg-success/15 text-success',
  nihai_olmayan: 'bg-success/15 text-success',
  nihai_uye: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  etkinlik: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  deaktive: 'bg-muted text-muted-foreground',
  yas_kucuk: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
}

export const STATUS_DOTS: Record<StatusKey, string> = {
  basvuru: 'bg-info',
  kontrol: 'bg-warning',
  kesin_ret: 'bg-destructive',
  kesin_kabul: 'bg-success',
  nihai_olmayan: 'bg-success',
  nihai_uye: 'bg-amber-500',
  etkinlik: 'bg-cyan-500',
  deaktive: 'bg-muted-foreground',
  yas_kucuk: 'bg-orange-500',
}

interface StatusBadgeProps {
  status: string
  className?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const key = (status as StatusKey) in STATUS_LABELS ? (status as StatusKey) : 'basvuru'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border border-transparent',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        STATUS_CLASSES[key],
        className
      )}
    >
      {STATUS_LABELS[key]}
    </span>
  )
}

interface MailStatusBadgeProps {
  sent: boolean
  className?: string
}

export function MailStatusBadge({ sent, className }: MailStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        sent ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
        className
      )}
    >
      {sent ? 'Gönderildi' : 'Bekliyor'}
    </span>
  )
}

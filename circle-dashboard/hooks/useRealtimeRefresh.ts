'use client'
import { useEffect, useRef } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

type Tables = Array<'applications' | 'task_completions' | 'inventory_tests' | 'warnings' | 'status_history'>

/**
 * Verilen tablolarda herhangi bir INSERT/UPDATE/DELETE olduğunda `onChange` tetiklenir.
 * Typical usage: çağrıcı onChange içinde fetch'i tekrar yapar.
 * Throttle: 500ms (aynı anda birden fazla event gelirse tek refresh)
 */
export function useRealtimeRefresh(tables: Tables, onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const client = getBrowserClient()
    const channel = client.channel(`rt-${tables.join('-')}-${Math.random().toString(36).slice(2, 8)}`)

    const fire = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onChangeRef.current(), 500)
    }

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        fire,
      )
    }

    channel.subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      client.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(',')])
}

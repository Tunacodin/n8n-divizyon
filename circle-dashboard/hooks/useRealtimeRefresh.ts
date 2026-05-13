'use client'
import { useEffect, useRef } from 'react'

type Tables = Array<'applications' | 'task_completions' | 'inventory_tests' | 'warnings' | 'status_history'>

/**
 * Eski Supabase realtime hook'unun polling fallback'i.
 * Supabase kaldirildi — `tables` parametresi imza uyumlulugu icin korunuyor ama kullanilmiyor.
 * `onChange` her 30 saniyede bir tetiklenir.
 */
export function useRealtimeRefresh(tables: Tables, onChange: () => void) {
  void tables
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const interval = setInterval(() => onChangeRef.current(), 30000)
    return () => clearInterval(interval)
  }, [])
}

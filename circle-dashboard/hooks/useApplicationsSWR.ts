'use client'
import useSWR, { mutate as globalMutate } from 'swr'
import { useEffect } from 'react'
import { useRealtimeRefresh } from './useRealtimeRefresh'

type Fetcher<T> = (url: string) => Promise<T>

const jsonFetcher: Fetcher<any> = (url) => fetch(url).then((r) => r.json())

/**
 * SWR + Realtime birleşimi:
 * - İlk yüklemede cache varsa anında döner, arka planda revalidate
 * - Supabase Realtime eventi geldiğinde mutate() ile cache invalidate
 *
 * Tablolardaki değişiklikler (applications/task_completions/inventory_tests/warnings)
 * tüm bu hook'u kullanan sayfalarda anlık refresh tetikler.
 */
export function useApplicationsSWR<T = any>(url: string | null) {
  const { data, error, isLoading, mutate } = useSWR<T>(
    url,
    jsonFetcher,
    {
      revalidateOnFocus: false,           // Sekme focus'u her seferinde fetch etmesin
      revalidateIfStale: true,
      dedupingInterval: 30_000,           // 30sn içinde aynı istek cache'ten
      keepPreviousData: true,             // Tab geçişinde boş kalmaya gerek yok
    }
  )

  // Realtime trigger: herhangi bir değişiklikte revalidate et
  useRealtimeRefresh(
    ['applications', 'task_completions', 'inventory_tests', 'warnings'],
    () => { mutate() }
  )

  return { data, error, isLoading, mutate }
}

// Global mutate kullanıcısı için export
export { globalMutate as mutateAll }

import type { SWRConfiguration } from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Global SWR ayarlari
 *
 * - dedupingInterval: 60s — ayni key icin 60s icinde tekrar istek atmaz
 * - revalidateOnFocus: false — tab'a donuste otomatik refetch yapmaz
 * - revalidateIfStale: false — cache varsa stale olsa bile once onu gosterir
 * - revalidateOnReconnect: true — internet donunce gunceller
 * - errorRetryCount: 2
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 60_000,
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  keepPreviousData: true,
}

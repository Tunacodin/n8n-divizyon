'use client'

import { ActivityFeed } from '@/components/activity/ActivityFeed'

export default function AktivitePage() {
  return (
    <div className="flex justify-center py-10 px-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Aktivite Logu</h1>
        <ActivityFeed />
      </div>
    </div>
  )
}

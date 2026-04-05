'use client'

import { ActivityFeed } from '@/components/activity/ActivityFeed'

export default function AktivitePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Aktivite Logu</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tüm kullanıcı işlemlerinin kronolojik kaydı
        </p>
      </div>

      {/* Feed */}
      <ActivityFeed />
    </div>
  )
}

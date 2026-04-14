'use client'

import { ActivityFeed } from '@/components/activity/ActivityFeed'

export default function AktivitePage() {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="sticky top-20 z-30 bg-white border-b border-gray-100 px-8 py-4">
        <h1 className="text-xl font-bold text-gray-900">Aktivite Logu</h1>
        <p className="text-xs text-gray-500 mt-1">
          Sistem üzerindeki tüm işlemlerin kronolojik kaydı
        </p>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}

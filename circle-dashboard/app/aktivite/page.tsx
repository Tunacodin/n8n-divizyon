'use client'

import { ActivityFeed } from '@/components/activity/ActivityFeed'

export default function AktivitePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-20 z-30 bg-card border-b border-border px-8 py-4">
        <h1 className="text-xl font-bold text-foreground">Aktivite Logu</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Sistem üzerindeki tüm işlemlerin kronolojik kaydı
        </p>
      </div>

      <div className="p-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}

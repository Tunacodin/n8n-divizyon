import { Suspense } from 'react'
import ApplicationsTable from '@/components/ApplicationsTable'

export default function ApplicationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-card border-b border-border px-8 py-6">
        <h1 className="text-2xl font-bold text-foreground">Başvurular</h1>
        <p className="text-sm text-muted-foreground mt-1">Tüm başvuru verilerini görüntüleyin ve filtreleyin</p>
      </div>
      <div className="p-8">
        <Suspense>
          <ApplicationsTable />
        </Suspense>
      </div>
    </div>
  )
}

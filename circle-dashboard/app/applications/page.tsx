import { Suspense } from 'react'
import ApplicationsTable from '@/components/ApplicationsTable'

export default function ApplicationsPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Başvurular</h1>
        <p className="text-sm text-gray-500 mt-1">Tüm başvuru verilerini görüntüleyin ve filtreleyin</p>
      </div>
      <div className="p-8">
        <Suspense>
          <ApplicationsTable />
        </Suspense>
      </div>
    </div>
  )
}

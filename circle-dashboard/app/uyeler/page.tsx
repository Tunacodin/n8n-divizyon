'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TabBar, type Tab } from '@/components/ui/tabs'
import OryantasyonContent from '@/components/uyeler/OryantasyonContent'
import NihaiAgUyesiContent from '@/components/uyeler/NihaiAgUyesiContent'
import DeaktiveContent from '@/components/uyeler/DeaktiveContent'

const TABS: Tab[] = [
  { key: 'oryantasyon', label: 'Oryantasyon', dotColor: 'bg-violet-400' },
  { key: 'nihai-ag-uyesi', label: 'Nihai Ağ Üyesi', dotColor: 'bg-amber-400' },
  { key: 'deaktive', label: 'Deaktive', dotColor: 'bg-gray-400' },
]

function UyelerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'oryantasyon'
  const [mounted, setMounted] = useState<Set<string>>(new Set([activeTab]))

  useEffect(() => {
    setMounted((prev) => new Set(prev).add(activeTab))
  }, [activeTab])

  const handleTabChange = (key: string) => {
    router.replace(`/uyeler?tab=${key}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="bg-white border-b border-gray-100 px-8 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Ağ Üyeleri</h1>
        <TabBar tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <div className="relative">
        {TABS.map((tab) => {
          if (!mounted.has(tab.key)) return null
          return (
            <div key={tab.key} style={{ display: activeTab === tab.key ? 'block' : 'none' }}>
              {tab.key === 'oryantasyon' && <OryantasyonContent />}
              {tab.key === 'nihai-ag-uyesi' && <NihaiAgUyesiContent />}
              {tab.key === 'deaktive' && <DeaktiveContent />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function UyelerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    }>
      <UyelerContent />
    </Suspense>
  )
}

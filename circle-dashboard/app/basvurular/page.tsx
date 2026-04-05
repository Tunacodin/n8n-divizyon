'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TabBar, type Tab } from '@/components/ui/tabs'
import BasvuruFormuContent from '@/components/basvurular/BasvuruFormuContent'
import KontrolContent from '@/components/basvurular/KontrolContent'
import KesinKabulContent from '@/components/basvurular/KesinKabulContent'
import KesinRetContent from '@/components/basvurular/KesinRetContent'

const TABS: Tab[] = [
  { key: 'basvuru-formu', label: 'Başvuru Formu', dotColor: 'bg-blue-400' },
  { key: 'kontrol', label: 'Kontrol', dotColor: 'bg-yellow-400' },
  { key: 'kesin-kabul', label: 'Kesin Kabul', dotColor: 'bg-emerald-400' },
  { key: 'kesin-ret', label: 'Kesin Ret', dotColor: 'bg-red-400' },
]

function BasvurularContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'basvuru-formu'
  const [mounted, setMounted] = useState<Set<string>>(new Set([activeTab]))

  useEffect(() => {
    setMounted((prev) => new Set(prev).add(activeTab))
  }, [activeTab])

  const handleTabChange = (key: string) => {
    router.replace(`/basvurular?tab=${key}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="bg-white border-b border-gray-100 px-8 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Başvurular</h1>
        <TabBar tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <div className="relative">
        {TABS.map((tab) => {
          if (!mounted.has(tab.key)) return null
          return (
            <div key={tab.key} style={{ display: activeTab === tab.key ? 'block' : 'none' }}>
              {tab.key === 'basvuru-formu' && <BasvuruFormuContent />}
              {tab.key === 'kontrol' && <KontrolContent />}
              {tab.key === 'kesin-kabul' && <KesinKabulContent />}
              {tab.key === 'kesin-ret' && <KesinRetContent />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BasvurularPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    }>
      <BasvurularContent />
    </Suspense>
  )
}

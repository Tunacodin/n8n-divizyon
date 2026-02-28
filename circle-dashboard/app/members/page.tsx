'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // This will be implemented when we add sheets endpoint for members
    // For now, showing placeholder
    setLoading(false)
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Üyeler</h1>
        <p className="text-gray-500 mt-1">Nihai AĞ üyeleri ve durum takibi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Üye Listesi</CardTitle>
          <CardDescription>
            Phase 2'de Google Sheets'ten üye verilerini çekeceğiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              🚧 Geliştirme aşamasında...
            </p>
            <p className="text-sm text-gray-400">
              Nihai AĞ Üyesi sheet'inden veri çekme işlemi Phase 2'de eklenecek
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Aktif Üyeler</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Phase 2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Deaktif Üyeler</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Phase 2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Uyarılı Üyeler</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Phase 2</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

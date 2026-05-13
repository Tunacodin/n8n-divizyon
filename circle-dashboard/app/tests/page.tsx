'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TestsPage() {
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // This will fetch from Google Sheets (Test Sonuçları)
    // For now, showing placeholder
    setLoading(false)
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Test Sonuçları</h1>
        <p className="text-muted-foreground mt-1">Kullanıcı test tamamlama durumları</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Tamamlama Durumu</CardTitle>
          <CardDescription>
            4 farklı test: Karakteristik, Dijital Ürün, Kreatif Yapım, Dijital Deneyim
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              🧪 Geliştirme aşamasında...
            </p>
            <p className="text-sm text-muted-foreground">
              Test Sonuçları sheet'inden veri çekme işlemi Phase 2'de eklenecek
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Karakteristik</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tamamlayan kullanıcı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Dijital Ürün</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tamamlayan kullanıcı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Kreatif Yapım</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tamamlayan kullanıcı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Dijital Deneyim</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tamamlayan kullanıcı</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

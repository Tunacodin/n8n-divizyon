'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface Application {
  email: string
  adSoyad: string
  yas: number
  telefon?: string
  dogumTarihi: string
  ilkeSozlesmesi: string
  yasKontrol: string
  ilkeKontrol: string
  durum: string
  timestamp: string
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [filter])

  async function fetchApplications() {
    setLoading(true)
    try {
      const url = filter === 'pending'
        ? '/api/applications?status=pending'
        : '/api/applications'

      const res = await fetch(url)
      const data = await res.json()
      setApplications(data)
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(email: string, action: 'approve' | 'reject') {
    setActionLoading(email)
    try {
      const res = await fetch('/api/applications/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action }),
      })

      if (res.ok) {
        // Remove from list after successful action
        setApplications(prev => prev.filter(app => app.email !== email))
        alert(`Başvuru başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}!`)
      } else {
        alert('Bir hata oluştu')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Bir hata oluştu')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Başvurular</h1>
          <p className="text-gray-500 mt-1">
            Toplam {applications.length} başvuru
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Bekleyenler
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Tüm Başvurular
          </Button>
        </div>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">
              {filter === 'pending'
                ? 'Onay bekleyen başvuru yok 🎉'
                : 'Henüz başvuru yok'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.email} className="hover:shadow-md transition">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{app.adSoyad}</CardTitle>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Email:</p>
                        <p className="font-medium">{app.email}</p>
                      </div>

                      <div>
                        <p className="text-gray-600">Telefon:</p>
                        <p className="font-medium">{app.telefon || 'Belirtilmemiş'}</p>
                      </div>

                      <div>
                        <p className="text-gray-600">Yaş:</p>
                        <p className="font-medium">{app.yas}</p>
                      </div>

                      <div>
                        <p className="text-gray-600">Doğum Tarihi:</p>
                        <p className="font-medium">{app.dogumTarihi}</p>
                      </div>

                      <div>
                        <p className="text-gray-600">Başvuru Tarihi:</p>
                        <p className="font-medium">{formatDate(app.timestamp)}</p>
                      </div>

                      <div>
                        <p className="text-gray-600">Durum:</p>
                        <Badge
                          variant={
                            app.durum === 'Kabul' ? 'success' :
                            app.durum === 'Ret' ? 'destructive' :
                            'warning'
                          }
                        >
                          {app.durum}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {app.yasKontrol === 'Evet' && (
                        <Badge variant="success">✓ Yaş Uygun</Badge>
                      )}
                      {app.ilkeKontrol === 'Evet' && (
                        <Badge variant="success">✓ İlke Kabul</Badge>
                      )}
                    </div>
                  </div>

                  {app.durum === 'Beklemede' && (
                    <div className="ml-4 flex flex-col gap-2">
                      <Button
                        onClick={() => handleAction(app.email, 'approve')}
                        disabled={actionLoading === app.email}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === app.email ? 'İşleniyor...' : '✓ Onayla'}
                      </Button>
                      <Button
                        onClick={() => handleAction(app.email, 'reject')}
                        disabled={actionLoading === app.email}
                        variant="destructive"
                      >
                        {actionLoading === app.email ? 'İşleniyor...' : '✗ Reddet'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  applications: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  tests: {
    total: number
    completed: number
    pending: number
  }
  members: {
    active: number
    deactivated: number
    total: number
  }
}

interface HealthMetrics {
  totalWorkflows: number
  activeWorkflows: number
  inactiveWorkflows: number
  recentExecutions: number
  successCount: number
  failedCount: number
  successRate: number
  healthStatus: 'HEALTHY' | 'CRITICAL'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [health, setHealth] = useState<HealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch('/api/sheets/stats'),
          fetch('/api/workflows/health'),
        ])

        const statsData = await statsRes.json()
        const healthData = await healthRes.json()

        setStats(statsData)
        setHealth(healthData)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Circle Topluluk Yönetimi - n8n Entegrasyonu</p>
      </div>

      {/* n8n Health Status */}
      {health && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>n8n Workflow Status</CardTitle>
                <Badge variant={health.healthStatus === 'HEALTHY' ? 'success' : 'destructive'}>
                  {health.healthStatus}
                </Badge>
              </div>
              <CardDescription>Son 10 dakika içindeki execution verileri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Toplam Workflow</p>
                  <p className="text-2xl font-bold">{health.totalWorkflows}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Aktif</p>
                  <p className="text-2xl font-bold text-green-600">{health.activeWorkflows}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Başarı Oranı</p>
                  <p className="text-2xl font-bold text-blue-600">{health.successRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hatalar</p>
                  <p className="text-2xl font-bold text-red-600">{health.failedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Applications Stats */}
      {stats && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Başvuru İstatistikleri</h2>
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Toplam Başvuru</CardDescription>
                  <CardTitle className="text-3xl">{stats.applications.total}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Tüm başvurular</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Bekleyen</CardDescription>
                  <CardTitle className="text-3xl text-yellow-600">{stats.applications.pending}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Manuel onay bekliyor</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Kabul Edilenler</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{stats.applications.approved}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Onaylanmış</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Reddedilenler</CardDescription>
                  <CardTitle className="text-3xl text-red-600">{stats.applications.rejected}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Reddedilmiş</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Test Stats */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Test İstatistikleri</h2>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Test Başlatılan</CardDescription>
                  <CardTitle className="text-3xl">{stats.tests.total}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Test aşamasındaki kullanıcılar</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Tamamlananlar</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{stats.tests.completed}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">4 testi de tamamladı</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Devam Edenler</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{stats.tests.pending}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Henüz tamamlanmadı</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Member Stats */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Üye İstatistikleri</h2>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Toplam Üye</CardDescription>
                  <CardTitle className="text-3xl">{stats.members.total}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Nihai AĞ üyeleri</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Aktif Üyeler</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{stats.members.active}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Aktif durumdaki üyeler</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Deaktif</CardDescription>
                  <CardTitle className="text-3xl text-gray-600">{stats.members.deactivated}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">Deaktif edilmiş üyeler</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Hızlı İşlemler</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Başvuru Onayları</CardTitle>
                  <CardDescription>
                    {stats.applications.pending} başvuru onay bekliyor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href="/applications"
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Başvuruları Görüntüle →
                  </a>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Workflow Monitoring</CardTitle>
                  <CardDescription>
                    {health?.activeWorkflows} aktif workflow çalışıyor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href="/workflows"
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Workflow'ları Görüntüle →
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

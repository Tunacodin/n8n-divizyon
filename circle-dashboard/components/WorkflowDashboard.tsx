'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline'
import ApplicationsTable from './ApplicationsTable'

interface WorkflowStats {
  totalApplications: number
  kontrolCount: number
  kesinRetCount: number
  under18Count: number
  lastRunTime?: string
  isActive: boolean
}

export default function WorkflowDashboard() {
  const [stats, setStats] = useState<WorkflowStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkflowStats()
    const interval = setInterval(fetchWorkflowStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchWorkflowStats = async () => {
    try {
      const response = await fetch('/api/applications/stats')
      const data = await response.json()

      setStats({
        totalApplications: data.applications?.total || 0,
        kontrolCount: data.applications?.kontrol || 0,
        kesinRetCount: data.applications?.rejected || 0,
        under18Count: data.applications?.under18 || 0,
        lastRunTime: new Date().toISOString(),
        isActive: true,
      })
    } catch (error) {
      console.error('Error fetching workflow stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <WorkflowSkeleton />
  }

  const successRate = stats
    ? ((stats.kontrolCount / stats.totalApplications) * 100).toFixed(1)
    : '0'

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Başvuru Otomasyon Workflow
          </h1>
          <p className="text-gray-600">
            Google Sheets Trigger → Yaş Kontrolü → Topluluk İlkeleri → Hedef Sheet
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            stats?.isActive
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {stats?.isActive ? (
              <>
                <PlayIcon className="w-5 h-5" />
                <span className="font-medium">Aktif</span>
              </>
            ) : (
              <>
                <PauseIcon className="w-5 h-5" />
                <span className="font-medium">Pasif</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Toplam Başvuru"
          value={stats?.totalApplications || 0}
          icon={UserGroupIcon}
          color="blue"
          trend="+12%"
        />
        <StatsCard
          title="Kontrol Listesi"
          value={stats?.kontrolCount || 0}
          icon={ShieldCheckIcon}
          color="green"
          subtitle={`${successRate}% başarı`}
        />
        <StatsCard
          title="Kesin Ret"
          value={stats?.kesinRetCount || 0}
          icon={XCircleIcon}
          color="red"
          subtitle="İlkeler/Yaş"
        />
        <StatsCard
          title="18 Yaş Altı"
          value={stats?.under18Count || 0}
          icon={CalendarIcon}
          color="yellow"
        />
      </div>

      {/* Workflow Visualization */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ChartBarIcon className="w-7 h-7 text-purple-600" />
          Workflow Akışı
        </h2>

        <WorkflowFlow stats={stats} />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ClockIcon className="w-7 h-7 text-blue-600" />
          Son Aktivite
        </h2>

        <div className="space-y-3">
          {stats?.lastRunTime && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-gray-700 font-medium">Son çalışma</span>
              </div>
              <span className="text-gray-500 text-sm">
                {new Date(stats.lastRunTime).toLocaleString('tr-TR')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Applications Table */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <DocumentTextIcon className="w-7 h-7 text-purple-600" />
          Tüm Başvurular
        </h2>
        <ApplicationsTable />
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: number
  icon: React.ElementType
  color: 'blue' | 'green' | 'red' | 'yellow'
  subtitle?: string
  trend?: string
}

function StatsCard({ title, value, icon: Icon, color, subtitle, trend }: StatsCardProps) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600',
    green: 'from-green-50 to-green-100 border-green-200 text-green-600',
    red: 'from-red-50 to-red-100 border-red-200 text-red-600',
    yellow: 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-600',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl border p-6 shadow-sm`}
    >
      <div className="flex items-start justify-between mb-4">
        <Icon className="w-8 h-8" />
        {trend && (
          <span className="text-xs font-medium px-2 py-1 bg-white rounded-lg">
            {trend}
          </span>
        )}
      </div>

      <div className="text-4xl font-bold text-gray-900 mb-1">
        {value.toLocaleString()}
      </div>

      <div className="text-sm text-gray-700">{title}</div>

      {subtitle && (
        <div className="text-xs text-gray-500 mt-2">{subtitle}</div>
      )}
    </motion.div>
  )
}

function WorkflowFlow({ stats }: { stats: WorkflowStats | null }) {
  const nodes = [
    {
      id: 'trigger',
      title: 'Google Sheets Trigger',
      subtitle: 'Yeni satır eklendi',
      icon: DocumentTextIcon,
      color: 'blue',
      count: stats?.totalApplications || 0,
    },
    {
      id: 'age-check',
      title: 'Yaş Kontrolü',
      subtitle: 'Doğum tarihi parse',
      icon: CalendarIcon,
      color: 'purple',
      count: stats?.totalApplications || 0,
    },
    {
      id: 'switch',
      title: 'Switch',
      subtitle: '3 durum kontrolü',
      icon: ChartBarIcon,
      color: 'yellow',
      count: stats?.totalApplications || 0,
    },
    {
      id: 'ilkeler',
      title: 'İlkeler Kontrolü',
      subtitle: '10 soru boş mu?',
      icon: ShieldCheckIcon,
      color: 'orange',
      count: (stats?.totalApplications || 0) - (stats?.under18Count || 0),
    },
  ]

  const outputs = [
    {
      id: 'kontrol',
      title: 'Kontrol Sheet',
      subtitle: 'Geçerli başvurular',
      icon: CheckCircleIcon,
      color: 'green',
      count: stats?.kontrolCount || 0,
    },
    {
      id: 'kesin-ret',
      title: 'Kesin Ret',
      subtitle: 'İlkeler kabul edilmemiş',
      icon: XCircleIcon,
      color: 'red',
      count: stats?.kesinRetCount || 0,
    },
    {
      id: 'under-18',
      title: '18 Yaş Altı',
      subtitle: 'Yaş uygunsuzluğu',
      icon: XCircleIcon,
      color: 'red',
      count: stats?.under18Count || 0,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Main Flow */}
      <div className="flex items-center justify-between gap-4">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex items-center gap-4 flex-1">
            <FlowNode {...node} />
            {index < nodes.length - 1 && (
              <ArrowRightIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Outputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        {outputs.map((output) => (
          <FlowNode key={output.id} {...output} isOutput />
        ))}
      </div>
    </div>
  )
}

interface FlowNodeProps {
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  count: number
  isOutput?: boolean
}

function FlowNode({ title, subtitle, icon: Icon, color, count, isOutput }: FlowNodeProps) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-600',
    purple: 'border-purple-200 bg-purple-50 text-purple-600',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-600',
    orange: 'border-orange-200 bg-orange-50 text-orange-600',
    green: 'border-green-200 bg-green-50 text-green-600',
    red: 'border-red-200 bg-red-50 text-red-600',
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        ${colorClasses[color]}
        border-2 rounded-xl p-4
        ${isOutput ? 'text-center' : ''}
        transition-all hover:scale-105 cursor-pointer shadow-sm
      `}
    >
      <div className={`flex ${isOutput ? 'flex-col' : 'items-start gap-3'}`}>
        <Icon className={`w-8 h-8 ${isOutput ? 'mx-auto mb-2' : ''}`} />

        <div className={isOutput ? 'text-center' : ''}>
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
          {count > 0 && (
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {count}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function WorkflowSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-12 bg-gray-200 rounded-xl w-64" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  )
}

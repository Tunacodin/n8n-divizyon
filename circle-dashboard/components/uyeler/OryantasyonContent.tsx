'use client'

import { useEffect, useState, useMemo } from 'react'
// DB field names used directly
import { Badge } from '@/components/ui/badge'
import { ExclamationTriangleIcon, XMarkIcon, ClockIcon, CheckCircleIcon, BellAlertIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import UyeDetailModal from '@/components/oryantasyon/UyeDetailModal'

const PER_PAGE = 15

type UyariFilter = 'tumu' | '0' | '1' | '2'
type SureFilter = 'tumu' | 'kritik' | 'uyari' | 'normal'
type TakipFilter = 'tumu' | 'kontrol_gerekli' | 'bekleniyor' | 'tamamlandi'

function parseDateFlexible(raw: any): Date | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s || s === '—') return null
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (dmy) {
    const [, d, m, y, h = '0', min = '0', sec = '0'] = dmy
    const dt = new Date(+y, +m - 1, +d, +h, +min, +sec)
    if (!isNaN(dt.getTime())) return dt
  }
  try {
    const dt = new Date(s)
    if (!isNaN(dt.getTime()) && dt.getFullYear() > 2000) return dt
  } catch { /* ignore */ }
  return null
}

function daysSince(date: Date | null): number | null {
  if (!date) return null
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

function getUyariSayisi(row: Record<string, any>): number {
  return Math.min(Number(row.warning_count) || 0, 2)
}

function getUyariColor(n: number): { badge: string; dot: string } {
  if (n === 0) return { badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-400' }
  if (n === 1) return { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' }
  return { badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' }
}

function getSureStatus(days: number | null): { label: string; color: string; bgColor: string } {
  if (days === null) return { label: 'Tarih Yok', color: 'text-gray-400', bgColor: '' }
  if (days > 21) return { label: `${days} gün`, color: 'text-red-600 font-semibold', bgColor: 'bg-red-50' }
  if (days > 14) return { label: `${days} gün`, color: 'text-orange-600 font-semibold', bgColor: 'bg-orange-50' }
  return { label: `${days} gün`, color: 'text-gray-600', bgColor: '' }
}

type TaskInfo = { completed: boolean; completed_by?: string; completed_at?: string }
type TaskMap = Record<string, Record<string, TaskInfo>>

export default function OryantasyonContent() {
  const [data, setData] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [uyariFilter, setUyariFilter] = useState<UyariFilter>('tumu')
  const [sureFilter, setSureFilter] = useState<SureFilter>('tumu')
  const [page, setPage] = useState(1)
  const [takipFilter, setTakipFilter] = useState<TakipFilter>('tumu')
  const [taskMap, setTaskMap] = useState<TaskMap>({})
  const [warningsMap, setWarningsMap] = useState<Record<string, { count: number; lastWarningAt: string | null }>>({})
  const [togglingTask, setTogglingTask] = useState<string | null>(null)
  const [warningLoading, setWarningLoading] = useState<string | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState<string | null>(null)
  const [selectedUye, setSelectedUye] = useState<Record<string, any> | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetch('/api/applications?status=nihai_olmayan')
      .then((r) => r.json())
      .then(async (res) => {
        if (!res.success) return
        setData(res.data || [])
        // Her application icin task_completions + warnings cek
        const tMap: TaskMap = {}
        const wMap: Record<string, { count: number; lastWarningAt: string | null }> = {}
        await Promise.all(
          (res.data || []).map(async (app: Record<string, any>) => {
            try {
              const r2 = await fetch(`/api/applications/${app.id}`)
              const detail = await r2.json()
              if (detail.success) {
                tMap[app.id] = {}
                for (const t of detail.data.tasks || []) {
                  tMap[app.id][t.task_type] = {
                    completed: !!t.completed,
                    completed_by: t.completed_by,
                    completed_at: t.completed_at,
                  }
                }
                const warnings = detail.data.warnings || []
                const lastW = warnings.length > 0 ? warnings[warnings.length - 1] : null
                wMap[app.id] = {
                  count: warnings.length,
                  lastWarningAt: lastW?.created_at || null,
                }
              }
            } catch { /* ignore */ }
          })
        )
        setTaskMap(tMap)
        setWarningsMap(wMap)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleTask = async (appId: string, taskType: string, current: boolean) => {
    const key = `${appId}-${taskType}`
    setTogglingTask(key)

    let completedBy = 'dashboard'
    if (!current && taskType === 'oryantasyon') {
      const name = prompt('Oryantasyonu yapan kişi:')
      if (!name) { setTogglingTask(null); return }
      completedBy = name
    }

    try {
      const res = await fetch(`/api/applications/${appId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: taskType, completed: !current, completed_by: completedBy }),
      })
      const result = await res.json()
      if (result.success) {
        setTaskMap((prev) => ({
          ...prev,
          [appId]: {
            ...(prev[appId] || {}),
            [taskType]: {
              completed: !current,
              completed_by: !current ? completedBy : undefined,
              completed_at: !current ? new Date().toISOString() : undefined,
            },
          },
        }))
      }
    } catch { /* ignore */ }
    setTogglingTask(null)
  }

  const addWarning = async (appId: string, name: string) => {
    const reason = prompt(`${name} için uyarı sebebi (Circle'dan mesaj atıldı):`, 'Haftalık kontrol — eksik görevler hakkında Circle üzerinden bilgilendirildi.')
    if (!reason) return

    const warnedBy = prompt('Uyarıyı veren kişi:')
    if (!warnedBy) return

    setWarningLoading(appId)
    try {
      const res = await fetch(`/api/applications/${appId}/warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warned_by: warnedBy, reason }),
      })
      const result = await res.json()
      if (result.success) {
        // warning_count'u local state'te guncelle
        setData((prev) =>
          prev.map((d) => d.id === appId ? { ...d, warning_count: (d.warning_count || 0) + 1 } : d)
        )
      }
    } catch { /* ignore */ }
    setWarningLoading(null)
  }

  const isDeactivateEligible = (appId: string) => {
    const w = warningsMap[appId]
    if (!w || w.count < 2 || !w.lastWarningAt) return false
    const tasks = taskMap[appId] || {}
    const allTasksDone =
      !!tasks['karakteristik_envanter']?.completed &&
      !!tasks['disipliner_envanter']?.completed &&
      !!tasks['oryantasyon']?.completed
    if (allTasksDone) return false // testleri tamamlamış, deaktive gerekmez
    const daysSinceLastWarning = Math.floor(
      (Date.now() - new Date(w.lastWarningAt).getTime()) / 86_400_000
    )
    return daysSinceLastWarning >= 14
  }

  const handleDeactivate = async (appId: string, name: string) => {
    if (!confirm(`${name} kişisi 2 uyarıya rağmen 2 hafta içinde görevlerini tamamlamadı.\n\nDeaktive ağ üyelerine taşınsın mı?`)) return
    setDeactivateLoading(appId)
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: 'deaktive',
          changed_by: 'dashboard',
          reason: '2 uyarı sonrası 2 hafta içinde görevler tamamlanmadı',
        }),
      })
      const result = await res.json()
      if (result.success) {
        setData((prev) => prev.filter((d) => d.id !== appId))
      } else {
        alert(result.error || 'Taşıma başarısız')
      }
    } catch { alert('Bağlantı hatası') }
    setDeactivateLoading(null)
  }

  // Takip durumu hesapla
  type TakipDurum = 'kontrol_gerekli' | 'bekleniyor' | 'tamamlandi' | 'deaktive_hazir'

  function getTakipDurum(appId: string, uyariSayisi: number): { durum: TakipDurum; label: string; sonKontrolGun: number | null; sonKontrolTarih: string | null } {
    const tasks = taskMap[appId] || {}
    const allDone = !!tasks['karakteristik_envanter']?.completed && !!tasks['disipliner_envanter']?.completed && !!tasks['oryantasyon']?.completed
    if (allDone) return { durum: 'tamamlandi', label: 'Tamamlandı', sonKontrolGun: null, sonKontrolTarih: null }

    const w = warningsMap[appId]
    const sonKontrolTarih = w?.lastWarningAt || null
    const sonKontrolGun = sonKontrolTarih ? Math.floor((Date.now() - new Date(sonKontrolTarih).getTime()) / 86_400_000) : null

    if (uyariSayisi >= 2 && sonKontrolGun !== null && sonKontrolGun >= 14) {
      return { durum: 'deaktive_hazir', label: 'Deaktive edilmeli', sonKontrolGun, sonKontrolTarih }
    }
    if (uyariSayisi === 0) {
      return { durum: 'kontrol_gerekli', label: 'İlk kontrol', sonKontrolGun: null, sonKontrolTarih: null }
    }
    if (sonKontrolGun !== null && sonKontrolGun >= 7) {
      return { durum: 'kontrol_gerekli', label: `${sonKontrolGun} gün oldu`, sonKontrolGun, sonKontrolTarih }
    }
    const kalanGun = sonKontrolGun !== null ? 7 - sonKontrolGun : null
    return { durum: 'bekleniyor', label: kalanGun !== null ? `${kalanGun} gün sonra` : 'Bekleniyor', sonKontrolGun, sonKontrolTarih }
  }

  const enriched = useMemo(() => {
    return data.map((row) => {
      const tasinmaTarihi = row.submitted_at ? new Date(row.submitted_at) : null
      const uyariSayisi = getUyariSayisi(row)
      const gun = daysSince(tasinmaTarihi)
      const takip = getTakipDurum(row.id, uyariSayisi)
      return { ...row, _tasinmaTarihi: tasinmaTarihi, _uyariSayisi: uyariSayisi, _gun: gun, _takip: takip } as Record<string, any> & { _tasinmaTarihi: Date | null; _uyariSayisi: number; _gun: number | null; _takip: ReturnType<typeof getTakipDurum> }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, taskMap, warningsMap])

  const filtered = useMemo(() => {
    let items = [...enriched]

    if (uyariFilter !== 'tumu') {
      items = items.filter((d) => String(d._uyariSayisi) === uyariFilter)
    }

    if (sureFilter !== 'tumu') {
      items = items.filter((d) => {
        const g = d._gun
        if (sureFilter === 'kritik') return g !== null && g > 21
        if (sureFilter === 'uyari') return g !== null && g > 14 && g <= 21
        if (sureFilter === 'normal') return g !== null && g <= 14
        return true
      })
    }

    if (takipFilter !== 'tumu') {
      if (takipFilter === 'kontrol_gerekli') {
        items = items.filter((d) => d._takip.durum === 'kontrol_gerekli' || d._takip.durum === 'deaktive_hazir')
      } else {
        items = items.filter((d) => d._takip.durum === takipFilter)
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((d) => {
        const name = ((d.full_name || '') || '').toLowerCase()
        const email = ((d.email || '') || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    }

    // Kontrol gerekli olanlar önce, sonra en eski
    items.sort((a, b) => {
      const priority: Record<string, number> = { deaktive_hazir: 0, kontrol_gerekli: 1, bekleniyor: 2, tamamlandi: 3 }
      const pa = priority[a._takip.durum] ?? 2
      const pb = priority[b._takip.durum] ?? 2
      if (pa !== pb) return pa - pb
      if (a._gun === null && b._gun === null) return 0
      if (a._gun === null) return 1
      if (b._gun === null) return -1
      return b._gun - a._gun
    })

    return items
  }, [enriched, uyariFilter, sureFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [uyariFilter, sureFilter, takipFilter, search])

  const counts = useMemo(() => {
    let karDone = 0, disDone = 0, oryDone = 0, allDone = 0
    for (const row of enriched) {
      const t = taskMap[row.id] || {}
      const k = !!t['karakteristik_envanter']?.completed
      const d = !!t['disipliner_envanter']?.completed
      const o = !!t['oryantasyon']?.completed
      if (k) karDone++
      if (d) disDone++
      if (o) oryDone++
      if (k && d && o) allDone++
    }
    return {
      tumu: enriched.length,
      u0: enriched.filter((d) => d._uyariSayisi === 0).length,
      u1: enriched.filter((d) => d._uyariSayisi === 1).length,
      u2: enriched.filter((d) => d._uyariSayisi === 2).length,
      kritik: enriched.filter((d) => d._gun !== null && d._gun > 21).length,
      uyariSure: enriched.filter((d) => d._gun !== null && d._gun > 14 && d._gun <= 21).length,
      karDone, disDone, oryDone, allDone,
      kontrolGerekli: enriched.filter((d) => d._takip.durum === 'kontrol_gerekli' || d._takip.durum === 'deaktive_hazir').length,
      bekleniyor: enriched.filter((d) => d._takip.durum === 'bekleniyor').length,
      tamamlandi: enriched.filter((d) => d._takip.durum === 'tamamlandi').length,
    }
  }, [enriched, taskMap])

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Oryantasyon</h1>
            <p className="text-sm text-gray-500 mt-1">Nihai olmayan ağ üyelerinin oryantasyon süreci takibi</p>
          </div>
          <div className="flex items-center gap-3">
            {counts.kritik > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">{counts.kritik} kritik (21+ gün)</span>
              </div>
            )}
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-sm px-3 py-1">
              {data.length} kişi
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Toplam</p>
            <p className="text-2xl font-bold text-gray-900">{counts.tumu}</p>
            <p className="text-xs text-gray-400 mt-0.5">oryantasyonda</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">2 Uyarı</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{counts.u2}</p>
            <p className="text-xs text-gray-400 mt-0.5">son aşamada</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">21+ Gün</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{counts.kritik}</p>
            <p className="text-xs text-gray-400 mt-0.5">kritik süre</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tümü Tamam</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{counts.allDone}</p>
            <p className="text-xs text-gray-400 mt-0.5">nihai üyeye hazır</p>
          </div>
        </div>

        {/* Task Tamamlanma Özeti */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Kar. Envanter</p>
              <p className="text-lg font-bold text-gray-900">{counts.karDone}<span className="text-sm font-normal text-gray-400">/{counts.tumu}</span></p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50">
              <span className="text-sm font-bold text-blue-600">{counts.tumu ? Math.round(counts.karDone / counts.tumu * 100) : 0}%</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Dis. Envanter</p>
              <p className="text-lg font-bold text-gray-900">{counts.disDone}<span className="text-sm font-normal text-gray-400">/{counts.tumu}</span></p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50">
              <span className="text-sm font-bold text-indigo-600">{counts.tumu ? Math.round(counts.disDone / counts.tumu * 100) : 0}%</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Oryantasyon</p>
              <p className="text-lg font-bold text-gray-900">{counts.oryDone}<span className="text-sm font-normal text-gray-400">/{counts.tumu}</span></p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-50">
              <span className="text-sm font-bold text-purple-600">{counts.tumu ? Math.round(counts.oryDone / counts.tumu * 100) : 0}%</span>
            </div>
          </div>
        </div>

        {/* Data Quality Notice */}
{/* Bilgi notu kaldırıldı — task takibi artık Supabase üzerinden */}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input
            type="text"
            placeholder="Ad soyad veya e-posta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-w-[220px]"
          />

          {/* Uyarı filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['tumu', '0', '1', '2'] as UyariFilter[]).map((f) => {
              const label = f === 'tumu' ? 'Tümü' : `${f} Uyarı`
              const cnt = f === 'tumu' ? counts.tumu : f === '0' ? counts.u0 : f === '1' ? counts.u1 : counts.u2
              return (
                <button
                  key={f}
                  onClick={() => setUyariFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${uyariFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {f !== 'tumu' && <span className={`w-1.5 h-1.5 rounded-full ${getUyariColor(+f).dot}`} />}
                  {label}
                  <span className={`text-xs px-1 py-0.5 rounded-full ${uyariFilter === f ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>{cnt}</span>
                </button>
              )
            })}
          </div>

          {/* Süre filter */}
          <select
            value={sureFilter}
            onChange={(e) => setSureFilter(e.target.value as SureFilter)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="tumu">Süre (Tümü)</option>
            <option value="kritik">Kritik (21+ gün)</option>
            <option value="uyari">Uyarı (14–21 gün)</option>
            <option value="normal">Normal (0–14 gün)</option>
          </select>

          {/* Takip filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { key: 'tumu' as TakipFilter, label: 'Tümü', cnt: counts.tumu },
              { key: 'kontrol_gerekli' as TakipFilter, label: 'Kontrol Gerekli', cnt: counts.kontrolGerekli },
              { key: 'bekleniyor' as TakipFilter, label: 'Bekleniyor', cnt: counts.bekleniyor },
              { key: 'tamamlandi' as TakipFilter, label: 'Tamamlandı', cnt: counts.tamamlandi },
            ]).map(({ key, label, cnt }) => (
              <button
                key={key}
                onClick={() => setTakipFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${takipFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {key === 'kontrol_gerekli' && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                {key === 'bekleniyor' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                {key === 'tamamlandi' && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                {label}
                <span className={`text-xs px-1 py-0.5 rounded-full ${takipFilter === key ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>{cnt}</span>
              </button>
            ))}
          </div>

          {(uyariFilter !== 'tumu' || sureFilter !== 'tumu' || takipFilter !== 'tumu' || search) && (
            <button
              onClick={() => { setUyariFilter('tumu'); setSureFilter('tumu'); setTakipFilter('tumu'); setSearch('') }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              Temizle
            </button>
          )}

          <span className="text-sm text-gray-400 ml-auto">{filtered.length} kayıt</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ad Soyad</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">E-Posta</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Taşınma Tarihi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Geçen Süre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Uyarı Sayısı</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Kar. Envanter</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Dis. Envanter</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Oryantasyon</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Haftalık Takip</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-400">Kayıt bulunamadı</td>
                    </tr>
                  ) : (
                    paged.map((row, i) => {
                      const name = (row.full_name || '') || '-'
                      const email = (row.email || '') || '-'
                      const tasks = taskMap[row.id] || {}
                      const uyariColors = getUyariColor(row._uyariSayisi)
                      const sureStatus = getSureStatus(row._gun)

                      const tasinmaTarihiStr = row._tasinmaTarihi
                        ? row._tasinmaTarihi.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-'

                      return (
                        <tr
                          key={i}
                          onClick={() => setSelectedUye(row)}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                          row._takip.durum === 'deaktive_hazir' ? 'bg-red-50/50' :
                          row._takip.durum === 'kontrol_gerekli' ? 'bg-amber-50/30' :
                          row._takip.durum === 'tamamlandi' ? 'bg-green-50/30' :
                          sureStatus.bgColor
                        }`}>
                          <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{email}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{tasinmaTarihiStr}</td>
                          <td className="px-4 py-3">
                            {row._gun !== null ? (
                              <span className={`text-sm ${sureStatus.color}`}>
                                {sureStatus.label}
                                {row._gun > 21 && <ExclamationTriangleIcon className="w-3.5 h-3.5 inline ml-1 text-red-500" />}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={uyariColors.badge}>
                              {row._uyariSayisi} Uyarı
                            </Badge>
                          </td>
                          {(['karakteristik_envanter', 'disipliner_envanter', 'oryantasyon'] as const).map((taskType) => {
                            const taskInfo = tasks[taskType]
                            const done = !!taskInfo?.completed
                            const isToggling = togglingTask === `${row.id}-${taskType}`
                            const tooltip = done
                              ? `${taskInfo?.completed_by || '?'} tarafından tamamlandı${taskInfo?.completed_at ? ` (${new Date(taskInfo.completed_at).toLocaleDateString('tr-TR')})` : ''}`
                              : 'Tamamla'
                            return (
                              <td key={taskType} className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <button
                                    onClick={() => toggleTask(row.id, taskType, done)}
                                    disabled={isToggling}
                                    className="inline-flex items-center justify-center disabled:opacity-50"
                                    title={tooltip}
                                  >
                                    {isToggling ? (
                                      <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                    ) : done ? (
                                      <CheckCircleSolid className="w-5 h-5 text-green-500 hover:text-green-600 transition-colors" />
                                    ) : (
                                      <CheckCircleIcon className="w-5 h-5 text-gray-300 hover:text-gray-400 transition-colors" />
                                    )}
                                  </button>
                                  {done && taskInfo?.completed_by && (
                                    <span className="text-[10px] text-gray-400 leading-tight">{taskInfo.completed_by}</span>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-center">
                            {row._takip.durum === 'tamamlandi' ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Tamam</Badge>
                            ) : row._takip.durum === 'deaktive_hazir' ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Deaktive edilmeli</Badge>
                            ) : row._takip.durum === 'kontrol_gerekli' ? (
                              <div className="flex flex-col items-center">
                                <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] animate-pulse">Kontrol gerekli</Badge>
                                {row._takip.sonKontrolTarih && (
                                  <span className="text-[10px] text-gray-400 mt-0.5">Son: {new Date(row._takip.sonKontrolTarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Badge className="bg-yellow-50 text-yellow-600 border-yellow-200 text-[10px]">{row._takip.label}</Badge>
                                {row._takip.sonKontrolTarih && (
                                  <span className="text-[10px] text-gray-400 mt-0.5">Son: {new Date(row._takip.sonKontrolTarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {isDeactivateEligible(row.id) ? (
                              <button
                                onClick={() => handleDeactivate(row.id, name)}
                                disabled={deactivateLoading === row.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors disabled:opacity-50"
                                title="2 uyarı + 2 hafta geçti, görevler eksik — deaktive et"
                              >
                                {deactivateLoading === row.id ? (
                                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                )}
                                Deaktive Et
                              </button>
                            ) : (
                              <button
                                onClick={() => addWarning(row.id, name)}
                                disabled={warningLoading === row.id || row._uyariSayisi >= 2}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                  row._uyariSayisi >= 2
                                    ? 'bg-gray-50 text-gray-400 border border-gray-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                }`}
                                title={row._uyariSayisi >= 2 ? '2 uyarı verildi, 2 hafta bekleniyor' : 'Circle üzerinden uyarıldı olarak işaretle'}
                              >
                                {warningLoading === row.id ? (
                                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <BellAlertIcon className="w-3.5 h-3.5" />
                                )}
                                {row._uyariSayisi >= 2 ? 'Bekleniyor' : 'Uyar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  {filtered.length} sonuctan {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} arası
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Önceki</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                        <button onClick={() => setPage(p)} className={`px-3 py-1.5 text-sm rounded-md border ${p === page ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>{p}</button>
                      </span>
                    ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Sonraki</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Üye Detay Modalı */}
      <UyeDetailModal
        data={selectedUye}
        onClose={() => setSelectedUye(null)}
        onUpdate={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

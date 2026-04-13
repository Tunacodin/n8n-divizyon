'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
// DB field names used directly
import { Badge } from '@/components/ui/badge'
import { ExclamationTriangleIcon, XMarkIcon, ClockIcon, CheckCircleIcon, BellAlertIcon, FunnelIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import UyeDetailModal from '@/components/oryantasyon/UyeDetailModal'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

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
type InventoryRow = { email: string; test_type: string; discipline: string | null }
type InventoryMap = Record<string, { disciplines: string[]; emailMismatch: boolean }>

const DISCIPLINE_LABEL: Record<string, string> = {
  kreatif_yapim: 'Kreatif Yapım',
  dijital_deneyim: 'Dijital Deneyim',
  dijital_urun: 'Dijital Ürün',
}

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
  const [inventoryMap, setInventoryMap] = useState<InventoryMap>({})
  const [togglingTask, setTogglingTask] = useState<string | null>(null)
  const [warningLoading, setWarningLoading] = useState<string | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState<string | null>(null)
  const [promoteLoading, setPromoteLoading] = useState<string | null>(null)
  const [pendingPromote, setPendingPromote] = useState<{ appId: string; name: string } | null>(null)
  const [promotePerson, setPromotePerson] = useState('')
  const [promoteNote, setPromoteNote] = useState('')
  const [pendingDeactivate, setPendingDeactivate] = useState<{ appId: string; name: string } | null>(null)
  const [deactivatePerson, setDeactivatePerson] = useState('')
  const [deactivateNote, setDeactivateNote] = useState('')
  const [selectedUye, setSelectedUye] = useState<Record<string, any> | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    try {
      // Tek toplu çağrı — N+1 yok
      const res = await fetch('/api/applications?status=kesin_kabul,nihai_olmayan&with=tasks,warnings,inventory&limit=1000').then(r => r.json())
      if (!res.success) return
      setData(res.data || [])
      const tMap: TaskMap = {}
      const wMap: Record<string, { count: number; lastWarningAt: string | null }> = {}
      const iMap: InventoryMap = {}
      for (const app of (res.data || []) as Record<string, any>[]) {
        tMap[app.id] = {}
        for (const t of (app.tasks || [])) {
          tMap[app.id][t.task_type] = {
            completed: !!t.completed,
            completed_by: t.verified_by,
            completed_at: t.completed_at,
          }
        }
        const warnings = app.warnings || []
        // En yeni uyarıyı bul
        const sortedW = [...warnings].sort((a: any, b: any) =>
          String(b.warned_at || '').localeCompare(String(a.warned_at || ''))
        )
        const lastW = sortedW[0] || null
        wMap[app.id] = {
          count: warnings.length,
          lastWarningAt: lastW?.warned_at || null,
        }
        const invTests: InventoryRow[] = app.inventory_tests || []
        const disciplines = Array.from(new Set(
          invTests.filter((i) => i.test_type === 'disipliner_envanter' && i.discipline).map((i) => i.discipline as string)
        ))
        const appEmail = String(app.email || '').toLowerCase().trim()
        const emailMismatch = invTests.some(
          (i) => !!i.email && i.email.toLowerCase().trim() !== appEmail
        )
        iMap[app.id] = { disciplines, emailMismatch }
      }
      setTaskMap(tMap)
      setWarningsMap(wMap)
      setInventoryMap(iMap)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadData().catch(()=>{})
      .finally(() => setLoading(false))
  }, [loadData])

  useRealtimeRefresh(['applications', 'task_completions', 'inventory_tests', 'warnings'], loadData)

  const [pendingTaskAction, setPendingTaskAction] = useState<{ appId: string; taskType: string } | null>(null)
  const [pendingPerson, setPendingPerson] = useState('')
  const [pendingDiscipline, setPendingDiscipline] = useState<string>('')

  const toggleTask = async (appId: string, taskType: string, current: boolean) => {
    if (!current) {
      setPendingTaskAction({ appId, taskType })
      setPendingPerson('')
      setPendingDiscipline('')
      return
    }
    await submitTaskAction(appId, taskType, true, 'dashboard')
  }

  const submitTaskAction = async (
    appId: string,
    taskType: string,
    current: boolean,
    completedBy: string,
    discipline?: string
  ) => {
    const key = `${appId}-${taskType}`
    setTogglingTask(key)
    setPendingTaskAction(null)

    try {
      const payload: Record<string, unknown> = {
        task_type: taskType,
        completed: !current,
        completed_by: completedBy,
      }
      if (!current) {
        payload.source = 'admin_manual'
        if (taskType === 'disipliner_envanter' && discipline) {
          payload.discipline = discipline
        }
      }
      const res = await fetch(`/api/applications/${appId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (result.success) {
        setTaskMap((prev) => ({
          ...prev,
          [appId]: {
            ...(prev[appId] || {}),
            [taskType]: {
              completed: !current,
              completed_by: !current ? `admin_manual:${completedBy}` : undefined,
              completed_at: !current ? new Date().toISOString() : undefined,
            },
          },
        }))
        if (!current && taskType === 'disipliner_envanter' && discipline) {
          setInventoryMap((prev) => {
            const curr = prev[appId] || { disciplines: [], emailMismatch: false }
            if (curr.disciplines.includes(discipline)) return prev
            return {
              ...prev,
              [appId]: { ...curr, disciplines: [...curr.disciplines, discipline] },
            }
          })
        }
      }
    } catch { /* ignore */ }
    setTogglingTask(null)
  }

  const [pendingWarning, setPendingWarning] = useState<{ appId: string; name: string } | null>(null)
  const [pendingWarnedBy, setPendingWarnedBy] = useState('')
  const [pendingFormType, setPendingFormType] = useState<string>('')
  const [pendingWarnReason, setPendingWarnReason] = useState('')

  const addWarning = (appId: string, name: string) => {
    setPendingWarning({ appId, name })
    setPendingWarnedBy('')
    setPendingFormType('')
    setPendingWarnReason("Haftalık kontrol — eksik görevler hakkında Circle üzerinden bilgilendirildi.")
  }

  const submitWarning = async () => {
    if (!pendingWarning || !pendingWarnedBy) return
    const appId = pendingWarning.appId
    setWarningLoading(appId)
    const warnedBy = pendingWarnedBy
    const formType = pendingFormType || null
    const reason = pendingWarnReason || null
    setPendingWarning(null)
    try {
      const res = await fetch(`/api/applications/${appId}/warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warned_by: warnedBy, reason, form_type: formType }),
      })
      const result = await res.json()
      if (result.success) {
        setData((prev) =>
          prev.map((d) => d.id === appId ? { ...d, warning_count: (d.warning_count || 0) + 1 } : d)
        )
        setWarningsMap((prev) => ({
          ...prev,
          [appId]: {
            count: (prev[appId]?.count || 0) + 1,
            lastWarningAt: new Date().toISOString(),
          },
        }))
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

  const handlePromoteToNihaiUye = (appId: string, name: string) => {
    setPendingPromote({ appId, name })
    setPromotePerson('')
    setPromoteNote('')
  }

  const submitPromote = async () => {
    if (!pendingPromote || !promotePerson.trim() || !promoteNote.trim()) return
    const appId = pendingPromote.appId
    setPromoteLoading(appId)
    setPendingPromote(null)
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: 'nihai_uye',
          changed_by: promotePerson,
          reason: promoteNote,
          extra_updates: { reviewer: promotePerson, review_note: promoteNote },
        }),
      })
      const result = await res.json()
      if (result.success) {
        setData((prev) => prev.filter((d) => d.id !== appId))
      } else {
        alert(result.error || 'Taşıma başarısız')
      }
    } catch { alert('Bağlantı hatası') }
    setPromoteLoading(null)
  }

  const handleDeactivate = (appId: string, name: string) => {
    setPendingDeactivate({ appId, name })
    setDeactivatePerson('')
    setDeactivateNote('2 uyarı sonrası 2 hafta içinde görevler tamamlanmadı')
  }

  const submitDeactivate = async () => {
    if (!pendingDeactivate || !deactivatePerson.trim() || !deactivateNote.trim()) return
    const appId = pendingDeactivate.appId
    setDeactivateLoading(appId)
    setPendingDeactivate(null)
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: 'deaktive',
          changed_by: deactivatePerson,
          reason: deactivateNote,
          extra_updates: { reviewer: deactivatePerson, review_note: deactivateNote },
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
      const approvedRaw = row.approved_at || row.submitted_at
      const tasinmaTarihi = approvedRaw ? new Date(approvedRaw) : null
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

  // Filtre dropdown dışına tıklayınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  const activeFilterCount = (uyariFilter !== 'tumu' ? 1 : 0) + (sureFilter !== 'tumu' ? 1 : 0) + (takipFilter !== 'tumu' ? 1 : 0)

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="p-6">
        {/* Compact toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Ad soyad veya e-posta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-w-[220px]"
          />

          {/* Filter dropdown */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                activeFilterCount > 0
                  ? 'border-purple-300 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filtrele
              {activeFilterCount > 0 && (
                <span className="bg-purple-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-30 p-4 space-y-4">
                {/* Uyarı */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Uyarı Sayısı</label>
                  <div className="flex gap-1">
                    {(['tumu', '0', '1', '2'] as UyariFilter[]).map((f) => {
                      const label = f === 'tumu' ? 'Tümü' : f
                      const cnt = f === 'tumu' ? counts.tumu : f === '0' ? counts.u0 : f === '1' ? counts.u1 : counts.u2
                      return (
                        <button key={f} onClick={() => setUyariFilter(f)}
                          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            uyariFilter === f ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {label} <span className="opacity-60">({cnt})</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Süre */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Geçen Süre</label>
                  <select
                    value={sureFilter}
                    onChange={(e) => setSureFilter(e.target.value as SureFilter)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="tumu">Tümü</option>
                    <option value="kritik">Kritik (21+ gün)</option>
                    <option value="uyari">Uyarı (14–21 gün)</option>
                    <option value="normal">Normal (0–14 gün)</option>
                  </select>
                </div>

                {/* Takip */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Haftalık Takip</label>
                  <div className="flex flex-col gap-1">
                    {([
                      { key: 'tumu' as TakipFilter, label: 'Tümü', cnt: counts.tumu, dot: '' },
                      { key: 'kontrol_gerekli' as TakipFilter, label: 'Kontrol Gerekli', cnt: counts.kontrolGerekli, dot: 'bg-red-400' },
                      { key: 'bekleniyor' as TakipFilter, label: 'Bekleniyor', cnt: counts.bekleniyor, dot: 'bg-yellow-400' },
                      { key: 'tamamlandi' as TakipFilter, label: 'Tamamlandı', cnt: counts.tamamlandi, dot: 'bg-green-400' },
                    ]).map(({ key, label, cnt, dot }) => (
                      <button key={key} onClick={() => setTakipFilter(key)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                          takipFilter === key ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                        {label}
                        <span className="ml-auto opacity-60">{cnt}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setUyariFilter('tumu'); setSureFilter('tumu'); setTakipFilter('tumu') }}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick stats inline */}
          <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
            {counts.kritik > 0 && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                {counts.kritik} kritik
              </span>
            )}
            <span>{counts.karDone}/{counts.tumu} envanter</span>
            <span>{counts.oryDone}/{counts.tumu} oryantasyon</span>
            <span className="text-gray-400">{filtered.length} kayıt</span>
          </div>
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
                      const isProtected = !!(row as { is_protected?: boolean }).is_protected
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
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <div className="flex items-center gap-1.5">
                              {name}
                              {isProtected && (
                                <span title="Korumalı (Circle üyesi) — değiştirilemez" className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                                  🔒
                                </span>
                              )}
                              {inventoryMap[row.id]?.emailMismatch && (
                                <span title="Envanter testindeki e-posta farklı — ad-soyad ile eşleştirildi" className="inline-flex items-center text-amber-600">
                                  <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </td>
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
                            const verifiedRaw = taskInfo?.completed_by || ''
                            const isManual = verifiedRaw.startsWith('admin_manual:')
                            const verifiedShort = isManual ? verifiedRaw.replace('admin_manual:', '') : verifiedRaw
                            const disciplines = taskType === 'disipliner_envanter' ? (inventoryMap[row.id]?.disciplines || []) : []
                            const tooltip = done
                              ? `${verifiedShort || '?'}${isManual ? ' (manuel)' : ''}${taskInfo?.completed_at ? ` — ${new Date(taskInfo.completed_at).toLocaleDateString('tr-TR')}` : ''}${disciplines.length ? ` — ${disciplines.map((d) => DISCIPLINE_LABEL[d] ?? d).join(', ')}` : ''}`
                              : 'Tamamla'
                            return (
                              <td key={taskType} className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <button
                                    onClick={() => toggleTask(row.id, taskType, done)}
                                    disabled={isToggling || isProtected}
                                    className="inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={isProtected ? 'Korumalı kayıt — değiştirilemez' : tooltip}
                                  >
                                    {isToggling ? (
                                      <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                    ) : done ? (
                                      <CheckCircleSolid className={`w-5 h-5 transition-colors ${isManual ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}`} />
                                    ) : (
                                      <CheckCircleIcon className="w-5 h-5 text-gray-300 hover:text-gray-400 transition-colors" />
                                    )}
                                  </button>
                                  {taskType === 'disipliner_envanter' && disciplines.length > 0 && (
                                    <span className="text-[10px] text-gray-500 leading-tight">
                                      {disciplines.map((d) => DISCIPLINE_LABEL[d] ?? d).join(', ')}
                                    </span>
                                  )}
                                  {done && verifiedShort && !(taskType === 'disipliner_envanter' && disciplines.length > 0) && (
                                    <span className="text-[10px] text-gray-400 leading-tight">{verifiedShort}</span>
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
                            {isProtected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200" title="Korumalı kayıt — aksiyon devre dışı">
                                🔒 Korumalı
                              </span>
                            ) : row._takip.durum === 'tamamlandi' ? (
                              <button
                                onClick={() => handlePromoteToNihaiUye(row.id, name)}
                                disabled={promoteLoading === row.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                                title="3 görev tamam — nihai ağ üyesine taşı"
                              >
                                {promoteLoading === row.id ? (
                                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <CheckCircleSolid className="w-3.5 h-3.5" />
                                )}
                                Nihai Üye'ye Taşı
                              </button>
                            ) : isDeactivateEligible(row.id) ? (
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

      {/* Görev tamamlama — kişi (+ disipliner için discipline) seçim dialog */}
      {pendingTaskAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingTaskAction(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xs p-5 mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Manuel olarak tamamlandı</h3>
            <p className="text-xs text-gray-500 mb-3">Bu işaret audit log'a "admin_manual" olarak yazılır.</p>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Kim işaretliyor?</label>
            <select
              value={pendingPerson}
              onChange={(e) => setPendingPerson(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-400 outline-none mb-3"
            >
              <option value="">Kişi seç...</option>
              <option value="Tuna">Tuna</option>
              <option value="Taha">Taha</option>
            </select>
            {pendingTaskAction.taskType === 'disipliner_envanter' && (
              <>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Hangi disiplin?</label>
                <select
                  value={pendingDiscipline}
                  onChange={(e) => setPendingDiscipline(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-400 outline-none mb-3"
                >
                  <option value="">Disiplin seç...</option>
                  <option value="kreatif_yapim">Kreatif Yapım</option>
                  <option value="dijital_deneyim">Dijital Deneyim</option>
                  <option value="dijital_urun">Dijital Ürün</option>
                </select>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={() => setPendingTaskAction(null)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">İptal</button>
              <button
                onClick={() => {
                  if (!pendingPerson) return
                  if (pendingTaskAction.taskType === 'disipliner_envanter' && !pendingDiscipline) return
                  submitTaskAction(
                    pendingTaskAction.appId,
                    pendingTaskAction.taskType,
                    false,
                    pendingPerson,
                    pendingDiscipline || undefined,
                  )
                }}
                disabled={!pendingPerson || (pendingTaskAction.taskType === 'disipliner_envanter' && !pendingDiscipline)}
                className="flex-1 px-3 py-2 text-sm text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uyarı dialog */}
      {pendingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingWarning(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5 mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Uyarı kaydı ekle</h3>
            <p className="text-xs text-gray-500 mb-3">{pendingWarning.name} için Circle üzerinden atılan mesajı kaydeder.</p>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Hangi form için?</label>
            <select
              value={pendingFormType}
              onChange={(e) => setPendingFormType(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-400 outline-none mb-3"
            >
              <option value="">Genel uyarı</option>
              <option value="karakteristik_envanter">Karakteristik envanter</option>
              <option value="disipliner_envanter">Disipliner envanter</option>
            </select>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Kim uyardı?</label>
            <select
              value={pendingWarnedBy}
              onChange={(e) => setPendingWarnedBy(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-400 outline-none mb-3"
            >
              <option value="">Kişi seç...</option>
              <option value="Tuna">Tuna</option>
              <option value="Taha">Taha</option>
            </select>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Sebep / not</label>
            <textarea
              value={pendingWarnReason}
              onChange={(e) => setPendingWarnReason(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-400 outline-none mb-3 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setPendingWarning(null)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">İptal</button>
              <button
                onClick={submitWarning}
                disabled={!pendingWarnedBy}
                className="flex-1 px-3 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nihai Üye'ye taşı onay dialog */}
      {pendingPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingPromote(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5 mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Nihai Üye'ye Taşı</h3>
            <p className="text-xs text-gray-500 mb-3">{pendingPromote.name} 3 görevi tamamladı. Nihai Ağ Üyesi'ne taşınacak.</p>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Onaylayan kişi <span className="text-red-500">*</span>
            </label>
            <select
              value={promotePerson}
              onChange={(e) => setPromotePerson(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-400 outline-none mb-3"
            >
              <option value="">Kişi seç...</option>
              <option value="Tuna">Tuna</option>
              <option value="Taha">Taha</option>
            </select>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Not <span className="text-red-500">*</span>
            </label>
            <textarea
              value={promoteNote}
              onChange={(e) => setPromoteNote(e.target.value)}
              rows={3}
              placeholder="Taşıma sebebi / not..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-400 outline-none mb-3 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setPendingPromote(null)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">İptal</button>
              <button
                onClick={submitPromote}
                disabled={!promotePerson.trim() || !promoteNote.trim()}
                title={(!promotePerson.trim() || !promoteNote.trim()) ? 'Onaylayan ve not zorunlu' : ''}
                className="flex-1 px-3 py-2 text-sm text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Taşı
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deaktive Et onay dialog */}
      {pendingDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingDeactivate(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5 mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Deaktive Et</h3>
            <p className="text-xs text-gray-500 mb-3">
              {pendingDeactivate.name} 2 uyarıya rağmen 2 hafta içinde görevlerini tamamlamadı.
            </p>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Onaylayan kişi <span className="text-red-500">*</span>
            </label>
            <select
              value={deactivatePerson}
              onChange={(e) => setDeactivatePerson(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-400 outline-none mb-3"
            >
              <option value="">Kişi seç...</option>
              <option value="Tuna">Tuna</option>
              <option value="Taha">Taha</option>
            </select>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Not <span className="text-red-500">*</span>
            </label>
            <textarea
              value={deactivateNote}
              onChange={(e) => setDeactivateNote(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-400 outline-none mb-3 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setPendingDeactivate(null)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">İptal</button>
              <button
                onClick={submitDeactivate}
                disabled={!deactivatePerson.trim() || !deactivateNote.trim()}
                title={(!deactivatePerson.trim() || !deactivateNote.trim()) ? 'Onaylayan ve not zorunlu' : ''}
                className="flex-1 px-3 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Deaktive Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Üye Detay Modalı */}
      <UyeDetailModal
        data={selectedUye}
        onClose={() => setSelectedUye(null)}
        onUpdate={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  PhoneIcon,
  AcademicCapIcon,
  TagIcon,
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline'
import { Dialog } from '@/components/ui/Dialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

interface TaskCompletion {
  task_type: string
  completed: boolean
  completed_at?: string | null
  verified_by?: string | null
}

interface WarningRecord {
  id?: string
  warning_number: number
  warned_by: string
  reason?: string | null
  warned_at?: string | null
  form_type?: string | null
}

interface MemberData {
  id: string
  full_name: string
  email: string
  phone?: string
  status: string
  is_protected?: boolean
  university?: string
  department?: string
  main_role?: string
  tasks?: TaskCompletion[]
  warnings?: WarningRecord[]
  warning_count?: number
  tags?: string[]
  [key: string]: unknown
}

interface Props {
  data: MemberData | null
  onClose: () => void
}

const TASK_DEFS: { key: string; label: string }[] = [
  { key: 'karakteristik_envanter', label: 'Karakteristik Envanter' },
  { key: 'disipliner_envanter',    label: 'Disipliner Envanter' },
  { key: 'oryantasyon',            label: 'Oryantasyon' },
]

const WARNED_BY_OPTIONS = ['Tuna', 'Taha']

const FORM_TYPE_OPTIONS: { key: string; label: string }[] = [
  { key: '',                      label: 'Genel' },
  { key: 'karakteristik_envanter', label: 'Karakteristik Envanter' },
  { key: 'disipliner_envanter',    label: 'Disipliner Envanter' },
]

const DEFAULT_REASON = 'Haftalık kontrol — eksik görevler hakkında Circle üzerinden bilgilendirildi.'

function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function MemberDetailModal({ data, onClose }: Props) {
  const [localWarnings, setLocalWarnings] = useState<WarningRecord[]>([])
  const [localCount, setLocalCount] = useState<number>(0)
  const [localTasks, setLocalTasks] = useState<TaskCompletion[]>([])

  const [warnFormOpen, setWarnFormOpen] = useState(false)
  const [warnedBy, setWarnedBy] = useState('')
  const [warnReason, setWarnReason] = useState(DEFAULT_REASON)
  const [warnFormType, setWarnFormType] = useState('')
  const [warnSubmitting, setWarnSubmitting] = useState(false)
  const [warnError, setWarnError] = useState('')

  // Task edit state
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [taskApprover, setTaskApprover] = useState('')
  const [taskNote, setTaskNote] = useState('')
  const [taskSubmitting, setTaskSubmitting] = useState(false)
  const [taskError, setTaskError] = useState('')

  // data değişince local state'i sıfırla
  useEffect(() => {
    if (data) {
      setLocalWarnings(data.warnings || [])
      setLocalCount(data.warning_count ?? (data.warnings?.length ?? 0))
      setLocalTasks(data.tasks || [])
      setWarnFormOpen(false)
      setWarnedBy('')
      setWarnReason(DEFAULT_REASON)
      setWarnFormType('')
      setWarnSubmitting(false)
      setWarnError('')
      setEditingTask(null)
      setTaskApprover('')
      setTaskNote('')
      setTaskSubmitting(false)
      setTaskError('')
    }
  }, [data?.id])

  if (!data) return <Dialog open={false} onClose={onClose}>{null}</Dialog>

  const initials = data.full_name
    .split(' ')
    .map(p => p.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const taskMap = new Map(
    localTasks.map(t => [t.task_type, t])
  )

  const startTaskEdit = (taskType: string) => {
    const existing = taskMap.get(taskType)
    setEditingTask(taskType)
    setTaskApprover(existing?.verified_by?.replace(/^admin_manual:/, '') || '')
    setTaskNote('')
    setTaskError('')
  }

  const cancelTaskEdit = () => {
    setEditingTask(null)
    setTaskApprover('')
    setTaskNote('')
    setTaskError('')
  }

  const submitTask = async (taskType: string, completed: boolean) => {
    if (completed && !taskApprover) {
      setTaskError('Onaylayan seçilmeli')
      return
    }
    setTaskSubmitting(true)
    setTaskError('')
    try {
      const res = await fetch(`/api/applications/${data.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: taskType,
          completed,
          completed_by: taskApprover || 'dashboard',
          source: 'admin_manual',
          manual_note: taskNote || undefined,
        }),
      })
      const result = await res.json()
      if (!result.success) {
        setTaskError(result.error || 'Görev güncellenemedi')
        setTaskSubmitting(false)
        return
      }
      // Local state güncelle
      const nowIso = new Date().toISOString()
      setLocalTasks(prev => {
        const idx = prev.findIndex(t => t.task_type === taskType)
        const next: TaskCompletion = {
          task_type: taskType,
          completed,
          completed_at: completed ? nowIso : null,
          verified_by: completed ? `admin_manual:${taskApprover || 'dashboard'}` : null,
        }
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = next
          return copy
        }
        return [...prev, next]
      })
      cancelTaskEdit()
    } catch (e) {
      setTaskError(e instanceof Error ? e.message : 'Bağlantı hatası')
    } finally {
      setTaskSubmitting(false)
    }
  }

  const warnings = [...localWarnings].sort((a, b) => {
    const ta = new Date(a.warned_at || 0).getTime()
    const tb = new Date(b.warned_at || 0).getTime()
    return tb - ta
  })
  const warningCount = localCount
  const wcCritical = warningCount >= 2

  const tags = data.tags || []

  const tasksDone = TASK_DEFS.filter(td => taskMap.get(td.key)?.completed).length
  const tasksTotal = TASK_DEFS.length

  const canWarn = !data.is_protected && warningCount < 2

  const submitWarning = async () => {
    if (!warnedBy) {
      setWarnError('Uyaran kişi seçilmeli')
      return
    }
    setWarnError('')
    setWarnSubmitting(true)
    try {
      const res = await fetch(`/api/applications/${data.id}/warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warned_by: warnedBy,
          reason: warnReason || null,
          form_type: warnFormType || null,
        }),
      })
      const result = await res.json()
      if (!result.success) {
        setWarnError(result.error || 'Uyarı eklenemedi')
        setWarnSubmitting(false)
        return
      }
      // Local state güncelle
      const nextNumber = warningCount + 1
      const newWarning: WarningRecord = {
        id: result.data?.id,
        warning_number: nextNumber,
        warned_by: warnedBy,
        reason: warnReason || null,
        warned_at: result.data?.warned_at || new Date().toISOString(),
        form_type: warnFormType || null,
      }
      setLocalWarnings(prev => [newWarning, ...prev])
      setLocalCount(nextNumber)
      // Formu kapat + sıfırla
      setWarnFormOpen(false)
      setWarnedBy('')
      setWarnReason(DEFAULT_REASON)
      setWarnFormType('')
    } catch (e) {
      setWarnError(e instanceof Error ? e.message : 'Bağlantı hatası')
    } finally {
      setWarnSubmitting(false)
    }
  }

  return (
    <Dialog open={!!data} onClose={onClose} size="lg">
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-base font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 pr-12">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-foreground truncate">{data.full_name}</h2>
                {data.is_protected && (
                  <span
                    className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold shrink-0"
                    title="Korumalı (Circle üyesi)"
                  >
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <EnvelopeIcon className="w-3 h-3" />
                  {data.email}
                </span>
                {data.phone && (
                  <span className="inline-flex items-center gap-1">
                    <PhoneIcon className="w-3 h-3" />
                    {data.phone}
                  </span>
                )}
                {(data.university || data.department) && (
                  <span className="inline-flex items-center gap-1">
                    <AcademicCapIcon className="w-3 h-3" />
                    {[data.university, data.department].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={data.status} size="sm" />
                <span className="text-[11px] text-muted-foreground">
                  Görev <span className="font-semibold text-foreground tabular-nums">{tasksDone}/{tasksTotal}</span>
                </span>
                {warningCount > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
                      wcCritical ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'
                    )}
                    title={wcCritical ? `${warningCount} uyarı — kritik (Circle deaktif eşiği)` : `${warningCount} uyarı`}
                  >
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    {warningCount} uyarı
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Görev Durumu */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Görev Durumu
              </h3>
              {!data.is_protected && (
                <span className="text-[10px] text-muted-foreground">Manuel düzenleme — sheet üzerinden de güncellenir</span>
              )}
            </div>
            <ul className="space-y-1.5">
              {TASK_DEFS.map(td => {
                const t = taskMap.get(td.key)
                const done = !!t?.completed
                const isEditing = editingTask === td.key
                const verifiedDisplay = t?.verified_by?.replace(/^admin_manual:/, '') || ''
                const isManual = !!t?.verified_by?.startsWith('admin_manual:')
                return (
                  <li key={td.key} className={cn(
                    'rounded-lg transition-colors',
                    isEditing ? 'bg-primary/5 border border-primary/30 p-3' : 'bg-muted/30'
                  )}>
                    {!isEditing ? (
                      <div className="flex items-center gap-3 px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0',
                            done ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                          )}
                        >
                          {done ? <CheckCircleIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            {td.label}
                            {isManual && (
                              <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary" title="Manuel düzenlenmiş">
                                manuel
                              </span>
                            )}
                          </p>
                          {done && (verifiedDisplay || t?.completed_at) && (
                            <p className="text-[11px] text-muted-foreground">
                              {verifiedDisplay && <span>Onaylayan: <span className="text-foreground">{verifiedDisplay}</span></span>}
                              {verifiedDisplay && t?.completed_at && <span> · </span>}
                              {t?.completed_at && <span>{formatDate(t.completed_at)}</span>}
                            </p>
                          )}
                          {!done && (
                            <p className="text-[11px] text-muted-foreground">Tamamlanmadı</p>
                          )}
                        </div>
                        {!data.is_protected && (
                          <button
                            type="button"
                            onClick={() => startTaskEdit(td.key)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer shrink-0"
                            title="Manuel düzenle"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                            Düzenle
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0',
                              done ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                            )}
                          >
                            {done ? <CheckCircleIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                          </span>
                          <p className="text-sm font-medium text-foreground flex-1">{td.label}</p>
                          <button
                            type="button"
                            onClick={cancelTaskEdit}
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            aria-label="İptal"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                              Onaylayan <span className="text-destructive">*</span>
                            </label>
                            <select
                              value={taskApprover}
                              onChange={e => setTaskApprover(e.target.value)}
                              className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-card focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                            >
                              <option value="">Seç...</option>
                              {WARNED_BY_OPTIONS.map(o => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                              Not (opsiyonel)
                            </label>
                            <input
                              type="text"
                              value={taskNote}
                              onChange={e => setTaskNote(e.target.value)}
                              placeholder="örn. Manuel onay..."
                              className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-card focus:ring-2 focus:ring-ring outline-none"
                            />
                          </div>
                        </div>

                        {taskError && (
                          <p className="text-[11px] text-destructive">{taskError}</p>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1">
                          {done && (
                            <button
                              type="button"
                              onClick={() => submitTask(td.key, false)}
                              disabled={taskSubmitting}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <ArrowUturnLeftIcon className="w-3 h-3" />
                              Geri Al
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={cancelTaskEdit}
                            disabled={taskSubmitting}
                            className="px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                          >
                            İptal
                          </button>
                          <button
                            type="button"
                            onClick={() => submitTask(td.key, true)}
                            disabled={taskSubmitting || !taskApprover}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-success-foreground bg-success hover:bg-success/90 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {taskSubmitting ? 'Kaydediliyor...' : done ? 'Onayı Güncelle' : 'Tamamlandı İşaretle'}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Uyarılar */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Uyarılar
              </h3>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-[11px] font-semibold tabular-nums',
                  wcCritical ? 'text-destructive' : warningCount > 0 ? 'text-warning' : 'text-muted-foreground'
                )}>
                  {warningCount}/2
                  {wcCritical && ' — Circle deaktif eşiği'}
                </span>
                {canWarn && !warnFormOpen && (
                  <button
                    type="button"
                    onClick={() => setWarnFormOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-warning bg-warning/10 hover:bg-warning/20 border border-warning/30 rounded-md transition-colors cursor-pointer"
                  >
                    <PlusIcon className="w-3 h-3" />
                    Uyar
                  </button>
                )}
                {data.is_protected && (
                  <span className="text-[10px] text-muted-foreground">Korumalı — uyarı eklenemez</span>
                )}
              </div>
            </div>

            {/* Uyar formu */}
            {warnFormOpen && (
              <div className="mb-2 p-3 rounded-lg border border-warning/30 bg-warning/5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">Yeni uyarı ({warningCount + 1}/2)</p>
                  <button
                    type="button"
                    onClick={() => { setWarnFormOpen(false); setWarnError('') }}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    aria-label="İptal"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Uyaran <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={warnedBy}
                      onChange={e => setWarnedBy(e.target.value)}
                      className={cn(
                        'w-full text-xs border rounded-md px-2 py-1.5 bg-card focus:ring-2 focus:ring-ring outline-none cursor-pointer',
                        !warnedBy ? 'border-warning/40' : 'border-border'
                      )}
                    >
                      <option value="">Seç...</option>
                      {WARNED_BY_OPTIONS.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Bağlam
                    </label>
                    <select
                      value={warnFormType}
                      onChange={e => setWarnFormType(e.target.value)}
                      className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-card focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                    >
                      {FORM_TYPE_OPTIONS.map(o => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Sebep
                  </label>
                  <textarea
                    value={warnReason}
                    onChange={e => setWarnReason(e.target.value)}
                    rows={2}
                    placeholder="Uyarı sebebi..."
                    className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-card focus:ring-2 focus:ring-ring outline-none resize-none"
                  />
                </div>

                {warnError && (
                  <p className="text-[11px] text-destructive">{warnError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setWarnFormOpen(false); setWarnError('') }}
                    disabled={warnSubmitting}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={submitWarning}
                    disabled={warnSubmitting || !warnedBy}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-warning-foreground bg-warning hover:bg-warning/90 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {warnSubmitting ? 'Kaydediliyor...' : `Uyarıyı Kaydet (${warningCount + 1}.)`}
                  </button>
                </div>
              </div>
            )}

            {warnings.length === 0 ? (
              <div className="text-[11px] text-muted-foreground px-3 py-2 rounded-lg bg-muted/30">
                Uyarı yok
              </div>
            ) : (
              <ul className="space-y-1.5">
                {warnings.map((w, i) => (
                  <li
                    key={w.id || i}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2 rounded-lg',
                      w.warning_number >= 2 ? 'bg-destructive/10' : 'bg-warning/10'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 mt-0.5',
                        w.warning_number >= 2 ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-white'
                      )}
                    >
                      {w.warning_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {w.warned_by}
                        {w.warned_at && (
                          <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                            {formatDateTime(w.warned_at)}
                          </span>
                        )}
                        {w.form_type && (
                          <span className="ml-2 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-normal bg-muted text-muted-foreground">
                            {w.form_type === 'karakteristik_envanter' ? 'Karakteristik' : w.form_type === 'disipliner_envanter' ? 'Disipliner' : w.form_type}
                          </span>
                        )}
                      </p>
                      {w.reason && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{w.reason}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Tag'ler */}
          {tags.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                Tag&apos;ler
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Dialog>
  )
}

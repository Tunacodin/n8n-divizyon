'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BellAlertIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'

interface TaskCompletion {
  task_type: string
  completed: boolean
  completed_by?: string
  completed_at?: string
}

interface Warning {
  id: string
  warning_number: number
  warned_by: string
  reason?: string
  created_at: string
  is_active: boolean
}

interface UyeDetailModalProps {
  data: Record<string, any> | null
  onClose: () => void
  onUpdate?: () => void
}

const TASK_LABELS: Record<string, string> = {
  karakteristik_envanter: 'Karakteristik Envanter Testi',
  disipliner_envanter: 'Disipliner Envanter Testi',
  oryantasyon: 'Oryantasyon',
}

const TASK_TYPES = ['karakteristik_envanter', 'disipliner_envanter', 'oryantasyon'] as const

export default function UyeDetailModal({ data, onClose, onUpdate }: UyeDetailModalProps) {
  const [tasks, setTasks] = useState<TaskCompletion[]>([])
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingTask, setTogglingTask] = useState<string | null>(null)
  const [warningLoading, setWarningLoading] = useState(false)
  const [pendingTask, setPendingTask] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState('')

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (data) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      // Fetch detail
      setLoading(true)
      fetch(`/api/applications/${data.id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setTasks(res.data.tasks || [])
            setWarnings(res.data.warnings || [])
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [data, handleKeyDown])

  if (!data) return null

  const name = data.full_name || 'İsimsiz'
  const email = data.email || ''
  const phone = data.phone || ''
  const warningCount = data.warning_count || 0

  const initials = name.split(' ').map((p: string) => p.charAt(0)).join('').toUpperCase().slice(0, 2)
  const colors = ['bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-pink-500']
  const avatarColor = colors[name.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % colors.length]

  const getTaskStatus = (taskType: string) => tasks.find((t) => t.task_type === taskType)
  const allDone = TASK_TYPES.every((t) => getTaskStatus(t)?.completed)

  const toggleTask = async (taskType: string, current: boolean) => {
    // Tamamlama ise ve kişi seçimi gerekiyorsa dropdown göster
    if (!current) {
      setPendingTask(taskType)
      setSelectedPerson('')
      return
    }
    // Geri alma
    await submitTask(taskType, true, 'dashboard')
  }

  const submitTask = async (taskType: string, current: boolean, completedBy: string) => {
    setTogglingTask(taskType)
    setPendingTask(null)
    try {
      const res = await fetch(`/api/applications/${data.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: taskType, completed: !current, completed_by: completedBy }),
      })
      const result = await res.json()
      if (result.success) {
        setTasks((prev) => {
          const filtered = prev.filter((t) => t.task_type !== taskType)
          return [...filtered, { task_type: taskType, completed: !current, completed_by: !current ? completedBy : undefined, completed_at: !current ? new Date().toISOString() : undefined }]
        })
        onUpdate?.()
      }
    } catch { /* ignore */ }
    setTogglingTask(null)
  }

  const addWarning = async () => {
    const reason = prompt('Uyarı sebebi:', 'Haftalık kontrol — eksik görevler hakkında Circle üzerinden bilgilendirildi.')
    if (!reason) return
    const warnedBy = prompt('Uyarıyı veren kişi:')
    if (!warnedBy) return

    setWarningLoading(true)
    try {
      const res = await fetch(`/api/applications/${data.id}/warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warned_by: warnedBy, reason }),
      })
      const result = await res.json()
      if (result.success) {
        setWarnings((prev) => [...prev, result.data])
        data.warning_count = (data.warning_count || 0) + 1
        onUpdate?.()
      }
    } catch { /* ignore */ }
    setWarningLoading(false)
  }

  return (
    <AnimatePresence>
      {data && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-end p-4 pb-0">
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex flex-col items-center px-6 pb-6">
              {/* Avatar */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 ${avatarColor}`}>
                {initials}
              </div>
              <h2 className="text-lg font-bold text-gray-900 text-center">{name}</h2>
              {email && <p className="text-xs text-gray-400 mt-0.5">{email}</p>}
              {phone && <p className="text-xs text-gray-400">{phone}</p>}

              {/* Status badge */}
              <div className="mt-2">
                {allDone ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircleSolid className="w-3.5 h-3.5" /> Nihai üyeye hazır
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <ClockIcon className="w-3.5 h-3.5" /> Görevler devam ediyor
                  </span>
                )}
              </div>

              <div className="w-full border-t border-gray-200 my-5" />

              {/* Görevler */}
              <div className="w-full">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Görev Durumu</h3>

                {loading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {TASK_TYPES.map((taskType) => {
                      const task = getTaskStatus(taskType)
                      const done = !!task?.completed
                      const isToggling = togglingTask === taskType
                      return (
                        <div
                          key={taskType}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${done ? 'text-green-700' : 'text-gray-700'}`}>
                              {TASK_LABELS[taskType]}
                            </p>
                            {done && task?.completed_by && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {task.completed_by}
                                {task.completed_at && ` — ${new Date(task.completed_at).toLocaleDateString('tr-TR')}`}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => toggleTask(taskType, done)}
                            disabled={isToggling}
                            className="ml-3 shrink-0 disabled:opacity-50"
                            title={done ? 'Geri al' : 'Tamamla'}
                          >
                            {isToggling ? (
                              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : done ? (
                              <CheckCircleSolid className="w-6 h-6 text-green-500 hover:text-green-600 transition-colors" />
                            ) : (
                              <CheckCircleIcon className="w-6 h-6 text-gray-300 hover:text-gray-400 transition-colors" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Kişi seçim dropdown'ı */}
                {pendingTask && (
                  <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-indigo-700">
                      {TASK_LABELS[pendingTask]} — Kim tarafından yapıldı?
                    </p>
                    <select
                      value={selectedPerson}
                      onChange={(e) => setSelectedPerson(e.target.value)}
                      className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                    >
                      <option value="">Kişi seç...</option>
                      <option value="Tuna">Tuna</option>
                      <option value="Taha">Taha</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingTask(null)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        İptal
                      </button>
                      <button
                        onClick={() => selectedPerson && submitTask(pendingTask, false, selectedPerson)}
                        disabled={!selectedPerson}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                      >
                        Onayla
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full border-t border-gray-200 my-5" />

              {/* Uyarı Geçmişi */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Uyarı Geçmişi ({warningCount})</h3>
                  {warningCount < 2 && (
                    <button
                      onClick={addWarning}
                      disabled={warningLoading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      {warningLoading ? (
                        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <BellAlertIcon className="w-3.5 h-3.5" />
                      )}
                      Uyarı Ekle
                    </button>
                  )}
                </div>

                {warnings.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-3">Henüz uyarı verilmemiş</p>
                ) : (
                  <div className="space-y-2">
                    {warnings.map((w) => (
                      <div key={w.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-amber-700">Uyarı #{w.warning_number}</span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(w.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{w.reason || 'Sebep belirtilmemiş'}</p>
                        <p className="text-[11px] text-gray-400 mt-1">Uyaran: {w.warned_by}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2 uyarı + 14 gün kontrolü */}
                {warningCount >= 2 && !allDone && (
                  <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-center gap-2">
                      <ExclamationCircleIcon className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs text-red-700">
                        2 uyarı verildi. 2. uyarıdan 14 gün sonra görevler hala eksikse deaktive edilecek.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

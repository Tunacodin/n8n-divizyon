'use client'

import { useState, useMemo } from 'react'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import BasvuruDetailModal from './BasvuruDetailModal'
import { parseTurkishDate, findFieldValue } from './basvuru-constants'

interface Application {
  sheet: string
  Timestamp?: string
  timestamp?: string
  [key: string]: any
}

interface BasvuruDateListProps {
  data: Application[]
}

interface DateGroup {
  key: string
  label: string
  items: Application[]
}

const TURKISH_DAYS = ['Pazar', 'Pazartesi', 'Sal\u0131', '\u00c7ar\u015famba', 'Per\u015fembe', 'Cuma', 'Cumartesi']
const TURKISH_MONTHS = ['Ocak', '\u015eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran', 'Temmuz', 'A\u011fustos', 'Eyl\u00fcl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k']

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getDateLabel(date: Date, today: Date, yesterday: Date): string {
  const dateKey = getDateKey(date)
  const todayKey = getDateKey(today)
  const yesterdayKey = getDateKey(yesterday)

  if (dateKey === todayKey) return 'Bug\u00fcn'
  if (dateKey === yesterdayKey) return 'D\u00fcn'

  // Within this week (last 6 days before yesterday)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)

  if (date >= weekAgo) {
    const dayName = TURKISH_DAYS[date.getDay()]
    const day = date.getDate()
    const month = TURKISH_MONTHS[date.getMonth()]
    return `${dayName}, ${day} ${month}`
  }

  // Older: full date with year
  const day = date.getDate()
  const month = TURKISH_MONTHS[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function BasvuruDateList({ data }: BasvuruDateListProps) {
  const [selectedItem, setSelectedItem] = useState<Record<string, any> | null>(null)

  const groups = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Parse dates and sort items newest first
    const itemsWithDates = data
      .map(item => {
        const raw = item.Timestamp || item.timestamp || ''
        const date = parseTurkishDate(String(raw)) || new Date(raw)
        return { item, date: date && !isNaN(date.getTime()) ? date : null }
      })
      .filter(({ date }) => date !== null)
      .sort((a, b) => b.date!.getTime() - a.date!.getTime())

    // Group by date key
    const groupMap = new Map<string, { label: string; items: Application[]; sortDate: Date }>()

    for (const { item, date } of itemsWithDates) {
      const key = getDateKey(date!)
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          label: getDateLabel(date!, today, yesterday),
          items: [],
          sortDate: date!,
        })
      }
      groupMap.get(key)!.items.push(item)
    }

    // Items with no valid date
    const noDateItems = data.filter(item => {
      const raw = item.Timestamp || item.timestamp || ''
      const date = parseTurkishDate(String(raw)) || new Date(raw)
      return !date || isNaN(date.getTime())
    })

    const result: DateGroup[] = Array.from(groupMap.entries()).map(([key, val]) => ({
      key,
      label: val.label,
      items: val.items,
    }))

    if (noDateItems.length > 0) {
      result.push({ key: 'no-date', label: 'Tarih Bilgisi Yok', items: noDateItems })
    }

    return result
  }, [data])

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="text-center py-16">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Ba\u015fvuru bulunamad\u0131</p>
          <p className="text-sm text-gray-400 mt-1">Filtreleri de\u011fi\u015ftirmeyi deneyin</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.key}>
            {/* Group Header */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">{group.label}</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {group.items.length}
              </span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {group.items.map((item, index) => {
                const name = findFieldValue(item, 'Ad\u0131n Soyad\u0131n') || '\u0130simsiz'
                const email = findFieldValue(item, 'E-Posta Adresin') || ''
                const phone = findFieldValue(item, 'Telefon Numaran') || ''
                const mainRole = findFieldValue(item, '\u00dcretici Rol\u00fcn\u00fc Tan\u0131mla') || ''
                const university = findFieldValue(item, 'Hangi \u00fcniversitede \u00f6\u011frencisin?') || ''
                const universityOther = findFieldValue(item, 'E\u011fer yukardaki listede \u00fcniversiteni g\u00f6remiyorsan bu soruda \u00fcniversiteni belirtebilirsin.') || ''
                const displayUniversity = university || universityOther

                const raw = item.Timestamp || item.timestamp || ''
                const date = parseTurkishDate(String(raw)) || new Date(raw)
                const time = date && !isNaN(date.getTime()) ? formatTime(date) : ''

                const initials = getInitials(name)
                const avatarColor = getAvatarColor(name)

                const subtitle = [displayUniversity, mainRole].filter(Boolean).join(' \u00b7 ')

                return (
                  <div
                    key={`${group.key}-${index}`}
                    onClick={() => setSelectedItem(item)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${avatarColor}`}>
                      {initials}
                    </div>

                    {/* Name & Subtitle */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                        {subtitle && (
                          <span className="text-xs text-gray-400 truncate hidden sm:inline">{subtitle}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {email && (
                          <span className="text-xs text-gray-500 truncate">{email}</span>
                        )}
                        {phone && (
                          <span className="text-xs text-gray-400 hidden md:inline">{phone}</span>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    {time && (
                      <span className="text-xs text-gray-400 shrink-0">{time}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <BasvuruDetailModal
        data={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  )
}

'use client'

import { motion } from 'framer-motion'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { findFieldValue, getSubRoleBadges, parseTurkishDate } from './basvuru-constants'

interface BasvuruCardProps {
  data: Record<string, any>
  index: number
  onClick: () => void
}

export default function BasvuruCard({ data, index, onClick }: BasvuruCardProps) {
  const name = findFieldValue(data, 'Adın Soyadın') || 'İsimsiz'
  const mainRole = findFieldValue(data, 'Üretici Rolünü Tanımla') || ''
  const university = findFieldValue(data, 'Hangi üniversitede öğrencisin?') || ''
  const gender = findFieldValue(data, 'Cinsiyetin') || ''
  const timestamp = data.Timestamp || data.timestamp || findFieldValue(data, 'Submitted At') || ''

  const subRoles = getSubRoleBadges(data)
  const visibleRoles = subRoles.slice(0, 3)
  const extraCount = subRoles.length - 3

  // Get initials from name
  const initials = name
    .split(' ')
    .map((part: string) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Avatar color based on name hash
  const colors = [
    'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
    'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500',
  ]
  const colorIndex = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length
  const avatarColor = colors[colorIndex]

  // Truncate long role text for card display
  const shortRole = mainRole.length > 40 ? mainRole.slice(0, 40) + '...' : mainRole

  const formatCardDate = (ts: string) => {
    if (!ts) return ''
    const date = parseTurkishDate(ts)
    if (!date) return ts
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Header: Avatar + Name */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${avatarColor}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          {university && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{university}</p>
          )}
        </div>
      </div>

      {/* Main Role Badge */}
      {shortRole && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            {shortRole}
          </span>
        </div>
      )}

      {/* Sub-role Badges */}
      {subRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {visibleRoles.map((role, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600"
            >
              {role}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-500">
              +{extraCount}
            </span>
          )}
        </div>
      )}

      {/* Footer: Gender + Date */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        {gender && (
          <span className="text-xs text-gray-500">{gender}</span>
        )}
        {timestamp && (
          <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
            <CalendarIcon className="w-3.5 h-3.5" />
            {formatCardDate(timestamp)}
          </div>
        )}
      </div>
    </motion.div>
  )
}

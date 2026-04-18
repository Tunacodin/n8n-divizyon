'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import {
  BASVURU_CATEGORIES,
  findFieldValue,
  getSubRoleBadges,
  parseTurkishDate,
} from './basvuru-constants'
import BasvuruCategorySection from './BasvuruCategorySection'

interface BasvuruDetailModalProps {
  data: Record<string, any> | null
  onClose: () => void
}

// Parse birth date in DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY formats
function parseBirthDate(raw: string): Date | null {
  if (!raw) return null
  const normalized = raw.replace(/\s+/g, '').replace(/[.\-]/g, '/')
  const parts = normalized.split('/')
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parseInt(parts[2], 10)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day)
    }
  }
  return null
}

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Topluluk ilkeleri field keys (1) through 10))
const TOPLULUK_ILKELERI_KEYS = ['1)', '2)', '3)', '4)', '5)', '6)', '7)', '8)', '9)', '10)']

export default function BasvuruDetailModal({ data, onClose }: BasvuruDetailModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (data) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [data, handleKeyDown])

  if (!data) return null

  const name = findFieldValue(data, 'Adın Soyadın') || 'İsimsiz'
  const gender = findFieldValue(data, 'Cinsiyetin') || ''
  const email = findFieldValue(data, 'E-Posta Adresin') || ''
  const phone = findFieldValue(data, 'Telefon Numaran') || ''
  const mainRole = findFieldValue(data, 'Üretici Rolünü Tanımla') || ''
  const university = findFieldValue(data, 'Hangi üniversitede öğrencisin?') || ''
  const universityOther = findFieldValue(data, 'Eğer yukardaki listede üniversiteni göremiyorsan bu soruda üniversiteni belirtebilirsin.') || ''
  const department = findFieldValue(data, 'Hangi bölümde öğrencisin?') || ''
  const profStatus = findFieldValue(data, 'Mevcut profesyonel durumun nedir?') || ''
  const valueField = findFieldValue(data, 'Aşağıdaki değerlerden hangisi seni en çok tanımlar?') || ''
  const birthDateRaw = findFieldValue(data, 'Doğum Tarihin (GG/AA/YYYY)') || ''
  const timestamp = data.Timestamp || data.timestamp || findFieldValue(data, 'Submitted At') || ''

  const subRoles = getSubRoleBadges(data)
  const displayUniversity = university || universityOther

  const initials = name
    .split(' ')
    .map((part: string) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const formatDate = (ts: string) => {
    if (!ts) return ''
    const date = parseTurkishDate(ts)
    if (!date) return ts
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Age check
  const birthDate = parseBirthDate(birthDateRaw)
  const age = birthDate ? calculateAge(birthDate) : null
  const isUnder18 = age !== null && age < 18

  // Topluluk ilkeleri check
  const filledIlkeler = TOPLULUK_ILKELERI_KEYS.filter(key => {
    const val = findFieldValue(data, key)
    return val !== undefined && val !== null && val !== '' && val !== false
  })
  const emptyIlkelerCount = TOPLULUK_ILKELERI_KEYS.length - filledIlkeler.length
  const allIlkelerFilled = emptyIlkelerCount === 0

  // Exclude "kisisel" category — it's shown in the right profile panel
  const drawerCategories = BASVURU_CATEGORIES.filter(c => c.id !== 'kisisel')

  // Shared priority checks component
  const PriorityChecks = () => (
    <div className="space-y-2.5">
      {/* Age Check */}
      <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg ${isUnder18 ? 'bg-red-50' : 'bg-gray-50'}`}>
        {isUnder18 ? (
          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        ) : (
          <CheckCircleIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        )}
        <div>
          <span className={`text-xs font-medium ${isUnder18 ? 'text-red-700' : 'text-gray-700'}`}>
            Yaş Kontrolü
          </span>
          <p className={`text-xs mt-0.5 ${isUnder18 ? 'text-red-600' : 'text-gray-500'}`}>
            {age !== null
              ? isUnder18
                ? `${age} yaşında — 18 yaşından küçük`
                : `${age} yaşında`
              : 'Doğum tarihi belirtilmemiş'}
          </p>
        </div>
      </div>

      {/* Topluluk İlkeleri Check */}
      <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg ${!allIlkelerFilled ? 'bg-red-50' : 'bg-gray-50'}`}>
        {!allIlkelerFilled ? (
          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        ) : (
          <CheckCircleIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        )}
        <div>
          <span className={`text-xs font-medium ${!allIlkelerFilled ? 'text-red-700' : 'text-gray-700'}`}>
            Topluluk İlkeleri
          </span>
          <p className={`text-xs mt-0.5 ${!allIlkelerFilled ? 'text-red-600' : 'text-gray-500'}`}>
            {allIlkelerFilled
              ? `${filledIlkeler.length}/${TOPLULUK_ILKELERI_KEYS.length} dolu`
              : `${emptyIlkelerCount} alan boş (${filledIlkeler.length}/${TOPLULUK_ILKELERI_KEYS.length})`}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {data && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-5xl h-full bg-white shadow-2xl flex flex-col md:flex-row"
          >
            {/* === MOBILE LAYOUT (< md): single scrollable panel === */}
            <div className="md:hidden flex-1 overflow-y-auto">
              {/* Mobile Profile Header */}
              <div className="border-b border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-base font-bold">
                      {initials}
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{name}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[gender, timestamp ? formatDate(timestamp) : ''].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Priority Checks */}
                <PriorityChecks />

                {/* Contact */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {email && (
                    <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900">
                      <EnvelopeIcon className="w-3.5 h-3.5" /> {email}
                    </a>
                  )}
                  {phone && (
                    <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900">
                      <PhoneIcon className="w-3.5 h-3.5" /> {phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Mobile Accordions */}
              <div className="p-4 space-y-3">
                {drawerCategories.map((category, index) => (
                  <BasvuruCategorySection
                    key={category.id}
                    category={category}
                    data={data}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* === DESKTOP LAYOUT (>= md): two panels === */}

            {/* Left Panel: Scrollable Accordion Categories */}
            <div className="hidden md:flex flex-1 flex-col overflow-y-auto">
              <div className="p-6 space-y-3">
                {drawerCategories.map((category, index) => (
                  <BasvuruCategorySection
                    key={category.id}
                    category={category}
                    data={data}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Right Panel: Minimal Profile + Priority Checks */}
            <div className="hidden md:flex w-80 flex-col border-l border-gray-200 overflow-y-auto">
              {/* Close Button */}
              <div className="flex justify-end p-4 pb-0">
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="px-5 pb-6 space-y-0">
                {/* Profile Header */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-xl font-bold mb-2">
                    {initials}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 text-center">{name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[gender, timestamp ? formatDate(timestamp) : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>

                <div className="border-t border-gray-100 my-4" />

                {/* Priority Checks */}
                <PriorityChecks />

                <div className="border-t border-gray-100 my-4" />

                {/* Contact */}
                <div className="space-y-2">
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <EnvelopeIcon className="w-4 h-4 shrink-0 text-gray-400" />
                      <span className="truncate">{email}</span>
                    </a>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <PhoneIcon className="w-4 h-4 shrink-0 text-gray-400" />
                      <span>{phone}</span>
                    </a>
                  )}
                </div>

                <div className="border-t border-gray-100 my-4" />

                {/* Details - compact list */}
                <div className="space-y-3 text-sm">
                  {mainRole && (
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Rol</label>
                      <p className="text-gray-700 mt-0.5">{mainRole}</p>
                    </div>
                  )}
                  {subRoles.length > 0 && (
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Alt Roller</label>
                      <p className="text-gray-700 mt-0.5">{subRoles.join(', ')}</p>
                    </div>
                  )}
                  {valueField && (
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Değer</label>
                      <p className="text-gray-700 mt-0.5">{valueField}</p>
                    </div>
                  )}
                  {displayUniversity && (
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Eğitim</label>
                      <p className="text-gray-700 mt-0.5">{displayUniversity}</p>
                      {(department || profStatus) && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          {[department, profStatus].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  )}
                  {!displayUniversity && profStatus && (
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Profesyonel Durum</label>
                      <p className="text-gray-700 mt-0.5">{profStatus}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDownIcon,
  UserIcon,
  AcademicCapIcon,
  SparklesIcon,
  HeartIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  LinkIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { BasvuruCategory, findFieldValue, getFilledCount } from './basvuru-constants'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UserIcon,
  AcademicCapIcon,
  SparklesIcon,
  HeartIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
}

interface BasvuruCategorySectionProps {
  category: BasvuruCategory
  data: Record<string, any>
  defaultOpen?: boolean
}

export default function BasvuruCategorySection({ category, data, defaultOpen = false }: BasvuruCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { filled, total } = getFilledCount(data, category)
  const IconComponent = ICON_MAP[category.icon] || InformationCircleIcon

  // Separate badge fields from regular fields
  const badgeFields = category.fields.filter(f => f.renderAs === 'badges')
  const regularFields = category.fields.filter(f => !f.renderAs)

  // Get active badges with their values
  const activeBadges = badgeFields
    .map(f => {
      const value = findFieldValue(data, f.key)
      return value && value !== '' && value !== false ? { field: f, value: String(value) } : null
    })
    .filter((b): b is { field: typeof badgeFields[0]; value: string } => b !== null)

  return (
    <div className={`border rounded-xl overflow-hidden ${category.colorClasses.border}`}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-5 py-4 transition-colors hover:opacity-90 ${category.colorClasses.bg}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${category.colorClasses.iconBg}`}>
            <IconComponent className={`w-5 h-5 ${category.colorClasses.text}`} />
          </div>
          <span className={`font-semibold ${category.colorClasses.text}`}>
            {category.title}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${category.colorClasses.badge}`}>
            {filled}/{total}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDownIcon className={`w-5 h-5 ${category.colorClasses.text}`} />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-4">
              {/* Regular fields in grid */}
              {regularFields.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regularFields.map(field => {
                    const value = findFieldValue(data, field.key)
                    const isEmpty = value === undefined || value === null || value === ''
                    const isFullWidth = field.type === 'longtext'

                    return (
                      <div
                        key={field.key}
                        className={isFullWidth ? 'md:col-span-2' : ''}
                      >
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {field.label}
                        </label>
                        {isEmpty ? (
                          <span className="text-sm text-gray-300 italic">Belirtilmedi</span>
                        ) : (
                          <FieldValue field={field} value={value} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Badge fields cluster */}
              {badgeFields.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Alt Roller
                  </label>
                  {activeBadges.length === 0 ? (
                    <span className="text-sm text-gray-300 italic">Belirtilmedi</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeBadges.map(b => (
                        <span
                          key={b.field.key}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${category.colorClasses.badge}`}
                        >
                          <CheckIcon className="w-3 h-3" />
                          {b.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FieldValue({ field, value }: { field: { type: string; label: string }; value: any }) {
  const strValue = String(value)

  switch (field.type) {
    case 'email':
      return (
        <a
          href={`mailto:${strValue}`}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          <EnvelopeIcon className="w-4 h-4" />
          {strValue}
        </a>
      )

    case 'phone':
      return (
        <a
          href={`tel:${strValue}`}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          <PhoneIcon className="w-4 h-4" />
          {strValue}
        </a>
      )

    case 'url':
      return (
        <a
          href={strValue}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
        >
          <LinkIcon className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-xs">{strValue}</span>
        </a>
      )

    case 'boolean':
      return value && value !== 'Hayir' ? (
        <CheckIcon className="w-5 h-5 text-green-600" />
      ) : (
        <XMarkIcon className="w-5 h-5 text-gray-400" />
      )

    case 'longtext':
      return (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {strValue}
        </p>
      )

    default:
      return <span className="text-sm text-gray-900">{strValue}</span>
  }
}

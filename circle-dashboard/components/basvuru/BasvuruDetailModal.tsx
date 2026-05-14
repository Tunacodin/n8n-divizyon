'use client'

import {
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Dialog } from '@/components/ui/Dialog'
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

const TOPLULUK_ILKELERI_KEYS = ['1)', '2)', '3)', '4)', '5)', '6)', '7)', '8)', '9)', '10)']

export default function BasvuruDetailModal({ data, onClose }: BasvuruDetailModalProps) {
  if (!data) return <Dialog open={false} onClose={onClose}>{null}</Dialog>

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

  const birthDate = parseBirthDate(birthDateRaw)
  const age = birthDate ? calculateAge(birthDate) : null
  const isUnder18 = age !== null && age < 18

  const filledIlkeler = TOPLULUK_ILKELERI_KEYS.filter(key => {
    const val = findFieldValue(data, key)
    return val !== undefined && val !== null && val !== '' && val !== false
  })
  const emptyIlkelerCount = TOPLULUK_ILKELERI_KEYS.length - filledIlkeler.length
  const allIlkelerFilled = emptyIlkelerCount === 0

  const drawerCategories = BASVURU_CATEGORIES.filter(c => c.id !== 'kisisel')

  const PriorityChecks = () => (
    <div className="space-y-2.5">
      <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg ${isUnder18 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
        {isUnder18 ? (
          <ExclamationTriangleIcon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        ) : (
          <CheckCircleIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div>
          <span className={`text-xs font-medium ${isUnder18 ? 'text-destructive' : 'text-foreground'}`}>
            Yaş Kontrolü
          </span>
          <p className={`text-xs mt-0.5 ${isUnder18 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {age !== null
              ? isUnder18
                ? `${age} yaşında — 18 yaşından küçük`
                : `${age} yaşında`
              : 'Doğum tarihi belirtilmemiş'}
          </p>
        </div>
      </div>

      <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg ${!allIlkelerFilled ? 'bg-destructive/10' : 'bg-muted/50'}`}>
        {!allIlkelerFilled ? (
          <ExclamationTriangleIcon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        ) : (
          <CheckCircleIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div>
          <span className={`text-xs font-medium ${!allIlkelerFilled ? 'text-destructive' : 'text-foreground'}`}>
            Topluluk İlkeleri
          </span>
          <p className={`text-xs mt-0.5 ${!allIlkelerFilled ? 'text-destructive' : 'text-muted-foreground'}`}>
            {allIlkelerFilled
              ? `${filledIlkeler.length}/${TOPLULUK_ILKELERI_KEYS.length} dolu`
              : `${emptyIlkelerCount} alan boş (${filledIlkeler.length}/${TOPLULUK_ILKELERI_KEYS.length})`}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={!!data} onClose={onClose} size="2xl">
      {/* === MOBILE LAYOUT === */}
      <div className="md:hidden flex-1 overflow-y-auto">
        <div className="border-b border-border p-5 pr-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-secondary text-muted-foreground text-base font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">{name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[gender, timestamp ? formatDate(timestamp) : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <PriorityChecks />

          <div className="flex flex-wrap gap-3 mt-3">
            {email && (
              <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <EnvelopeIcon className="w-3.5 h-3.5" /> {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <PhoneIcon className="w-3.5 h-3.5" /> {phone}
              </a>
            )}
          </div>
        </div>

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

      {/* === DESKTOP LAYOUT === */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Categories */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 pr-4 space-y-3">
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

        {/* Right: Profile */}
        <div className="w-80 shrink-0 border-l border-border overflow-y-auto">
          <div className="px-5 py-6 pr-14 space-y-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-secondary text-muted-foreground text-xl font-bold mb-2">
                {initials}
              </div>
              <h2 className="text-base font-semibold text-foreground text-center">{name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[gender, timestamp ? formatDate(timestamp) : ''].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="border-t border-border" />

            <PriorityChecks />

            <div className="border-t border-border" />

            <div className="space-y-2">
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <EnvelopeIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{email}</span>
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <PhoneIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span>{phone}</span>
                </a>
              )}
            </div>

            <div className="border-t border-border" />

            <div className="space-y-3 text-sm">
              {mainRole && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Rol</label>
                  <p className="text-foreground mt-0.5">{mainRole}</p>
                </div>
              )}
              {subRoles.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Alt Roller</label>
                  <p className="text-foreground mt-0.5">{subRoles.join(', ')}</p>
                </div>
              )}
              {valueField && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Değer</label>
                  <p className="text-foreground mt-0.5">{valueField}</p>
                </div>
              )}
              {displayUniversity && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Eğitim</label>
                  <p className="text-foreground mt-0.5">{displayUniversity}</p>
                  {(department || profStatus) && (
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {[department, profStatus].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              )}
              {!displayUniversity && profStatus && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Profesyonel Durum</label>
                  <p className="text-foreground mt-0.5">{profStatus}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

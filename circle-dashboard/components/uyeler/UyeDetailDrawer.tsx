'use client'

import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

type Member = {
  id: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
  bio?: string | null
  location?: string | null
  linkedin_url?: string | null
  instagram_url?: string | null
  website_url?: string | null
  circle_headline?: string | null
  circle_id?: number | null
  status?: string
  tags?: string[] | null
  protected_source?: string | null
  submitted_at?: string | null
  main_role?: string | null
  // Aktivite
  activity_score?: number | null
  last_seen_at?: string | null
  profile_confirmed_at?: string | null
  accepted_invitation_at?: string | null
  circle_active?: boolean | null
  circle_posts_count?: number | null
  circle_comments_count?: number | null
  circle_topics_count?: number | null
  // Profil
  circle_company?: string | null
  circle_disciplines?: string[] | null
  circle_birth_date?: string | null
  circle_university?: string | null
  circle_department?: string | null
  circle_phone?: string | null
  // Başvurudan gelen (formla)
  birth_date?: string | null
  university?: string | null
  department?: string | null
  gender?: string | null
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min} dk önce`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} saat önce`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} gün önce`
  if (d < 30) return `${Math.floor(d/7)} hafta önce`
  return `${Math.floor(d/30)} ay önce`
}

export function UyeDetailDrawer({ member, onClose }: { member: Member | null; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!member) return null

  const initials = (member.full_name || '?').split(' ').map((p) => p.charAt(0)).join('').toUpperCase().slice(0, 2)
  const tags = Array.isArray(member.tags) ? member.tags : []
  const hasAny = (...vals: (string | null | undefined)[]) => vals.some((v) => !!(v && v.trim()))

  const profileUrl = member.circle_id ? `https://komunite.divizyon.org/user/${member.circle_id}` : null
  const nereden = member.protected_source === 'circle_event' ? 'Etkinlik' : member.protected_source === 'circle_pre_panel' ? '—' : 'Başvuru'

  return (
    <>
      <div className="fixed inset-0 top-[5rem] bg-black/20 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-[5rem] bottom-0 w-[480px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatar_url} alt={member.full_name || ''} className="w-14 h-14 rounded-full object-cover border border-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-800 font-semibold text-lg">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{member.full_name || '—'}</h3>
              {member.circle_headline && <p className="text-xs text-gray-500 truncate">{member.circle_headline}</p>}
              <p className="text-xs text-gray-400 mt-0.5">{member.email || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Status + Kaynak */}
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              member.status === 'nihai_uye' ? 'bg-amber-100 text-amber-700' :
              member.status === 'etkinlik' ? 'bg-cyan-100 text-cyan-700' :
              member.status === 'deaktive' ? 'bg-gray-100 text-gray-600' :
              'bg-gray-100 text-gray-600'
            }`}>{member.status || 'belirsiz'}</span>
            {nereden !== '—' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                nereden === 'Etkinlik' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>{nereden}</span>
            )}
            {member.circle_id && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium" title="Korumalı">
                🔒 Circle #{member.circle_id}
              </span>
            )}
          </div>

          {/* Aktivite özeti (yeni) */}
          {(member.activity_score != null || member.last_seen_at || member.circle_posts_count != null) && (
            <section className="px-6 py-4 border-b border-gray-50">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Topluluk Aktivitesi</h4>

              {member.activity_score != null && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Aktivite Skoru</span>
                    <span className="font-semibold text-gray-900">{member.activity_score}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, member.activity_score))}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                    member.last_seen_at && Date.now() - new Date(member.last_seen_at).getTime() < 7 * 86400_000
                      ? 'bg-emerald-500' : 'bg-gray-400'
                  }`} />
                  <span>Son aktif: <span className="font-medium">{timeAgo(member.last_seen_at)}</span></span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <Stat label="Post" value={member.circle_posts_count ?? 0} />
                <Stat label="Yorum" value={member.circle_comments_count ?? 0} />
                <Stat label="Konu" value={member.circle_topics_count ?? 0} />
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {member.circle_active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">● Aktif</span>
                )}
                {member.profile_confirmed_at && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">✓ Profil onaylı</span>
                )}
                {member.accepted_invitation_at && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">✓ Davet kabul</span>
                )}
              </div>
            </section>
          )}

          {/* Bio */}
          {member.bio && (
            <section className="px-6 py-4 border-b border-gray-50">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Biyografi</h4>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{member.bio}</p>
            </section>
          )}

          {/* Profil Bilgileri (yeni) */}
          {(member.circle_university || member.circle_department || member.circle_company ||
            member.circle_birth_date || member.circle_disciplines?.length) && (
            <section className="px-6 py-4 border-b border-gray-50">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Profil Bilgileri</h4>
              <dl className="space-y-1.5">
                {member.circle_company && <Row label="Şirket" value={member.circle_company} />}
                {member.circle_university && <Row label="Üniversite" value={member.circle_university} />}
                {member.circle_department && <Row label="Bölüm" value={member.circle_department} />}
                {member.circle_birth_date && <Row label="Doğum tarihi" value={member.circle_birth_date} />}
                {member.circle_disciplines && member.circle_disciplines.length > 0 && (
                  <Row label="Disiplin" value={member.circle_disciplines.join(', ')} />
                )}
              </dl>
            </section>
          )}

          {/* Başvurudan Gelen (ayrı) */}
          {(member.birth_date || member.university || member.department || member.gender) && (
            <section className="px-6 py-4 border-b border-gray-50">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Başvuru Formu Bilgileri</h4>
              <dl className="space-y-1.5">
                {member.birth_date && <Row label="Doğum" value={member.birth_date} />}
                {member.gender && <Row label="Cinsiyet" value={member.gender} />}
                {member.university && <Row label="Üniversite" value={member.university} />}
                {member.department && <Row label="Bölüm" value={member.department} />}
              </dl>
            </section>
          )}

          {/* İletişim */}
          {hasAny(member.phone, member.circle_phone, member.location, member.email) && (
            <section className="px-6 py-4 border-b border-gray-50">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">İletişim</h4>
              <dl className="space-y-1.5">
                {member.email && <Row label="E-posta" value={member.email} />}
                {(member.phone || member.circle_phone) && (
                  <Row label="Telefon" value={member.phone || member.circle_phone || ''} />
                )}
                {member.location && <Row label="Konum" value={member.location} />}
              </dl>
            </section>
          )}

          {/* Sosyal */}
          {hasAny(member.linkedin_url, member.instagram_url, member.website_url) && (
            <section className="px-6 py-4 border-b border-gray-50">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Sosyal & Web</h4>
              <div className="space-y-1.5">
                {member.linkedin_url && <LinkRow label="LinkedIn" href={member.linkedin_url} />}
                {member.instagram_url && <LinkRow label="Instagram" href={member.instagram_url} />}
                {member.website_url && <LinkRow label="Website" href={member.website_url} />}
              </div>
            </section>
          )}

          {/* Tag'ler */}
          {tags.length > 0 && (
            <section className="px-6 py-4 border-b border-gray-50">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Tag'ler ({tags.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Meta */}
          <section className="px-6 py-4 border-b border-gray-50">
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Meta</h4>
            <dl className="space-y-1.5">
              <Row label="Başvuru tarihi" value={member.submitted_at ? new Date(member.submitted_at).toLocaleString('tr-TR') : '—'} />
              <Row label="Uygulama ID" value={member.id} mono />
              {member.main_role && <Row label="Ana rol" value={member.main_role} />}
            </dl>
          </section>

          {/* Circle link */}
          {profileUrl && (
            <div className="px-6 py-4">
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg py-2 hover:bg-purple-100 transition-colors"
              >
                Circle'da profili aç ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center rounded-md bg-gray-50 py-2 px-1">
      <div className="text-lg font-semibold text-gray-900 leading-tight">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <dt className="text-gray-500 w-24 shrink-0">{label}</dt>
      <dd className={`text-gray-800 flex-1 ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</dd>
    </div>
  )
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <dt className="text-gray-500 w-24 shrink-0">{label}</dt>
      <dd className="flex-1 min-w-0">
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate block">
          {href}
        </a>
      </dd>
    </div>
  )
}

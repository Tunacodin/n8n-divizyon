export type FieldType = 'text' | 'date' | 'email' | 'phone' | 'url' | 'longtext' | 'boolean'

export interface BasvuruField {
  key: string
  label: string
  type: FieldType
  renderAs?: 'badges'
}

export interface BasvuruCategory {
  id: string
  title: string
  icon: string
  color: string
  colorClasses: {
    bg: string
    text: string
    border: string
    badge: string
    iconBg: string
  }
  fields: BasvuruField[]
}

export const BASVURU_CATEGORIES: BasvuruCategory[] = [
  {
    id: 'kisisel',
    title: 'Kişisel Bilgiler',
    icon: 'UserIcon',
    color: 'blue',
    colorClasses: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-700',
      iconBg: 'bg-blue-100',
    },
    fields: [
      { key: 'Adın Soyadın', label: 'Ad Soyad', type: 'text' },
      { key: 'Doğum Tarihin (GG/AA/YYYY)', label: 'Doğum Tarihi', type: 'date' },
      { key: 'Cinsiyetin', label: 'Cinsiyet', type: 'text' },
      { key: 'Telefon Numaran', label: 'Telefon', type: 'phone' },
      { key: 'E-Posta Adresin', label: 'E-Posta', type: 'email' },
    ],
  },
  {
    id: 'egitim',
    title: 'Eğitim & Kariyer',
    icon: 'AcademicCapIcon',
    color: 'indigo',
    colorClasses: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      badge: 'bg-indigo-100 text-indigo-700',
      iconBg: 'bg-indigo-100',
    },
    fields: [
      { key: 'Mevcut profesyonel durumun nedir?', label: 'Profesyonel Durum', type: 'text' },
      { key: 'Hangi üniversitede öğrencisin?', label: 'Üniversite', type: 'text' },
      { key: 'Eğer yukardaki listede üniversiteni göremiyorsan bu soruda üniversiteni belirtebilirsin.', label: 'Üniversite (Diğer)', type: 'text' },
      { key: 'Hangi bölümde öğrencisin?', label: 'Bölüm', type: 'text' },
      { key: 'Öğrenim türünü belirtir misin?', label: 'Öğrenim Türü', type: 'text' },
      { key: 'Çalıştığın iş/proje hakkında detay verebilir misin?', label: 'İş/Proje Detayı', type: 'longtext' },
    ],
  },
  {
    id: 'rol',
    title: 'Üretici Rolü',
    icon: 'SparklesIcon',
    color: 'purple',
    colorClasses: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      badge: 'bg-purple-100 text-purple-700',
      iconBg: 'bg-purple-100',
    },
    fields: [
      { key: 'Üretici Rolünü Tanımla', label: 'Ana Rol', type: 'text' },
      { key: 'Aşağıdaki *Kreatif İçerik Üreticisi *Rollerinden Hangisi Seni Tanımlıyor?', label: 'Kreatif İçerik Üreticisi', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Görsel Tasarımcılar* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Görsel Tasarımcılar', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Video İçerik Üreticileri* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Video İçerik Üreticileri', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Ses ve Müzik Üreticileri* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Ses ve Müzik Üreticileri', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Animasyon ve Çizgi Film Tasarımcıları* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Animasyon ve Çizgi Film', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *UI/UX Tasarımcıları* Rollerinden Hangisi Seni Tanımlıyor?', label: 'UI/UX Tasarımcıları', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Web ve Uygulama Geliştiricisi* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Web ve Uygulama Geliştiricisi', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Dijital Ürün Geliştiricisi* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Dijital Ürün Geliştiricisi', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Oyun Üreticisi* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Oyun Üreticisi', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Dijital Varlık ve Materyal Üreticileri* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Dijital Varlık ve Materyal', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *İleri Teknoloji Geliştiricisi* Rollerinden Hangisi Seni Tanımlıyor?', label: 'İleri Teknoloji Geliştiricisi', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *İnteraktif İçerik Üreticisi* Rollerinden Hangisi Seni Tanımlıyor?', label: 'İnteraktif İçerik Üreticisi', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Enstalasyon Sanatçısı* Rollerinden Hangisi Seni Tanımlıyor?', label: 'Enstalasyon Sanatçısı', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Dijital Deneyim Tasarımcısı *Rollerinden Hangisi Seni Tanımlıyor?', label: 'Dijital Deneyim Tasarımcısı', type: 'text', renderAs: 'badges' },
      { key: 'Aşağıdaki *Disiplinler Ötesi Üretici *Rollerinden Hangisi Seni Tanımlıyor?', label: 'Disiplinler Ötesi Üretici', type: 'text', renderAs: 'badges' },
    ],
  },
  {
    id: 'degerler',
    title: 'Değerler & Topluluk',
    icon: 'HeartIcon',
    color: 'green',
    colorClasses: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-700',
      iconBg: 'bg-green-100',
    },
    fields: [
      { key: 'Aşağıdaki değerlerden hangisi seni en çok tanımlar?', label: 'Değerler', type: 'text' },
      { key: 'Divizyon topluluğunun sana en çok nasıl katkı sağlayacağını düşünüyorsun?', label: 'Topluluk Katkısı', type: 'longtext' },
      { key: 'Divizyon, üyelerinin kolektif katkısıyla büyüyen bir ekosistemdir. Sen bu ekosisteme en çok hangi yollarla katkı sunmayı planlıyorsun?', label: 'Ekosistem Katkısı', type: 'longtext' },
    ],
  },
  {
    id: 'ifade',
    title: 'Kendini İfade',
    icon: 'VideoCameraIcon',
    color: 'amber',
    colorClasses: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
      iconBg: 'bg-amber-100',
    },
    fields: [
      {
        key: 'Kendini ifade ettiğin en az 1 dakikalık videoyu herhangi bir platforma (Google Drive, YouTube vb.) yükleyerek linkini bizimle paylaşabilirsin. ',
        label: 'Video Linki',
        type: 'url',
      },
      {
        key: 'Aşağıdaki üç başlığa odaklanarak bize planını anlatır mısın?',
        label: 'Plan Açıklaması',
        type: 'longtext',
      },
      {
        key: 'Sıra en kritik adımda: Seni anlamak. Bu topluluğun bir parçası olarak potansiyelini nasıl hayata geçireceğini ve ekosisteme nasıl katkı sunacağını duymak istiyoruz.',
        label: 'Kendini İfade Et',
        type: 'longtext',
      },
      { key: '1)', label: 'Topluluk İlkesi 1', type: 'longtext' },
      { key: '2)', label: 'Topluluk İlkesi 2', type: 'longtext' },
      { key: '3)', label: 'Topluluk İlkesi 3', type: 'longtext' },
      { key: '4)', label: 'Topluluk İlkesi 4', type: 'longtext' },
      { key: '5)', label: 'Topluluk İlkesi 5', type: 'longtext' },
      { key: '6)', label: 'Topluluk İlkesi 6', type: 'longtext' },
      { key: '7)', label: 'Topluluk İlkesi 7', type: 'longtext' },
      { key: '8)', label: 'Topluluk İlkesi 8', type: 'longtext' },
      { key: '9)', label: 'Topluluk İlkesi 9', type: 'longtext' },
      { key: '10)', label: 'Topluluk İlkesi 10', type: 'longtext' },
    ],
  },
  {
    id: 'sorular',
    title: 'Açık Uçlu Sorular',
    icon: 'ChatBubbleLeftRightIcon',
    color: 'rose',
    colorClasses: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-700',
      iconBg: 'bg-rose-100',
    },
    fields: [
      {
        key: 'Alanının geleceği hakkında, heyecan verici veya farklı bulduğun bir fikrin var mı? Kısaca bahseder misin?',
        label: 'Gelecek Fikirleri',
        type: 'longtext',
      },
      {
        key: 'Bir işinde aldığın geri bildirim sayesinde "İyi ki bunu öğrenmişim" dediğin bir an oldu mu? Kısaca anlatır mısın?',
        label: 'Geri Bildirim Deneyimi',
        type: 'longtext',
      },
      {
        key: 'Aklına harika bir proje fikri geldi. Hayata geçirmek için attığın ilk 3 somut adım ne olurdu?',
        label: 'Proje Adımları',
        type: 'longtext',
      },
      {
        key: 'Son zamanlarda uzmanlık alanın hariç, merakını en çok cezbeden konu ne oldu ve neden?',
        label: 'Merak Konusu',
        type: 'longtext',
      },
      {
        key: 'Eklemek veya belirtmek istediğin herhangi bir şey var mı?',
        label: 'Ek Notlar',
        type: 'longtext',
      },
    ],
  },
  {
    id: 'meta',
    title: 'Meta Bilgiler',
    icon: 'InformationCircleIcon',
    color: 'gray',
    colorClasses: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      badge: 'bg-gray-100 text-gray-700',
      iconBg: 'bg-gray-100',
    },
    fields: [
      { key: 'Submitted At', label: 'Gönderim Tarihi', type: 'date' },
      { key: 'Token', label: 'Token', type: 'text' },
    ],
  },
]

// Helper: parse Turkish date format "DD.MM.YYYY HH:mm:ss" into a Date
export function parseTurkishDate(dateStr: string): Date | null {
  if (!dateStr) return null
  // Try DD.MM.YYYY HH:mm:ss
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/)
  if (match) {
    const [, day, month, year, hour, min, sec] = match
    return new Date(+year, +month - 1, +day, +hour, +min, +sec)
  }
  // Try DD.MM.YYYY without time
  const matchDate = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (matchDate) {
    const [, day, month, year] = matchDate
    return new Date(+year, +month - 1, +day)
  }
  // Fallback to native parsing
  const native = new Date(dateStr)
  return isNaN(native.getTime()) ? null : native
}

// Helper: get all defined field keys for matching
export const ALL_FIELD_KEYS = BASVURU_CATEGORIES.flatMap(cat => cat.fields.map(f => f.key))

// Helper: find a field value - direct key lookup
export function findFieldValue(data: Record<string, any>, key: string): any {
  if (data[key] !== undefined) return data[key]
  return undefined
}

// Helper: get filled field count for a category
export function getFilledCount(data: Record<string, any>, category: BasvuruCategory): { filled: number; total: number } {
  let filled = 0
  const total = category.fields.length

  for (const field of category.fields) {
    const value = findFieldValue(data, field.key)
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      filled++
    }
  }

  return { filled, total }
}

// Helper: get sub-role badges from data (returns value strings, not labels)
export function getSubRoleBadges(data: Record<string, any>): string[] {
  const rolCategory = BASVURU_CATEGORIES.find(c => c.id === 'rol')
  if (!rolCategory) return []

  return rolCategory.fields
    .filter(f => f.renderAs === 'badges')
    .map(f => {
      const value = findFieldValue(data, f.key)
      return value && value !== '' && value !== false ? String(value) : null
    })
    .filter((v): v is string => v !== null)
}

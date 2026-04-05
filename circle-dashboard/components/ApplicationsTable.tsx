'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CakeIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import BasvuruDateList from './basvuru/BasvuruDateList'
import KontrolDetailModal from './kontrol/KontrolDetailModal'

interface Application {
  sheet: string
  status: string
  color: string
  Timestamp?: string
  timestamp?: string
  'Adın Soyadın'?: string
  'E-Posta Adresin'?: string
  'Telefon Numaran'?: string
  'Doğum Tarihin (GG/AA/YYYY)'?: string
  [key: string]: any
}

type SortField = 'name' | 'email' | 'date' | 'sheet' | 'birthdate' | 'reviewer' | 'note' | 'gender' | 'mailTemplate' | 'mailSent' | 'warningCount' | 'onayDurumu'
type SortDirection = 'asc' | 'desc'

// Column definitions per sheet
const SHEET_COLUMNS: Record<string, string[]> = {
  'all': ['sheet', 'name', 'email', 'phone', 'date'],
  'Başvuru Formu': ['sheet', 'name', 'email', 'phone', 'date'],
  'Kontrol': ['sheet', 'name', 'reviewer', 'note', 'mailTemplate', 'onayDurumu'],
  'Kesin Kabul': ['sheet', 'reviewer', 'note', 'name', 'mailTemplate', 'onayDurumu'],
  '18 Yaş Altı': ['sheet', 'name', 'birthdate'],
  '18 Yaşından Küçük': ['sheet', 'name', 'birthdate'],
  'Kesin Ret': ['sheet', 'reviewer', 'note', 'name', 'birthdate', 'gender', 'phone', 'email', 'mailTemplate', 'mailSent'],
  'Topluluk İlkeleri Ret': ['sheet', 'reviewer', 'note', 'name', 'birthdate', 'gender', 'phone', 'email', 'mailTemplate', 'mailSent'],
  'Nihai Olmayan Ağ Üyeleri': ['sheet', 'name', 'birthdate', 'gender', 'phone', 'email', 'warningCount'],
}

export default function ApplicationsTable() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<Application[]>([])
  const [filteredData, setFilteredData] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSheet, setSelectedSheet] = useState<string>(() => {
    const sheet = searchParams.get('sheet')
    if (sheet) return sheet
    // If only date filter is passed, show all sheets
    if (searchParams.get('date')) return 'all'
    return 'Div. Açık İnovasyon Ağı | Başvuru Formu'
  })
  const [dateFilter, setDateFilter] = useState<string>(() => searchParams.get('date') || 'all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedKontrolItem, setSelectedKontrolItem] = useState<Application | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterData()
    setCurrentPage(1) // Reset to first page when filters change
  }, [data, searchTerm, selectedSheet, dateFilter])

  useEffect(() => {
    if (filteredData.length > 0) {
      sortData()
    }
  }, [sortField, sortDirection])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/applications?grouped=true')
      const result = await response.json()

      if (result.success) {
        setData(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterData = () => {
    if (data.length === 0) {
      setFilteredData([])
      return
    }

    let filtered = [...data]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const name = item['Adın Soyadın'] || ''
        const email = item['E-Posta Adresin'] || ''
        const phone = item['Telefon Numaran'] || ''
        const reviewer = item['Değerlendiren'] || ''
        const note = item['Not'] || ''
        const term = searchTerm.toLowerCase()

        return (
          name.toLowerCase().includes(term) ||
          email.toLowerCase().includes(term) ||
          phone.includes(searchTerm) ||
          reviewer.toLowerCase().includes(term) ||
          note.toLowerCase().includes(term)
        )
      })
    }

    // Sheet filter
    if (selectedSheet === 'Topluluk İlkeleri Ret') {
      filtered = filtered.filter(item =>
        item.sheet === 'Kesin Ret' &&
        (item['Not'] || '').toLowerCase().includes('topluluk ilkeleri')
      )
    } else if (selectedSheet === '18 Yaşından Küçük') {
      filtered = filtered.filter(item => item.sheet === '18 Yaş Altı')
    } else if (selectedSheet === 'Div. Açık İnovasyon Ağı | Başvuru Formu') {
      filtered = filtered.filter(item => item.sheet === 'Başvuru Formu')
    } else if (selectedSheet === 'all') {
      // "Tümü" - exclude Nihai Olmayan (shown on /members page)
      filtered = filtered.filter(item => item.sheet !== 'Nihai Olmayan Ağ Üyeleri')
    } else {
      filtered = filtered.filter(item => item.sheet === selectedSheet)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      filtered = filtered.filter(item => {
        const timestamp = item.Timestamp || item.timestamp
        if (!timestamp) return false

        const itemDate = new Date(timestamp)
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())

        switch (dateFilter) {
          case 'today':
            return itemDay.getTime() === today.getTime()
          case 'yesterday':
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            return itemDay.getTime() === yesterday.getTime()
          case 'week':
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return itemDay >= weekAgo
          case 'month':
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return itemDay >= monthAgo
          default:
            return true
        }
      })
    }

    setFilteredData(filtered)
  }

  const sortData = () => {
    if (filteredData.length === 0) return

    const sorted = [...filteredData].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a['Adın Soyadın'] || ''
          bValue = b['Adın Soyadın'] || ''
          break
        case 'email':
          aValue = a['E-Posta Adresin'] || ''
          bValue = b['E-Posta Adresin'] || ''
          break
        case 'date':
          aValue = new Date(a.Timestamp || a.timestamp || 0).getTime()
          bValue = new Date(b.Timestamp || b.timestamp || 0).getTime()
          break
        case 'birthdate':
          aValue = a['Doğum Tarihin (GG/AA/YYYY)'] || ''
          bValue = b['Doğum Tarihin (GG/AA/YYYY)'] || ''
          break
        case 'reviewer':
          aValue = a['Değerlendiren'] || ''
          bValue = b['Değerlendiren'] || ''
          break
        case 'note':
          aValue = a['Not'] || ''
          bValue = b['Not'] || ''
          break
        case 'gender':
          aValue = a['Cinsiyetin'] || ''
          bValue = b['Cinsiyetin'] || ''
          break
        case 'mailTemplate':
          aValue = a['Mail Template'] || ''
          bValue = b['Mail Template'] || ''
          break
        case 'mailSent':
          aValue = a['Mail Atıldı mı?'] || ''
          bValue = b['Mail Atıldı mı?'] || ''
          break
        case 'warningCount':
          aValue = parseInt(a['Uyarı Sayısı']) || 0
          bValue = parseInt(b['Uyarı Sayısı']) || 0
          break
        case 'onayDurumu':
          aValue = a['Onay Durumu'] || ''
          bValue = b['Onay Durumu'] || ''
          break
        case 'sheet':
          aValue = a.sheet || ''
          bValue = b.sheet || ''
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredData(sorted)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, itemsPerPage])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const getStatusBadge = (sheet: string, color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      green: 'bg-green-50 text-green-700 border-green-200',
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${colors[color] || colors.blue}`}>
        {sheet}
      </span>
    )
  }

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format birth date as DD/MM/YYYY, preserving original values for malformed dates
  const formatBirthDate = (raw: string) => {
    if (!raw) return '-'

    // Remove extra spaces and normalize separators: dots/dashes → slashes
    const normalized = raw.replace(/\s+/g, '').replace(/[.\-]/g, '/')

    // Split into parts
    const parts = normalized.split('/')
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts.slice(2).join('/') // keep rest as-is (handles "12002" etc.)
      return `${day}/${month}/${year}`
    }

    return raw
  }

  if (loading) {
    return <TableSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="İsim, email veya telefon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Sheet Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tümü</option>
              <option value="Div. Açık İnovasyon Ağı | Başvuru Formu">Div. Açık İnovasyon Ağı | Başvuru Formu</option>
              <option value="Kontrol">Kontrol</option>
              <option value="Kesin Kabul">Kesin Kabul</option>
              <option value="18 Yaşından Küçük">18 Yaşından Küçük</option>
              <option value="Kesin Ret">Kesin Ret</option>
              <option value="Topluluk İlkeleri Ret">Topluluk İlkeleri Ret</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="today">Bugün</option>
              <option value="yesterday">Dün</option>
              <option value="week">Son 7 Gün</option>
              <option value="month">Son 30 Gün</option>
            </select>
          </div>
        </div>

        {/* Results count & Items per page */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{filteredData.length}</span> kayıt bulundu
          </div>
          {selectedSheet !== 'Div. Açık İnovasyon Ağı | Başvuru Formu' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sayfa başına:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Başvuru Formu: Date-Grouped List View */}
      {selectedSheet === 'Div. Açık İnovasyon Ağı | Başvuru Formu' ? (
        <BasvuruDateList data={filteredData} />
      ) : (
      /* Table */
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {(() => {
            const visibleColumns = SHEET_COLUMNS[selectedSheet] || SHEET_COLUMNS['all']
            const show = (col: string) => visibleColumns.includes(col)

            return (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {show('sheet') && (
                      <th
                        onClick={() => handleSort('sheet')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Durum
                          <SortIcon field="sheet" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('name') && (
                      <th
                        onClick={() => handleSort('name')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Ad Soyad
                          <SortIcon field="name" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('email') && (
                      <th
                        onClick={() => handleSort('email')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          E-Posta
                          <SortIcon field="email" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('phone') && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Telefon
                      </th>
                    )}
                    {show('date') && (
                      <th
                        onClick={() => handleSort('date')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Tarih
                          <SortIcon field="date" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('birthdate') && (
                      <th
                        onClick={() => handleSort('birthdate')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Doğum Tarihi
                          <SortIcon field="birthdate" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('reviewer') && (
                      <th
                        onClick={() => handleSort('reviewer')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Değerlendiren
                          <SortIcon field="reviewer" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('note') && (
                      <th
                        onClick={() => handleSort('note')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Not
                          <SortIcon field="note" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('gender') && (
                      <th
                        onClick={() => handleSort('gender')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Cinsiyet
                          <SortIcon field="gender" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('mailTemplate') && (
                      <th
                        onClick={() => handleSort('mailTemplate')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Mail Template
                          <SortIcon field="mailTemplate" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('mailSent') && (
                      <th
                        onClick={() => handleSort('mailSent')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Mail Durumu
                          <SortIcon field="mailSent" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('warningCount') && (
                      <th
                        onClick={() => handleSort('warningCount')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Uyarı Sayısı
                          <SortIcon field="warningCount" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                    {show('onayDurumu') && (
                      <th
                        onClick={() => handleSort('onayDurumu')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Onay Durumu
                          <SortIcon field="onayDurumu" currentField={sortField} direction={sortDirection} />
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <AnimatePresence mode="popLayout">
                    {paginatedData.map((item, index) => (
                      <motion.tr
                        key={`${item.sheet}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className={`hover:bg-gray-50 transition-colors ${item.sheet === 'Kontrol' ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (item.sheet === 'Kontrol') setSelectedKontrolItem(item)
                        }}
                      >
                        {show('sheet') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(item.sheet, item.color)}
                          </td>
                        )}
                        {show('name') && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {item['Adın Soyadın'] || '-'}
                              </span>
                            </div>
                          </td>
                        )}
                        {show('email') && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {item['E-Posta Adresin'] || '-'}
                              </span>
                            </div>
                          </td>
                        )}
                        {show('phone') && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <PhoneIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {item['Telefon Numaran'] || '-'}
                              </span>
                            </div>
                          </td>
                        )}
                        {show('date') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {formatDate(item.Timestamp || item.timestamp || '')}
                            </span>
                          </td>
                        )}
                        {show('birthdate') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <CakeIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatBirthDate(item['Doğum Tarihin (GG/AA/YYYY)'] || '')}
                              </span>
                            </div>
                          </td>
                        )}
                        {show('reviewer') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <ClipboardDocumentCheckIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {item['Değerlendiren'] || '-'}
                              </span>
                            </div>
                          </td>
                        )}
                        {show('note') && (
                          <td className="px-6 py-4 max-w-[250px]">
                            <div className="flex items-start gap-2">
                              <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                              <span className="text-sm text-gray-600 truncate" title={item['Not'] || ''}>
                                {item['Not'] || '-'}
                              </span>
                            </div>
                          </td>
                        )}
                        {show('gender') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {item['Cinsiyetin'] || '-'}
                            </span>
                          </td>
                        )}
                        {show('mailTemplate') && (
                          <td className="px-6 py-4 max-w-[200px]">
                            <span className="text-sm text-gray-600 truncate block" title={item['Mail Template'] || ''}>
                              {item['Mail Template'] || '-'}
                            </span>
                          </td>
                        )}
                        {show('mailSent') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item['Mail Atıldı mı?'] ? (
                              <div className="flex items-center gap-1.5">
                                <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm text-emerald-600 font-medium">Atıldı</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <XCircleIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-400">Atılmadı</span>
                              </div>
                            )}
                          </td>
                        )}
                        {show('warningCount') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${
                              parseInt(item['Uyarı Sayısı']) >= 2
                                ? 'bg-red-100 text-red-700'
                                : parseInt(item['Uyarı Sayısı']) >= 1
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item['Uyarı Sayısı'] ?? '0'}
                            </span>
                          </td>
                        )}
                        {show('onayDurumu') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(() => {
                              const durum = item['Onay Durumu'] || ''
                              const isKabul = durum.toLowerCase().includes('kabul')
                              const isRet = durum.toLowerCase().includes('ret')
                              if (isKabul) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                    <span className="text-sm text-green-700 font-medium">{durum}</span>
                                  </div>
                                )
                              }
                              if (isRet) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <XCircleIcon className="w-4 h-4 text-red-500" />
                                    <span className="text-sm text-red-700 font-medium">{durum}</span>
                                  </div>
                                )
                              }
                              return <span className="text-sm text-gray-400">-</span>
                            })()}
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )
          })()}

          {paginatedData.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Kayıt bulunamadı</p>
              <p className="text-sm text-gray-400 mt-1">Filtreleri değiştirmeyi deneyin</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              {' '}({filteredData.length} kayıttan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} arası)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                İlk
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Son
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Kontrol Detail Modal */}
      <KontrolDetailModal
        data={selectedKontrolItem}
        onClose={() => setSelectedKontrolItem(null)}
      />
    </div>
  )
}

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (field !== currentField) {
    return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />
  }

  return direction === 'asc' ? (
    <ArrowUpIcon className="w-4 h-4 text-purple-600" />
  ) : (
    <ArrowDownIcon className="w-4 h-4 text-purple-600" />
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg mb-4" />
        ))}
      </div>
    </div>
  )
}

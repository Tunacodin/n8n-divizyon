'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import BasvuruCard from './BasvuruCard'
import BasvuruDetailModal from './BasvuruDetailModal'

const ITEMS_PER_PAGE = 12

interface BasvuruFormGridProps {
  data: Record<string, any>[]
}

export default function BasvuruFormGrid({ data }: BasvuruFormGridProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<Record<string, any> | null>(null)

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return data.slice(start, start + ITEMS_PER_PAGE)
  }, [data, currentPage])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Reset to page 1 when data changes
  useMemo(() => {
    setCurrentPage(1)
  }, [data.length])

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="text-center py-16">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Basvuru bulunamadi</p>
          <p className="text-sm text-gray-400 mt-1">Filtreleri degistirmeyi deneyin</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {paginatedData.map((item, index) => (
            <BasvuruCard
              key={`basvuru-${(currentPage - 1) * ITEMS_PER_PAGE + index}`}
              data={item}
              index={index}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
            {' '}({data.length} basvurudan{' '}
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, data.length)} arasi)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ilk
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

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

      {/* Detail Modal */}
      <BasvuruDetailModal
        data={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  )
}

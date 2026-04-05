'use client'

import { cn } from '@/lib/utils'

export interface Tab {
  key: string
  label: string
  count?: number
  dotColor?: string
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onChange: (key: string) => void
  className?: string
}

export function TabBar({ tabs, activeTab, onChange, className }: TabBarProps) {
  return (
    <div className={cn('flex gap-1 bg-gray-100 rounded-lg p-1', className)}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.dotColor && (
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tab.dotColor)} />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

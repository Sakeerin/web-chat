import React from 'react'
import { Clock, X, MessageCircle, Users, Hash, Search } from 'lucide-react'
import { Button } from '@ui/components/button'
import { cn } from '@/lib/utils'
import { useSearchHistory } from '@/hooks/useSearch'
import type { SearchHistoryItem } from '@/services/searchApi'

interface SearchHistoryProps {
  history: SearchHistoryItem[]
  onSelect: (item: { query: string; type: 'global' | 'messages' | 'users' | 'conversations' }) => void
  className?: string
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelect,
  className,
}) => {
  const { removeFromHistory, clearHistory } = useSearchHistory()

  const getTypeIcon = (type: SearchHistoryItem['type']) => {
    switch (type) {
      case 'messages':
        return <MessageCircle className="h-3 w-3 text-blue-500" />
      case 'users':
        return <Users className="h-3 w-3 text-green-500" />
      case 'conversations':
        return <Hash className="h-3 w-3 text-purple-500" />
      case 'global':
        return <Search className="h-3 w-3 text-gray-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  const getTypeLabel = (type: SearchHistoryItem['type']) => {
    switch (type) {
      case 'messages':
        return 'Messages'
      case 'users':
        return 'People'
      case 'conversations':
        return 'Conversations'
      case 'global':
        return 'All'
      default:
        return 'Search'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) {
      return 'Just now'
    } else if (minutes < 60) {
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else if (days < 7) {
      return `${days}d ago`
    } else {
      return new Date(timestamp).toLocaleDateString()
    }
  }

  const handleRemoveItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeFromHistory(id)
  }

  if (history.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-500">No search history</p>
      </div>
    )
  }

  return (
    <div className={cn('border-b border-gray-100', className)}>
      <div className="px-3 py-2 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Recent Searches
        </p>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-xs text-gray-500 hover:text-gray-700 p-1 h-auto"
          >
            Clear all
          </Button>
        )}
      </div>
      <div className="pb-2 max-h-60 overflow-y-auto">
        {history.slice(0, 10).map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => onSelect({ query: item.query, type: item.type as any })}
          >
            <div className="flex-shrink-0">
              {getTypeIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 truncate">
                  {item.query}
                </span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  in {getTypeLabel(item.type)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">
                  {formatTimestamp(item.timestamp)}
                </span>
                {item.resultCount > 0 && (
                  <>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">
                      {item.resultCount.toLocaleString()} result{item.resultCount !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleRemoveItem(e, item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
            >
              <X className="h-3 w-3 text-gray-400" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
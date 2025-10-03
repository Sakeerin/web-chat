import React from 'react'
import { Search, Clock, User, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchSuggestion } from '@/services/searchApi'

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[]
  onSelect: (suggestion: string) => void
  isLoading?: boolean
  className?: string
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  onSelect,
  isLoading = false,
  className,
}) => {
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'contact':
        return <User className="h-3 w-3 text-blue-500" />
      case 'popular':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      default:
        return <Search className="h-3 w-3 text-gray-400" />
    }
  }

  const getSuggestionLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return 'Recent search'
      case 'contact':
        return 'Contact'
      case 'popular':
        return 'Popular'
      default:
        return 'Suggestion'
    }
  }

  if (isLoading) {
    return (
      <div className={cn('p-3', className)}>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className={cn('border-b border-gray-100', className)}>
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Suggestions
        </p>
      </div>
      <div className="pb-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.text}-${index}`}
            onClick={() => onSelect(suggestion.text)}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex-shrink-0">
              {getSuggestionIcon(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 truncate">
                  {suggestion.text}
                </span>
                {suggestion.type !== 'recent' && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {getSuggestionLabel(suggestion.type)}
                  </span>
                )}
              </div>
              {suggestion.metadata?.name && suggestion.type === 'contact' && (
                <p className="text-xs text-gray-500 truncate">
                  {suggestion.metadata.name}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
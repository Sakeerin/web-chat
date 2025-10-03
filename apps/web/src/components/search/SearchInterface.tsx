import React, { useState, useRef, useEffect } from 'react'
import { Search, X, Filter, Clock, Star, ArrowLeft } from 'lucide-react'
import { Button } from '@ui/components/button'
import { Input } from '@ui/components/input'
import { cn } from '@/lib/utils'
import { useSearchWithHistory, useSearchHistory, useSavedSearches } from '@/hooks/useSearch'
import { SearchResults } from './SearchResults'
import { SearchFilters } from './SearchFilters'
import { SearchSuggestions } from './SearchSuggestions'
import { SearchHistory } from './SearchHistory'
import { SavedSearches } from './SavedSearches'

interface SearchInterfaceProps {
  className?: string
  onClose?: () => void
  initialQuery?: string
  initialType?: 'global' | 'messages' | 'users' | 'conversations'
  isModal?: boolean
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  className,
  onClose,
  initialQuery = '',
  initialType = 'global',
  isModal = false,
}) => {
  const [showFilters, setShowFilters] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSavedSearches, setShowSavedSearches] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  
  const {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    searchType,
    setSearchType,
    filters,
    setFilters,
    isSearching,
    currentResult,
    suggestions,
    isLoadingSuggestions,
    executeSearch,
    clearSearch,
  } = useSearchWithHistory()
  
  const { history } = useSearchHistory()
  const { savedSearches } = useSavedSearches()

  // Initialize with props
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery)
      setSearchType(initialType)
    }
  }, [initialQuery, initialType, setSearchQuery, setSearchType])

  // Handle input focus
  const handleInputFocus = () => {
    setInputFocused(true)
    if (!searchQuery) {
      setShowHistory(true)
      setShowSuggestions(false)
    } else if (searchQuery.length >= 2) {
      setShowSuggestions(true)
      setShowHistory(false)
    }
  }

  // Handle input blur
  const handleInputBlur = () => {
    // Delay to allow clicking on suggestions/history
    setTimeout(() => {
      setInputFocused(false)
      setShowSuggestions(false)
      setShowHistory(false)
    }, 200)
  }

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    
    if (value.length >= 2) {
      setShowSuggestions(true)
      setShowHistory(false)
    } else if (value.length === 0) {
      setShowHistory(true)
      setShowSuggestions(false)
    } else {
      setShowSuggestions(false)
      setShowHistory(false)
    }
  }

  // Handle search execution
  const handleSearch = (query?: string, type?: typeof searchType) => {
    const searchTerm = query || searchQuery
    const searchCategory = type || searchType
    
    if (searchTerm.trim()) {
      executeSearch(searchTerm, searchCategory)
      setShowSuggestions(false)
      setShowHistory(false)
      inputRef.current?.blur()
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion)
    handleSearch(suggestion)
  }

  // Handle history item selection
  const handleHistorySelect = (item: { query: string; type: typeof searchType }) => {
    setSearchQuery(item.query)
    setSearchType(item.type)
    handleSearch(item.query, item.type)
  }

  // Handle saved search selection
  const handleSavedSearchSelect = (savedSearch: { query: string; type: typeof searchType; filters?: Record<string, any> }) => {
    setSearchQuery(savedSearch.query)
    setSearchType(savedSearch.type)
    if (savedSearch.filters) {
      setFilters(savedSearch.filters)
    }
    handleSearch(savedSearch.query, savedSearch.type)
  }

  // Handle clear search
  const handleClear = () => {
    clearSearch()
    setShowFilters(false)
    setShowSuggestions(false)
    setShowHistory(false)
    inputRef.current?.focus()
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      if (searchQuery) {
        handleClear()
      } else if (onClose) {
        onClose()
      }
    }
  }

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setShowHistory(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasResults = currentResult.data && (
    (searchType === 'global' && currentResult.data.totalResults > 0) ||
    (searchType !== 'global' && currentResult.data.estimatedTotalHits > 0)
  )

  const showDropdown = inputFocused && (showSuggestions || showHistory || showSavedSearches)

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {isModal && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
              aria-label="Close search"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex-1 relative" ref={searchContainerRef}>
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search messages, contacts, and conversations..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyPress}
                className="pl-10 pr-20"
                autoComplete="off"
              />
              
              {/* Clear button */}
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              
              {/* Filter button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6',
                  showFilters && 'bg-gray-100'
                )}
                aria-label="Search filters"
              >
                <Filter className="h-3 w-3" />
              </Button>
            </div>

            {/* Search Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {showSuggestions && suggestions && suggestions.length > 0 && (
                  <SearchSuggestions
                    suggestions={suggestions}
                    onSelect={handleSuggestionSelect}
                    isLoading={isLoadingSuggestions}
                  />
                )}
                
                {showHistory && history.length > 0 && (
                  <SearchHistory
                    history={history}
                    onSelect={handleHistorySelect}
                  />
                )}
                
                {showSavedSearches && savedSearches.length > 0 && (
                  <SavedSearches
                    savedSearches={savedSearches}
                    onSelect={handleSavedSearchSelect}
                  />
                )}
                
                {/* Quick actions */}
                <div className="border-t border-gray-100 p-2">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowHistory(!showHistory)
                        setShowSuggestions(false)
                        setShowSavedSearches(false)
                      }}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Clock className="h-3 w-3" />
                      History
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowSavedSearches(!showSavedSearches)
                        setShowSuggestions(false)
                        setShowHistory(false)
                      }}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Star className="h-3 w-3" />
                      Saved
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-1 mt-3">
          {(['global', 'messages', 'users', 'conversations'] as const).map((type) => (
            <Button
              key={type}
              variant={searchType === type ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchType(type)}
              className="capitalize"
            >
              {type === 'global' ? 'All' : type}
            </Button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <SearchFilters
          searchType={searchType}
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {debouncedQuery ? (
          <SearchResults
            searchType={searchType}
            query={debouncedQuery}
            result={currentResult}
            filters={filters}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Search your conversations</p>
              <p className="text-sm">
                Find messages, contacts, and conversations quickly
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import React, { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@ui/components/button'
import { Input } from '@ui/components/input'
import { cn } from '@/lib/utils'
import { useSearchSuggestions } from '@/hooks/useSearch'
import { SearchSuggestions } from './SearchSuggestions'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  onFocus?: () => void
  className?: string
  showSuggestions?: boolean
  autoFocus?: boolean
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search...",
  onSearch,
  onFocus,
  className,
  showSuggestions = true,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get search suggestions
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSearchSuggestions({
    q: query,
    limit: 5,
  })

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true)
    if (showSuggestions && query.length >= 2) {
      setShowSuggestionsDropdown(true)
    }
    onFocus?.()
  }

  // Handle input blur
  const handleBlur = () => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setIsFocused(false)
      setShowSuggestionsDropdown(false)
    }, 200)
  }

  // Handle input change
  const handleChange = (value: string) => {
    setQuery(value)
    
    if (showSuggestions && value.length >= 2) {
      setShowSuggestionsDropdown(true)
    } else {
      setShowSuggestionsDropdown(false)
    }
  }

  // Handle search execution
  const handleSearch = (searchQuery?: string) => {
    const searchTerm = searchQuery || query
    if (searchTerm.trim()) {
      onSearch?.(searchTerm.trim())
      setShowSuggestionsDropdown(false)
      inputRef.current?.blur()
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion)
    handleSearch(suggestion)
  }

  // Handle clear
  const handleClear = () => {
    setQuery('')
    setShowSuggestionsDropdown(false)
    inputRef.current?.focus()
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      if (query) {
        handleClear()
      } else {
        inputRef.current?.blur()
      }
    }
  }

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestionsDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyPress}
          className={cn(
            'pl-10',
            query && 'pr-10',
            isFocused && 'ring-2 ring-blue-500 border-blue-500'
          )}
          autoComplete="off"
        />
        
        {/* Clear button */}
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestionsDropdown && suggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <SearchSuggestions
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            isLoading={isLoadingSuggestions}
          />
        </div>
      )}
    </div>
  )
}
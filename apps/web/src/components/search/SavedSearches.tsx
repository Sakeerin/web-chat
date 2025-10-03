import React, { useState } from 'react'
import { Star, X, Edit2, MessageCircle, Users, Hash, Search, Plus } from 'lucide-react'
import { Button } from '@ui/components/button'
import { Input } from '@ui/components/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@ui/components/dialog'
import { cn } from '@/lib/utils'
import { useSavedSearches } from '@/hooks/useSearch'
import type { SavedSearch } from '@/services/searchApi'

interface SavedSearchesProps {
  savedSearches: SavedSearch[]
  onSelect: (savedSearch: { query: string; type: 'global' | 'messages' | 'users' | 'conversations'; filters?: Record<string, any> }) => void
  className?: string
}

interface SaveSearchDialogProps {
  query: string
  type: 'global' | 'messages' | 'users' | 'conversations'
  filters?: Record<string, any>
  onSave: (name: string) => void
}

const SaveSearchDialog: React.FC<SaveSearchDialogProps> = ({
  query,
  type,
  filters,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
      setName('')
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Save Search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Search Query</label>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
              "{query}" in {type === 'global' ? 'All' : type}
            </p>
          </div>
          <div>
            <label htmlFor="search-name" className="text-sm font-medium text-gray-700">
              Name
            </label>
            <Input
              id="search-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for this search"
              className="mt-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!name.trim()} className="flex-1">
              Save
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const SavedSearches: React.FC<SavedSearchesProps> = ({
  savedSearches,
  onSelect,
  className,
}) => {
  const { updateSavedSearch, deleteSavedSearch } = useSavedSearches()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const getTypeIcon = (type: SavedSearch['type']) => {
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
        return <Star className="h-3 w-3 text-yellow-500" />
    }
  }

  const getTypeLabel = (type: SavedSearch['type']) => {
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: new Date().getFullYear() !== new Date(timestamp).getFullYear() ? 'numeric' : undefined
    })
  }

  const handleStartEdit = (savedSearch: SavedSearch) => {
    setEditingId(savedSearch.id)
    setEditName(savedSearch.name)
  }

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateSavedSearch(id, { name: editName.trim() })
    }
    setEditingId(null)
    setEditName('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteSavedSearch(id)
  }

  if (savedSearches.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <Star className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-500">No saved searches</p>
        <p className="text-xs text-gray-400 mt-1">
          Save frequently used searches for quick access
        </p>
      </div>
    )
  }

  return (
    <div className={cn('border-b border-gray-100', className)}>
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Saved Searches
        </p>
      </div>
      <div className="pb-2 max-h-60 overflow-y-auto">
        {savedSearches.map((savedSearch) => (
          <div
            key={savedSearch.id}
            className="group flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => !editingId && onSelect({
              query: savedSearch.query,
              type: savedSearch.type as any,
              filters: savedSearch.filters
            })}
          >
            <div className="flex-shrink-0">
              {getTypeIcon(savedSearch.type)}
            </div>
            <div className="flex-1 min-w-0">
              {editingId === savedSearch.id ? (
                <div className="space-y-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(savedSearch.id)
                      } else if (e.key === 'Escape') {
                        handleCancelEdit()
                      }
                    }}
                    className="text-sm h-6 py-1"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(savedSearch.id)}
                      className="h-5 px-2 text-xs"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-5 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {savedSearch.name}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      in {getTypeLabel(savedSearch.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600 truncate">
                      "{savedSearch.query}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      Saved {formatDate(savedSearch.createdAt)}
                    </span>
                    {savedSearch.updatedAt !== savedSearch.createdAt && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          Updated {formatDate(savedSearch.updatedAt)}
                        </span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            {!editingId && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartEdit(savedSearch)
                  }}
                  className="p-1 h-auto"
                >
                  <Edit2 className="h-3 w-3 text-gray-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(e, savedSearch.id)}
                  className="p-1 h-auto"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
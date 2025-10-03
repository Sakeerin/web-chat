import React, { useState } from 'react'
import { X, Calendar, FileText, Image, Video, Paperclip, Users, Hash } from 'lucide-react'
import { Button } from '@ui/components/button'
import { Input } from '@ui/components/input'
import { Label } from '@ui/components/label'
import { Checkbox } from '@ui/components/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select'
import { cn } from '@/lib/utils'

interface SearchFiltersProps {
  searchType: 'global' | 'messages' | 'users' | 'conversations'
  filters: Record<string, any>
  onFiltersChange: (filters: Record<string, any>) => void
  onClose: () => void
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchType,
  filters,
  onFiltersChange,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const handleClearFilters = () => {
    setLocalFilters({})
    onFiltersChange({})
  }

  const hasActiveFilters = Object.keys(localFilters).some(key => 
    localFilters[key] !== undefined && localFilters[key] !== '' && localFilters[key] !== false
  )

  // Format date for input
  const formatDateForInput = (date: string | undefined) => {
    if (!date) return ''
    return new Date(date).toISOString().split('T')[0]
  }

  // Handle date change
  const handleDateChange = (key: string, value: string) => {
    const date = value ? new Date(value).toISOString() : undefined
    handleFilterChange(key, date)
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Search Filters</h3>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-gray-600"
              >
                Clear all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Message filters */}
          {(searchType === 'global' || searchType === 'messages') && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Date Range
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">From</Label>
                    <Input
                      type="date"
                      value={formatDateForInput(localFilters.dateFrom)}
                      onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">To</Label>
                    <Input
                      type="date"
                      value={formatDateForInput(localFilters.dateTo)}
                      onChange={(e) => handleDateChange('dateTo', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Message Types
                </Label>
                <div className="space-y-2">
                  {[
                    { value: 'text', label: 'Text messages', icon: FileText },
                    { value: 'image', label: 'Images', icon: Image },
                    { value: 'video', label: 'Videos', icon: Video },
                    { value: 'audio', label: 'Audio', icon: Paperclip },
                    { value: 'file', label: 'Files', icon: Paperclip },
                  ].map(({ value, label, icon: Icon }) => {
                    const messageTypes = localFilters.messageTypes ? localFilters.messageTypes.split(',') : []
                    const isChecked = messageTypes.includes(value)
                    
                    return (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`message-type-${value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            let newTypes = [...messageTypes]
                            if (checked) {
                              newTypes.push(value)
                            } else {
                              newTypes = newTypes.filter(t => t !== value)
                            }
                            handleFilterChange('messageTypes', newTypes.join(','))
                          }}
                        />
                        <Label 
                          htmlFor={`message-type-${value}`}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-attachments"
                    checked={localFilters.hasAttachments === true}
                    onCheckedChange={(checked) => 
                      handleFilterChange('hasAttachments', checked ? true : undefined)
                    }
                  />
                  <Label htmlFor="has-attachments" className="text-sm cursor-pointer">
                    Only messages with attachments
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* User filters */}
          {(searchType === 'global' || searchType === 'users') && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclude-blocked"
                    checked={localFilters.excludeBlocked !== false}
                    onCheckedChange={(checked) => 
                      handleFilterChange('excludeBlocked', checked ? true : false)
                    }
                  />
                  <Label htmlFor="exclude-blocked" className="text-sm cursor-pointer">
                    Exclude blocked users
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Conversation filters */}
          {(searchType === 'global' || searchType === 'conversations') && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Conversation Type
                </Label>
                <Select
                  value={localFilters.type || ''}
                  onValueChange={(value) => 
                    handleFilterChange('type', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="dm">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Direct messages
                      </div>
                    </SelectItem>
                    <SelectItem value="group">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        Group chats
                      </div>
                    </SelectItem>
                    <SelectItem value="channel">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        Channels
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Global search specific filters */}
          {searchType === 'global' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search In
                </Label>
                <div className="space-y-2">
                  {[
                    { value: 'messages', label: 'Messages', icon: FileText },
                    { value: 'users', label: 'People', icon: Users },
                    { value: 'conversations', label: 'Conversations', icon: Hash },
                  ].map(({ value, label, icon: Icon }) => {
                    const searchTypes = localFilters.types || ['messages', 'users', 'conversations']
                    const isChecked = searchTypes.includes(value)
                    
                    return (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`search-type-${value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            let newTypes = [...searchTypes]
                            if (checked) {
                              if (!newTypes.includes(value)) {
                                newTypes.push(value)
                              }
                            } else {
                              newTypes = newTypes.filter(t => t !== value)
                            }
                            // Ensure at least one type is selected
                            if (newTypes.length === 0) {
                              newTypes = ['messages']
                            }
                            handleFilterChange('types', newTypes)
                          }}
                        />
                        <Label 
                          htmlFor={`search-type-${value}`}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Results limit */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Results per page
            </Label>
            <Select
              value={localFilters.limit?.toString() || '20'}
              onValueChange={(value) => 
                handleFilterChange('limit', parseInt(value))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 results</SelectItem>
                <SelectItem value="20">20 results</SelectItem>
                <SelectItem value="50">50 results</SelectItem>
                <SelectItem value="100">100 results</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply Filters
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
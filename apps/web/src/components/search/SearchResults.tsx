import React, { useMemo } from 'react'
import { UseQueryResult } from '@tanstack/react-query'
import { MessageCircle, Users, Hash, Clock, FileText, Image, Video, Paperclip } from 'lucide-react'
import { Button } from '@ui/components/button'
import { cn } from '@/lib/utils'
import { useSearchHighlight } from '@/hooks/useSearch'
import { useChatStore } from '@/stores/chatStore'
import type { 
  GlobalSearchResult, 
  SearchResult, 
  MessageSearchResult, 
  UserSearchResult, 
  ConversationSearchResult 
} from '@/services/searchApi'

interface SearchResultsProps {
  searchType: 'global' | 'messages' | 'users' | 'conversations'
  query: string
  result: UseQueryResult<GlobalSearchResult | SearchResult<any>>
  filters: Record<string, any>
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  searchType,
  query,
  result,
  filters,
}) => {
  const { highlightText } = useSearchHighlight()
  const { setActiveConversation } = useChatStore()

  const { data, isLoading, isError, error } = result

  // Format results for display
  const formattedResults = useMemo(() => {
    if (!data) return null

    if (searchType === 'global') {
      const globalData = data as GlobalSearchResult
      return {
        messages: globalData.messages.hits,
        users: globalData.users.hits,
        conversations: globalData.conversations.hits,
        totalResults: globalData.totalResults,
        processingTime: globalData.processingTimeMs,
      }
    } else {
      const searchData = data as SearchResult<any>
      return {
        hits: searchData.hits,
        totalResults: searchData.estimatedTotalHits,
        processingTime: searchData.processingTimeMs,
      }
    }
  }, [data, searchType])

  // Handle message click
  const handleMessageClick = (message: MessageSearchResult) => {
    setActiveConversation(message.conversationId)
    // TODO: Navigate to specific message in conversation
  }

  // Handle user click
  const handleUserClick = (user: UserSearchResult) => {
    // TODO: Open user profile or start conversation
    console.log('User clicked:', user)
  }

  // Handle conversation click
  const handleConversationClick = (conversation: ConversationSearchResult) => {
    setActiveConversation(conversation.id)
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Get message type icon
  const getMessageTypeIcon = (type: string, hasAttachments: boolean, attachmentTypes: string[]) => {
    if (hasAttachments) {
      if (attachmentTypes.some(t => t.startsWith('image/'))) {
        return <Image className="h-3 w-3" />
      } else if (attachmentTypes.some(t => t.startsWith('video/'))) {
        return <Video className="h-3 w-3" />
      } else {
        return <Paperclip className="h-3 w-3" />
      }
    }
    return <MessageCircle className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p className="font-medium">Search failed</p>
          <p className="text-sm mt-1">{error?.message || 'An error occurred'}</p>
        </div>
      </div>
    )
  }

  if (!formattedResults) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No results found</p>
      </div>
    )
  }

  // Global search results
  if (searchType === 'global') {
    const { messages, users, conversations, totalResults, processingTime } = formattedResults as any

    return (
      <div className="h-full overflow-y-auto">
        {/* Search stats */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Found {totalResults.toLocaleString()} results in {processingTime}ms
          </p>
        </div>

        <div className="p-4 space-y-6">
          {/* Messages section */}
          {messages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">Messages</h3>
                <span className="text-sm text-gray-500">({messages.length})</span>
              </div>
              <div className="space-y-2">
                {messages.slice(0, 5).map((message: MessageSearchResult) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getMessageTypeIcon(message.type, message.hasAttachments, message.attachmentTypes)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {message.senderName}
                          </span>
                          <span className="text-xs text-gray-500">
                            @{message.senderUsername}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(message.createdAt)}
                          </span>
                        </div>
                        <p 
                          className="text-sm text-gray-700 line-clamp-2"
                          dangerouslySetInnerHTML={{ 
                            __html: message._formatted?.content || highlightText(message.content, query)
                          }}
                        />
                        {message.isReply && message.replyToContent && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            Replying to: {message.replyToContent.slice(0, 50)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users section */}
          {users.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">People</h3>
                <span className="text-sm text-gray-500">({users.length})</span>
              </div>
              <div className="space-y-2">
                {users.slice(0, 5).map((user: UserSearchResult) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="font-medium text-sm text-gray-900"
                          dangerouslySetInnerHTML={{ 
                            __html: user._formatted?.name || highlightText(user.name, query)
                          }}
                        />
                        <p 
                          className="text-sm text-gray-600"
                          dangerouslySetInnerHTML={{ 
                            __html: user._formatted?.username || highlightText(`@${user.username}`, query)
                          }}
                        />
                        {user.bio && (
                          <p 
                            className="text-xs text-gray-500 mt-1 line-clamp-1"
                            dangerouslySetInnerHTML={{ 
                              __html: user._formatted?.bio || highlightText(user.bio, query)
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversations section */}
          {conversations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Hash className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">Conversations</h3>
                <span className="text-sm text-gray-500">({conversations.length})</span>
              </div>
              <div className="space-y-2">
                {conversations.slice(0, 5).map((conversation: ConversationSearchResult) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          {conversation.type === 'dm' ? (
                            <MessageCircle className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Hash className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="font-medium text-sm text-gray-900"
                          dangerouslySetInnerHTML={{ 
                            __html: conversation._formatted?.title || highlightText(conversation.title || 'Untitled', query)
                          }}
                        />
                        <p 
                          className="text-xs text-gray-500"
                          dangerouslySetInnerHTML={{ 
                            __html: conversation._formatted?.memberNames || highlightText(conversation.memberNames, query)
                          }}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          {conversation.type === 'dm' ? 'Direct message' : `Group • ${conversation.memberIds.length} members`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No results found for "{query}"</p>
              <p className="text-sm text-gray-400 mt-1">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Specific search type results
  const { hits, totalResults, processingTime } = formattedResults as any

  return (
    <div className="h-full overflow-y-auto">
      {/* Search stats */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">
          Found {totalResults.toLocaleString()} results in {processingTime}ms
        </p>
      </div>

      <div className="p-4">
        {hits.length > 0 ? (
          <div className="space-y-2">
            {hits.map((item: any) => {
              if (searchType === 'messages') {
                const message = item as MessageSearchResult
                return (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getMessageTypeIcon(message.type, message.hasAttachments, message.attachmentTypes)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {message.senderName}
                          </span>
                          <span className="text-xs text-gray-500">
                            @{message.senderUsername}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(message.createdAt)}
                          </span>
                        </div>
                        <p 
                          className="text-sm text-gray-700"
                          dangerouslySetInnerHTML={{ 
                            __html: message._formatted?.content || highlightText(message.content, query)
                          }}
                        />
                        {message.isReply && message.replyToContent && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            Replying to: {message.replyToContent.slice(0, 50)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              } else if (searchType === 'users') {
                const user = item as UserSearchResult
                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="font-medium text-gray-900"
                          dangerouslySetInnerHTML={{ 
                            __html: user._formatted?.name || highlightText(user.name, query)
                          }}
                        />
                        <p 
                          className="text-sm text-gray-600"
                          dangerouslySetInnerHTML={{ 
                            __html: user._formatted?.username || highlightText(`@${user.username}`, query)
                          }}
                        />
                        {user.bio && (
                          <p 
                            className="text-sm text-gray-500 mt-1"
                            dangerouslySetInnerHTML={{ 
                              __html: user._formatted?.bio || highlightText(user.bio, query)
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              } else if (searchType === 'conversations') {
                const conversation = item as ConversationSearchResult
                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {conversation.type === 'dm' ? (
                            <MessageCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Hash className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="font-medium text-gray-900"
                          dangerouslySetInnerHTML={{ 
                            __html: conversation._formatted?.title || highlightText(conversation.title || 'Untitled', query)
                          }}
                        />
                        <p 
                          className="text-sm text-gray-500"
                          dangerouslySetInnerHTML={{ 
                            __html: conversation._formatted?.memberNames || highlightText(conversation.memberNames, query)
                          }}
                        />
                        <p className="text-sm text-gray-400 mt-1">
                          {conversation.type === 'dm' ? 'Direct message' : `Group • ${conversation.memberIds.length} members`}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No results found for "{query}"</p>
            <p className="text-sm text-gray-400 mt-1">Try different keywords or check your spelling</p>
          </div>
        )}
      </div>
    </div>
  )
}
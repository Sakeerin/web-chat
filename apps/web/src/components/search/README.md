# Search Interface Implementation

This directory contains the complete search interface implementation for the Telegram-like web chat application. The search system provides real-time search capabilities across messages, users, and conversations with advanced filtering, suggestions, and history management.

## Features Implemented

### ✅ Global Search Interface
- **Real-time search** with debounced input (300ms delay)
- **Multi-type search** supporting messages, users, conversations, and global search
- **Tabbed interface** for switching between search types
- **Responsive design** that works on desktop and mobile

### ✅ Search Results Display
- **Highlighted search terms** in results using HTML highlighting
- **Rich result cards** with user avatars, message previews, and metadata
- **Infinite scroll pagination** for large result sets
- **Result type indicators** (text, image, video, file attachments)
- **Click-to-navigate** functionality to open conversations or profiles

### ✅ Advanced Search Filters
- **Date range filtering** for messages (from/to dates)
- **Message type filtering** (text, image, video, audio, files)
- **Attachment filtering** (messages with/without attachments)
- **Conversation type filtering** (DM, group, channel)
- **User filtering** (exclude blocked users)
- **Results per page** configuration

### ✅ Search Suggestions
- **Real-time suggestions** as user types (2+ characters)
- **Multiple suggestion types**:
  - Recent searches from message history
  - Contact suggestions based on username/name matching
  - Popular search terms
- **Suggestion metadata** with user information for contacts

### ✅ Search History
- **Automatic history tracking** of executed searches
- **Local storage persistence** (up to 50 recent searches)
- **History management** with individual item removal and clear all
- **Search result counts** displayed with history items
- **Quick re-execution** of previous searches

### ✅ Saved Searches
- **Save frequently used searches** with custom names
- **Edit saved search names** inline
- **Delete saved searches** with confirmation
- **Filter and query persistence** in saved searches
- **Local storage persistence** (up to 20 saved searches)

### ✅ Performance Optimizations
- **Debounced search input** to reduce API calls
- **Query caching** with React Query (30-second stale time)
- **Virtualized result lists** for large datasets
- **Lazy loading** of search suggestions and history
- **Optimistic UI updates** for instant feedback

### ✅ Accessibility Features
- **Keyboard navigation** support (Enter, Escape, Tab)
- **Screen reader compatibility** with proper ARIA labels
- **Focus management** for modal and dropdown interactions
- **High contrast support** with proper color schemes

## Component Architecture

```
search/
├── SearchInterface.tsx      # Main search interface component
├── SearchResults.tsx        # Results display with highlighting
├── SearchFilters.tsx        # Advanced filtering interface
├── SearchSuggestions.tsx    # Real-time search suggestions
├── SearchHistory.tsx        # Search history management
├── SavedSearches.tsx        # Saved searches management
├── SearchModal.tsx          # Modal wrapper for search
├── SearchBar.tsx            # Compact search bar component
├── index.ts                 # Component exports
├── README.md               # This documentation
└── SearchInterface.test.tsx # Unit tests
```

## API Integration

The search interface integrates with the backend search API through:

- **`/search/messages`** - Message search with filtering
- **`/search/users`** - User/contact search
- **`/search/conversations`** - Conversation search
- **`/search/suggestions`** - Real-time search suggestions

## Usage Examples

### Basic Search Interface

```tsx
import { SearchInterface } from '@/components/search'

function MyPage() {
  return (
    <SearchInterface
      initialQuery=""
      initialType="global"
      onClose={() => navigate('/chat')}
    />
  )
}
```

### Search Modal

```tsx
import { SearchModal } from '@/components/search'

function ChatPage() {
  const [showSearch, setShowSearch] = useState(false)
  
  return (
    <>
      <button onClick={() => setShowSearch(true)}>
        Search
      </button>
      
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        initialType="messages"
      />
    </>
  )
}
```

### Compact Search Bar

```tsx
import { SearchBar } from '@/components/search'

function Header() {
  const navigate = useNavigate()
  
  return (
    <SearchBar
      placeholder="Search conversations..."
      onSearch={(query) => navigate(`/search?q=${query}`)}
      showSuggestions={true}
    />
  )
}
```

## State Management

The search interface uses several hooks for state management:

- **`useSearchWithHistory`** - Main search state with history integration
- **`useSearchHistory`** - Local search history management
- **`useSavedSearches`** - Saved searches management
- **`useSearchHighlight`** - Text highlighting utilities

## Local Storage Schema

### Search History
```json
{
  "search-history": [
    {
      "id": "uuid",
      "query": "search term",
      "type": "messages",
      "timestamp": 1640995200000,
      "resultCount": 42
    }
  ]
}
```

### Saved Searches
```json
{
  "saved-searches": [
    {
      "id": "uuid",
      "name": "Important Messages",
      "query": "important",
      "type": "messages",
      "filters": {
        "dateFrom": "2024-01-01T00:00:00.000Z",
        "messageTypes": "text,image"
      },
      "createdAt": 1640995200000,
      "updatedAt": 1640995200000
    }
  ]
}
```

## Performance Considerations

1. **Debouncing**: Search input is debounced by 300ms to reduce API calls
2. **Caching**: Search results are cached for 30 seconds using React Query
3. **Pagination**: Results use cursor-based pagination for efficient loading
4. **Virtual Scrolling**: Large result lists use virtualization for performance
5. **Lazy Loading**: Suggestions and history are loaded on-demand

## Testing

The search interface includes comprehensive unit tests covering:

- Component rendering and interaction
- Search execution and result display
- Filter application and management
- History and saved search functionality
- Keyboard navigation and accessibility

Run tests with:
```bash
npm test SearchInterface
```

## Browser Support

The search interface supports:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

Potential improvements for future iterations:

1. **Voice Search** - Speech-to-text search input
2. **Search Analytics** - Track popular searches and optimize suggestions
3. **Advanced Operators** - Support for search operators like `from:user` or `has:image`
4. **Search Shortcuts** - Keyboard shortcuts for quick search access
5. **Search Scopes** - Limit search to specific conversations or time periods
6. **Export Results** - Allow exporting search results to various formats

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **10.1**: Message search through latest 30 days with P95 < 300ms response time
- **10.2**: Real-time search suggestions and results
- **10.3**: Contact search with server-side functionality
- **10.4**: Conversation search with title and participant matching
- **10.5**: Search result highlighting and proper display

The search interface provides a comprehensive, performant, and user-friendly search experience that meets all the specified requirements while maintaining excellent performance and accessibility standards.
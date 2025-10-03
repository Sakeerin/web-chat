import { create } from 'zustand'
import type { Contact, ContactRequest, BlockedUser, SearchUser } from '@/types/contacts'

interface ContactsState {
  // Contacts
  contacts: Contact[]
  contactsLoading: boolean
  contactsError: string | null
  hasMoreContacts: boolean
  
  // Contact requests
  pendingRequests: ContactRequest[]
  sentRequests: ContactRequest[]
  requestsLoading: boolean
  requestsError: string | null
  
  // Blocked users
  blockedUsers: BlockedUser[]
  blockedUsersLoading: boolean
  blockedUsersError: string | null
  hasMoreBlockedUsers: boolean
  
  // User search
  searchResults: SearchUser[]
  searchLoading: boolean
  searchError: string | null
  searchQuery: string
  
  // Actions
  setContacts: (contacts: Contact[], hasMore: boolean) => void
  addContacts: (contacts: Contact[], hasMore: boolean) => void
  removeContact: (contactId: string) => void
  setContactsLoading: (loading: boolean) => void
  setContactsError: (error: string | null) => void
  
  setPendingRequests: (requests: ContactRequest[]) => void
  setSentRequests: (requests: ContactRequest[]) => void
  addContactRequest: (request: ContactRequest) => void
  updateContactRequest: (requestId: string, updates: Partial<ContactRequest>) => void
  removeContactRequest: (requestId: string) => void
  setRequestsLoading: (loading: boolean) => void
  setRequestsError: (error: string | null) => void
  
  setBlockedUsers: (users: BlockedUser[], hasMore: boolean) => void
  addBlockedUsers: (users: BlockedUser[], hasMore: boolean) => void
  addBlockedUser: (user: BlockedUser) => void
  removeBlockedUser: (userId: string) => void
  setBlockedUsersLoading: (loading: boolean) => void
  setBlockedUsersError: (error: string | null) => void
  
  setSearchResults: (results: SearchUser[]) => void
  setSearchLoading: (loading: boolean) => void
  setSearchError: (error: string | null) => void
  setSearchQuery: (query: string) => void
  clearSearch: () => void
  
  // Reset all state
  reset: () => void
}

const initialState = {
  contacts: [],
  contactsLoading: false,
  contactsError: null,
  hasMoreContacts: false,
  
  pendingRequests: [],
  sentRequests: [],
  requestsLoading: false,
  requestsError: null,
  
  blockedUsers: [],
  blockedUsersLoading: false,
  blockedUsersError: null,
  hasMoreBlockedUsers: false,
  
  searchResults: [],
  searchLoading: false,
  searchError: null,
  searchQuery: '',
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  ...initialState,

  // Contacts actions
  setContacts: (contacts, hasMore) => {
    set({ contacts, hasMoreContacts: hasMore, contactsError: null })
  },

  addContacts: (newContacts, hasMore) => {
    const { contacts } = get()
    const existingIds = new Set(contacts.map(c => c.id))
    const uniqueNewContacts = newContacts.filter(c => !existingIds.has(c.id))
    
    set({
      contacts: [...contacts, ...uniqueNewContacts],
      hasMoreContacts: hasMore,
      contactsError: null,
    })
  },

  removeContact: (contactId) => {
    const { contacts } = get()
    set({ contacts: contacts.filter(c => c.id !== contactId) })
  },

  setContactsLoading: (loading) => {
    set({ contactsLoading: loading })
  },

  setContactsError: (error) => {
    set({ contactsError: error, contactsLoading: false })
  },

  // Contact requests actions
  setPendingRequests: (requests) => {
    set({ pendingRequests: requests, requestsError: null })
  },

  setSentRequests: (requests) => {
    set({ sentRequests: requests, requestsError: null })
  },

  addContactRequest: (request) => {
    const { pendingRequests } = get()
    
    if (request.receiverId === request.senderId) return // Invalid request
    
    // Add to appropriate list based on current user
    // This would need to be determined by comparing with current user ID
    set({
      pendingRequests: [...pendingRequests, request],
      requestsError: null,
    })
  },

  updateContactRequest: (requestId, updates) => {
    const { pendingRequests, sentRequests } = get()
    
    set({
      pendingRequests: pendingRequests.map(r => 
        r.id === requestId ? { ...r, ...updates } : r
      ),
      sentRequests: sentRequests.map(r => 
        r.id === requestId ? { ...r, ...updates } : r
      ),
    })
  },

  removeContactRequest: (requestId) => {
    const { pendingRequests, sentRequests } = get()
    
    set({
      pendingRequests: pendingRequests.filter(r => r.id !== requestId),
      sentRequests: sentRequests.filter(r => r.id !== requestId),
    })
  },

  setRequestsLoading: (loading) => {
    set({ requestsLoading: loading })
  },

  setRequestsError: (error) => {
    set({ requestsError: error, requestsLoading: false })
  },

  // Blocked users actions
  setBlockedUsers: (users, hasMore) => {
    set({ blockedUsers: users, hasMoreBlockedUsers: hasMore, blockedUsersError: null })
  },

  addBlockedUsers: (newUsers, hasMore) => {
    const { blockedUsers } = get()
    const existingIds = new Set(blockedUsers.map(u => u.blockedUserId))
    const uniqueNewUsers = newUsers.filter(u => !existingIds.has(u.blockedUserId))
    
    set({
      blockedUsers: [...blockedUsers, ...uniqueNewUsers],
      hasMoreBlockedUsers: hasMore,
      blockedUsersError: null,
    })
  },

  addBlockedUser: (user) => {
    const { blockedUsers } = get()
    set({ blockedUsers: [user, ...blockedUsers] })
  },

  removeBlockedUser: (userId) => {
    const { blockedUsers } = get()
    set({ blockedUsers: blockedUsers.filter(u => u.blockedUserId !== userId) })
  },

  setBlockedUsersLoading: (loading) => {
    set({ blockedUsersLoading: loading })
  },

  setBlockedUsersError: (error) => {
    set({ blockedUsersError: error, blockedUsersLoading: false })
  },

  // Search actions
  setSearchResults: (results) => {
    set({ searchResults: results, searchError: null })
  },

  setSearchLoading: (loading) => {
    set({ searchLoading: loading })
  },

  setSearchError: (error) => {
    set({ searchError: error, searchLoading: false })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: '', searchError: null })
  },

  // Reset all state
  reset: () => {
    set(initialState)
  },
}))
import { useContactsStore } from './contactsStore'
import type { Contact, ContactRequest, BlockedUser, SearchUser } from '@/types/contacts'

// Mock data
const mockContact: Contact = {
  id: '1',
  username: 'johndoe',
  name: 'John Doe',
  bio: 'Software developer',
  avatarUrl: 'https://example.com/avatar.jpg',
  lastSeenAt: new Date('2023-12-01T10:00:00Z'),
  isOnline: false,
  contactedAt: new Date('2023-11-01T10:00:00Z'),
}

const mockContactRequest: ContactRequest = {
  id: '1',
  senderId: 'sender-id',
  receiverId: 'receiver-id',
  status: 'PENDING',
  message: 'Hello!',
  createdAt: new Date(),
  updatedAt: new Date(),
  sender: {
    id: 'sender-id',
    username: 'sender',
    name: 'Sender',
    avatarUrl: 'https://example.com/sender.jpg',
  },
  receiver: {
    id: 'receiver-id',
    username: 'receiver',
    name: 'Receiver',
    avatarUrl: 'https://example.com/receiver.jpg',
  },
}

const mockBlockedUser: BlockedUser = {
  id: '1',
  blockingUserId: 'blocker-id',
  blockedUserId: 'blocked-id',
  reason: 'Spam',
  createdAt: new Date(),
  blockedUser: {
    id: 'blocked-id',
    username: 'blocked',
    name: 'Blocked User',
    avatarUrl: 'https://example.com/blocked.jpg',
  },
}

const mockSearchUser: SearchUser = {
  id: '1',
  username: 'searchuser',
  name: 'Search User',
  bio: 'Test user',
  avatarUrl: 'https://example.com/search.jpg',
  isContact: false,
  isBlocked: false,
}

describe('contactsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useContactsStore.getState().reset()
  })

  describe('contacts management', () => {
    it('sets contacts correctly', () => {
      const { setContacts } = useContactsStore.getState()
      
      setContacts([mockContact], true)
      
      const state = useContactsStore.getState()
      expect(state.contacts).toEqual([mockContact])
      expect(state.hasMoreContacts).toBe(true)
      expect(state.contactsError).toBeNull()
    })

    it('adds contacts without duplicates', () => {
      const { setContacts, addContacts } = useContactsStore.getState()
      
      // Set initial contacts
      setContacts([mockContact], false)
      
      // Add new contacts including a duplicate
      const newContact = { ...mockContact, id: '2', name: 'Jane Doe' }
      addContacts([mockContact, newContact], true)
      
      const state = useContactsStore.getState()
      expect(state.contacts).toHaveLength(2)
      expect(state.contacts[1]).toEqual(newContact)
      expect(state.hasMoreContacts).toBe(true)
    })

    it('removes contact correctly', () => {
      const { setContacts, removeContact } = useContactsStore.getState()
      
      setContacts([mockContact], false)
      removeContact(mockContact.id)
      
      const state = useContactsStore.getState()
      expect(state.contacts).toHaveLength(0)
    })

    it('sets loading and error states', () => {
      const { setContactsLoading, setContactsError } = useContactsStore.getState()
      
      setContactsLoading(true)
      expect(useContactsStore.getState().contactsLoading).toBe(true)
      
      setContactsError('Test error')
      const state = useContactsStore.getState()
      expect(state.contactsError).toBe('Test error')
      expect(state.contactsLoading).toBe(false)
    })
  })

  describe('contact requests management', () => {
    it('sets pending and sent requests', () => {
      const { setPendingRequests, setSentRequests } = useContactsStore.getState()
      
      setPendingRequests([mockContactRequest])
      setSentRequests([mockContactRequest])
      
      const state = useContactsStore.getState()
      expect(state.pendingRequests).toEqual([mockContactRequest])
      expect(state.sentRequests).toEqual([mockContactRequest])
      expect(state.requestsError).toBeNull()
    })

    it('adds contact request', () => {
      const { addContactRequest } = useContactsStore.getState()
      
      addContactRequest(mockContactRequest)
      
      const state = useContactsStore.getState()
      expect(state.pendingRequests).toEqual([mockContactRequest])
      expect(state.requestsError).toBeNull()
    })

    it('updates contact request', () => {
      const { setPendingRequests, updateContactRequest } = useContactsStore.getState()
      
      setPendingRequests([mockContactRequest])
      updateContactRequest(mockContactRequest.id, { status: 'ACCEPTED' })
      
      const state = useContactsStore.getState()
      expect(state.pendingRequests[0].status).toBe('ACCEPTED')
    })

    it('removes contact request', () => {
      const { setPendingRequests, removeContactRequest } = useContactsStore.getState()
      
      setPendingRequests([mockContactRequest])
      removeContactRequest(mockContactRequest.id)
      
      const state = useContactsStore.getState()
      expect(state.pendingRequests).toHaveLength(0)
    })
  })

  describe('blocked users management', () => {
    it('sets blocked users correctly', () => {
      const { setBlockedUsers } = useContactsStore.getState()
      
      setBlockedUsers([mockBlockedUser], true)
      
      const state = useContactsStore.getState()
      expect(state.blockedUsers).toEqual([mockBlockedUser])
      expect(state.hasMoreBlockedUsers).toBe(true)
      expect(state.blockedUsersError).toBeNull()
    })

    it('adds blocked users without duplicates', () => {
      const { setBlockedUsers, addBlockedUsers } = useContactsStore.getState()
      
      setBlockedUsers([mockBlockedUser], false)
      
      const newBlockedUser = { ...mockBlockedUser, id: '2', blockedUserId: 'blocked-2' }
      addBlockedUsers([mockBlockedUser, newBlockedUser], true)
      
      const state = useContactsStore.getState()
      expect(state.blockedUsers).toHaveLength(2)
      expect(state.blockedUsers[1]).toEqual(newBlockedUser)
    })

    it('adds and removes blocked user', () => {
      const { addBlockedUser, removeBlockedUser } = useContactsStore.getState()
      
      addBlockedUser(mockBlockedUser)
      expect(useContactsStore.getState().blockedUsers).toEqual([mockBlockedUser])
      
      removeBlockedUser(mockBlockedUser.blockedUserId)
      expect(useContactsStore.getState().blockedUsers).toHaveLength(0)
    })
  })

  describe('search management', () => {
    it('sets search results and query', () => {
      const { setSearchResults, setSearchQuery } = useContactsStore.getState()
      
      setSearchResults([mockSearchUser])
      setSearchQuery('test query')
      
      const state = useContactsStore.getState()
      expect(state.searchResults).toEqual([mockSearchUser])
      expect(state.searchQuery).toBe('test query')
      expect(state.searchError).toBeNull()
    })

    it('sets search loading and error states', () => {
      const { setSearchLoading, setSearchError } = useContactsStore.getState()
      
      setSearchLoading(true)
      expect(useContactsStore.getState().searchLoading).toBe(true)
      
      setSearchError('Search failed')
      const state = useContactsStore.getState()
      expect(state.searchError).toBe('Search failed')
      expect(state.searchLoading).toBe(false)
    })

    it('clears search state', () => {
      const { setSearchResults, setSearchQuery, setSearchError, clearSearch } = useContactsStore.getState()
      
      // Set some search state
      setSearchResults([mockSearchUser])
      setSearchQuery('test')
      setSearchError('error')
      
      // Clear search
      clearSearch()
      
      const state = useContactsStore.getState()
      expect(state.searchResults).toEqual([])
      expect(state.searchQuery).toBe('')
      expect(state.searchError).toBeNull()
    })
  })

  describe('reset functionality', () => {
    it('resets all state to initial values', () => {
      const store = useContactsStore.getState()
      
      // Set some state
      store.setContacts([mockContact], true)
      store.setPendingRequests([mockContactRequest])
      store.setBlockedUsers([mockBlockedUser], true)
      store.setSearchResults([mockSearchUser])
      store.setSearchQuery('test')
      
      // Reset
      store.reset()
      
      const state = useContactsStore.getState()
      expect(state.contacts).toEqual([])
      expect(state.pendingRequests).toEqual([])
      expect(state.blockedUsers).toEqual([])
      expect(state.searchResults).toEqual([])
      expect(state.searchQuery).toBe('')
      expect(state.contactsLoading).toBe(false)
      expect(state.requestsLoading).toBe(false)
      expect(state.blockedUsersLoading).toBe(false)
      expect(state.searchLoading).toBe(false)
      expect(state.contactsError).toBeNull()
      expect(state.requestsError).toBeNull()
      expect(state.blockedUsersError).toBeNull()
      expect(state.searchError).toBeNull()
    })
  })
})
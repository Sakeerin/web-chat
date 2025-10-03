import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/services/contactsApi'
import { useContactsStore } from '@/stores/contactsStore'
import type {
  ContactsListParams,
  SearchUsersParams,
  RespondToContactRequestData,
} from '@/services/contactsApi'

// Query keys
export const contactsKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactsKeys.all, 'list'] as const,
  list: (params?: ContactsListParams) => [...contactsKeys.lists(), params] as const,
  requests: () => [...contactsKeys.all, 'requests'] as const,
  pendingRequests: () => [...contactsKeys.requests(), 'pending'] as const,
  sentRequests: () => [...contactsKeys.requests(), 'sent'] as const,
  blocked: () => [...contactsKeys.all, 'blocked'] as const,
  search: (query: string) => [...contactsKeys.all, 'search', query] as const,
}

// Contacts list
export function useContacts(params?: ContactsListParams) {
  return useQuery({
    queryKey: contactsKeys.list(params),
    queryFn: () => contactsApi.getContacts(params),
  })
}

// Contact requests
export function usePendingContactRequests() {
  return useQuery({
    queryKey: contactsKeys.pendingRequests(),
    queryFn: contactsApi.getPendingContactRequests,
  })
}

export function useSentContactRequests() {
  return useQuery({
    queryKey: contactsKeys.sentRequests(),
    queryFn: contactsApi.getSentContactRequests,
  })
}

// User search
export function useUserSearch(params: SearchUsersParams) {
  return useQuery({
    queryKey: contactsKeys.search(params.query),
    queryFn: () => contactsApi.searchUsers(params),
    enabled: params.query.length > 0,
  })
}

// Blocked users
export function useBlockedUsers(params?: ContactsListParams) {
  return useQuery({
    queryKey: contactsKeys.blocked(),
    queryFn: () => contactsApi.getBlockedUsers(params),
  })
}

// Mutations
export function useSendContactRequest() {
  const queryClient = useQueryClient()
  const { addContactRequest } = useContactsStore()

  return useMutation({
    mutationFn: contactsApi.sendContactRequest,
    onSuccess: (data) => {
      addContactRequest(data)
      queryClient.invalidateQueries({ queryKey: contactsKeys.sentRequests() })
    },
  })
}

export function useRespondToContactRequest() {
  const queryClient = useQueryClient()
  const { updateContactRequest, removeContactRequest } = useContactsStore()

  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: RespondToContactRequestData }) =>
      contactsApi.respondToContactRequest(requestId, data),
    onSuccess: (data) => {
      if (data.status === 'ACCEPTED') {
        // Refresh contacts list when request is accepted
        queryClient.invalidateQueries({ queryKey: contactsKeys.lists() })
      }
      
      updateContactRequest(data.id, data)
      
      // Remove from pending requests after a delay to show the status change
      setTimeout(() => {
        removeContactRequest(data.id)
        queryClient.invalidateQueries({ queryKey: contactsKeys.pendingRequests() })
      }, 1000)
    },
  })
}

export function useRemoveContact() {
  const queryClient = useQueryClient()
  const { removeContact } = useContactsStore()

  return useMutation({
    mutationFn: contactsApi.removeContact,
    onSuccess: (_, contactId) => {
      removeContact(contactId)
      queryClient.invalidateQueries({ queryKey: contactsKeys.lists() })
    },
  })
}

export function useBlockUser() {
  const queryClient = useQueryClient()
  const { addBlockedUser, removeContact } = useContactsStore()

  return useMutation({
    mutationFn: contactsApi.blockUser,
    onSuccess: (data) => {
      addBlockedUser(data)
      removeContact(data.blockedUserId)
      queryClient.invalidateQueries({ queryKey: contactsKeys.blocked() })
      queryClient.invalidateQueries({ queryKey: contactsKeys.lists() })
    },
  })
}

export function useUnblockUser() {
  const queryClient = useQueryClient()
  const { removeBlockedUser } = useContactsStore()

  return useMutation({
    mutationFn: contactsApi.unblockUser,
    onSuccess: (_, userId) => {
      removeBlockedUser(userId)
      queryClient.invalidateQueries({ queryKey: contactsKeys.blocked() })
    },
  })
}

export function useReportUser() {
  return useMutation({
    mutationFn: contactsApi.reportUser,
  })
}
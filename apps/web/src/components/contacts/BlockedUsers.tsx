
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { useBlockedUsers, useUnblockUser } from '@/hooks/useContacts'
import { useContactsStore } from '@/stores/contactsStore'
import type { BlockedUser } from '@/types/contacts'

interface BlockedUserCardProps {
  blockedUser: BlockedUser
  onUnblock: (userId: string) => void
  isLoading?: boolean
}

function BlockedUserCard({ blockedUser, onUnblock, isLoading = false }: BlockedUserCardProps) {
  const { blockedUser: user, reason, createdAt } = blockedUser

  const handleUnblock = () => {
    if (window.confirm(`Are you sure you want to unblock ${user.name}?`)) {
      onUnblock(user.id)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="flex items-center space-x-3 p-3 border rounded-lg">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover grayscale"
            />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-muted-foreground">{user.name}</h3>
          <span className="text-xs text-muted-foreground">@{user.username}</span>
        </div>
        
        {reason && (
          <p className="text-xs text-muted-foreground mt-1">
            Reason: {reason}
          </p>
        )}
        
        <p className="text-xs text-muted-foreground mt-1">
          Blocked on {formatDate(createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleUnblock}
          disabled={isLoading}
        >
          {isLoading ? 'Unblocking...' : 'Unblock'}
        </Button>
      </div>
    </div>
  )
}

export function BlockedUsers() {
  const { blockedUsers, blockedUsersLoading, blockedUsersError, hasMoreBlockedUsers } = useContactsStore()
  const { isLoading, error, refetch } = useBlockedUsers()
  const unblockMutation = useUnblockUser()

  const handleUnblock = async (userId: string) => {
    try {
      await unblockMutation.mutateAsync(userId)
    } catch (error) {
      console.error('Failed to unblock user:', error)
      alert('Failed to unblock user. Please try again.')
    }
  }

  const handleLoadMore = () => {
    // TODO: Implement pagination
    console.log('Load more blocked users')
  }

  if (isLoading || blockedUsersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blocked Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading blocked users...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || blockedUsersError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blocked Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="text-sm text-destructive">
              {(error as Error)?.message || blockedUsersError || 'Failed to load blocked users'}
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocked Users ({blockedUsers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">
              No blocked users
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((blockedUser) => (
              <BlockedUserCard
                key={blockedUser.id}
                blockedUser={blockedUser}
                onUnblock={handleUnblock}
                isLoading={unblockMutation.isPending}
              />
            ))}
            
            {hasMoreBlockedUsers && (
              <div className="pt-4">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
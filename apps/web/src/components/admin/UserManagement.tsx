import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../services/adminApi'
import { Card } from '@ui/components/card'
import { Button } from '@ui/components/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@ui/components/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select'

interface User {
  id: string
  username: string
  email: string
  name: string
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  isActive: boolean
  isSuspended: boolean
  suspendedUntil?: string
  createdAt: string
  lastSeenAt: string
}

export const UserManagement: React.FC = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionType, setActionType] = useState<'suspend' | 'ban' | 'role' | null>(null)

  const queryClient = useQueryClient()

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter, statusFilter],
    queryFn: () => adminApi.getUsers({
      page,
      limit: 20,
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
    }),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason, duration }: { userId: string; reason: string; duration?: number }) =>
      adminApi.suspendUser(userId, { reason, duration }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setSelectedUser(null)
      setActionType(null)
    },
  })

  const banMutation = useMutation({
    mutationFn: ({ userId, reason, permanent }: { userId: string; reason: string; permanent: boolean }) =>
      adminApi.banUser(userId, { reason, permanent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setSelectedUser(null)
      setActionType(null)
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateUserRole(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setSelectedUser(null)
      setActionType(null)
    },
  })

  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const handleAction = (user: User, action: 'suspend' | 'ban' | 'role') => {
    setSelectedUser(user)
    setActionType(action)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'MODERATOR':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (user: User) => {
    if (!user.isActive) return 'bg-red-100 text-red-800'
    if (user.isSuspended) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (user: User) => {
    if (!user.isActive) return 'Banned'
    if (user.isSuspended) return 'Suspended'
    return 'Active'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Username, email, or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSearch('')
                setRoleFilter('')
                setStatusFilter('')
                setPage(1)
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersData?.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{user.username} • {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user)}`}>
                        {getStatusText(user)}
                      </span>
                      {user.suspendedUntil && (
                        <div className="text-xs text-gray-500 mt-1">
                          Until {formatDate(user.suspendedUntil)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.lastSeenAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.isSuspended ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unsuspendMutation.mutate(user.id)}
                        >
                          Unsuspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(user, 'suspend')}
                        >
                          Suspend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(user, 'ban')}
                        disabled={user.role === 'ADMIN'}
                      >
                        Ban
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(user, 'role')}
                      >
                        Role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {usersData && usersData.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, usersData.total)} of {usersData.total} users
            </div>
            <div className="space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= usersData.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Action Modals */}
      {selectedUser && actionType && (
        <UserActionModal
          user={selectedUser}
          actionType={actionType}
          onClose={() => {
            setSelectedUser(null)
            setActionType(null)
          }}
          onSuspend={(reason, duration) => suspendMutation.mutate({ userId: selectedUser.id, reason, duration })}
          onBan={(reason, permanent) => banMutation.mutate({ userId: selectedUser.id, reason, permanent })}
          onUpdateRole={(role) => updateRoleMutation.mutate({ userId: selectedUser.id, role })}
        />
      )}
    </div>
  )
}

interface UserActionModalProps {
  user: User
  actionType: 'suspend' | 'ban' | 'role'
  onClose: () => void
  onSuspend: (reason: string, duration?: number) => void
  onBan: (reason: string, permanent: boolean) => void
  onUpdateRole: (role: string) => void
}

const UserActionModal: React.FC<UserActionModalProps> = ({
  user,
  actionType,
  onClose,
  onSuspend,
  onBan,
  onUpdateRole,
}) => {
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState<number | undefined>()
  const [permanent, setPermanent] = useState(false)
  const [newRole, setNewRole] = useState(user.role)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    switch (actionType) {
      case 'suspend':
        onSuspend(reason, duration)
        break
      case 'ban':
        onBan(reason, permanent)
        break
      case 'role':
        onUpdateRole(newRole)
        break
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === 'suspend' && 'Suspend User'}
            {actionType === 'ban' && 'Ban User'}
            {actionType === 'role' && 'Update User Role'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              User: <strong>{user.name}</strong> (@{user.username})
            </p>
          </div>

          {actionType === 'role' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Role
              </label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="MODERATOR">Moderator</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              {actionType === 'suspend' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (hours, optional)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={duration || ''}
                    onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Leave empty for indefinite"
                  />
                </div>
              )}

              {actionType === 'ban' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="permanent"
                    checked={permanent}
                    onChange={(e) => setPermanent(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="permanent" className="text-sm text-gray-700">
                    Permanent ban
                  </label>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {actionType === 'suspend' && 'Suspend'}
              {actionType === 'ban' && 'Ban'}
              {actionType === 'role' && 'Update Role'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useIsAdmin } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  Users, 
  UserPlus, 
  // UserMinus, 
  UserCheck, 
  UserX, 
  Shield, 
  Search, 
  // Filter, 
  // MoreVertical,
  Edit3,
  Trash2,
  Mail,
  Calendar,
  Activity,
  // Download,
  // Upload,
  AlertTriangle,
  Clock,
  CheckCircle,
  Ban,
  // Key,
  // Eye,
  EyeOff
} from 'lucide-react'
import { authLogger } from '@/lib/logger'

interface UserWithAccess {
  id: string
  email: string
  name: string
  role: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest'
  status: 'pending' | 'approved' | 'suspended'
  created: string
  approved: boolean
  approvedBy?: string
  approvedAt?: string
  hasAccess: boolean
  provider: string
  lastLogin?: string
}

interface UserStats {
  total: number
  byRole: Record<string, number>
  byStatus: Record<string, number>
  pendingApprovals: number
  recentSignups: number
}

interface BulkAction {
  type: 'approve' | 'suspend' | 'delete' | 'change-role'
  role?: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest'
}

export default function UserManagerPage() {
  const { isLoaded } = useUser()
  const isAdmin = useIsAdmin()
  
  // State management
  const [users, setUsers] = useState<UserWithAccess[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'created' | 'email' | 'name' | 'lastLogin'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Dialog states
  const [editingUser, setEditingUser] = useState<UserWithAccess | null>(null)
  const [bulkActionDialog, setBulkActionDialog] = useState(false)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithAccess | null>(null)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    notes: ''
  })

  // Load users and statistics
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load users
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (roleFilter !== 'all') {
        params.set('role', roleFilter)
      }

      const [usersResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/users?${params}`),
        fetch('/api/admin/user-stats')
      ])

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const usersData = await usersResponse.json()
      const statsData = await statsResponse.json()

      setUsers(usersData.users)
      setStats(statsData)
    } catch (error) {
      authLogger.error('Error loading user data', { error })
      toast.error('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }, [roleFilter, statusFilter])

  // Perform individual user action
  const performUserAction = async (userId: string, action: string, role?: string, notes?: string) => {
    try {
      setActionLoading(userId)
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUserId: userId,
          role,
          notes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to perform action')
      }

      const data = await response.json()
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? data.user : user
        )
      )

      toast.success(`User ${action}${role ? ` to ${role}` : ''} successfully`)
    } catch (error) {
      authLogger.error('Error performing user action', { action, error })
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Perform bulk action on selected users
  const performBulkAction = async (bulkAction: BulkAction) => {
    if (selectedUsers.size === 0) return

    try {
      setActionLoading('bulk')
      
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          action: bulkAction.type,
          role: bulkAction.role
        })
      })

      if (!response.ok) {
        throw new Error('Failed to perform bulk action')
      }

      const data = await response.json()
      
      // Refresh data
      await loadData()
      setSelectedUsers(new Set())
      setBulkActionDialog(false)
      
      toast.success(`Bulk action completed: ${data.processed} users updated`)
    } catch (error) {
      authLogger.error('Error performing bulk action', { bulkAction, error })
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = searchQuery === '' || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'created':
          aVal = new Date(a.created).getTime()
          bVal = new Date(b.created).getTime()
          break
        case 'email':
          aVal = a.email.toLowerCase()
          bVal = b.email.toLowerCase()
          break
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'lastLogin':
          aVal = a.lastLogin ? new Date(a.lastLogin).getTime() : 0
          bVal = b.lastLogin ? new Date(b.lastLogin).getTime() : 0
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

  // Handle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  const selectAllUsers = () => {
    setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
  }

  // Handle user deletion
  const deleteUser = async (userId: string) => {
    try {
      setActionLoading(userId)
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          targetUserId: userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      const data = await response.json()
      
      // Remove user from local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId))
      setDeleteConfirmUser(null)
      
      toast.success(`User ${data.deletedUser.name} deleted successfully`)
    } catch (error) {
      authLogger.error('Error deleting user', { error })
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle user editing
  const openEditDialog = (user: UserWithAccess) => {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      role: user.role,
      notes: ''
    })
  }

  const saveUserChanges = async () => {
    if (!editingUser) return

    try {
      setActionLoading(editingUser.id)

      // Check if role changed
      if (editForm.role !== editingUser.role) {
        await performUserAction(editingUser.id, 'promote', editForm.role, editForm.notes)
      }

      // For now, we'll just handle role changes since name changes would require additional API endpoints
      // TODO: Add name update functionality if needed
      
      setEditingUser(null)
      toast.success('User updated successfully')
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Role and status badge helpers
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default'
      case 'family': return 'secondary'
      case 'extended-family': return 'outline'
      case 'friend': return 'outline'
      case 'guest': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default'
      case 'pending': return 'secondary'
      case 'suspended': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'suspended': return <Ban className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  useEffect(() => {
    if (isLoaded && isAdmin) {
      loadData()
    }
  }, [isLoaded, isAdmin, loadData])

  // Redirect if not admin
  if (isLoaded && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Manager</h1>
            <p className="text-muted-foreground">
              Comprehensive user administration and role management
            </p>
          </div>
          <div className="flex space-x-2">
            <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join the family gallery
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input id="invite-email" placeholder="user@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="extended-family">Extended Family</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="invite-message">Personal Message (Optional)</Label>
                    <Input 
                      id="invite-message" 
                      placeholder="Add a personal message to the invitation..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setInviteDialog(false)}>
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={loadData} variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byRole.admin || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Family</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byRole.family || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent</CardTitle>
                <Calendar className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentSignups}</div>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="extended-family">Extended Family</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val) => setSortBy(val as 'created' | 'email' | 'name' | 'lastLogin')}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Join Date</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="lastLogin">Last Login</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as 'desc' | 'asc')}>
              <SelectTrigger>
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setRoleFilter('all')
                setStatusFilter('all')
                setSortBy('created')
                setSortOrder('desc')
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear Selection
                </Button>
                <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk User Actions</DialogTitle>
                      <DialogDescription>
                        Apply actions to {selectedUsers.size} selected user{selectedUsers.size !== 1 ? 's' : ''}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => performBulkAction({ type: 'approve' })}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Approve All Selected
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => performBulkAction({ type: 'suspend' })}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Suspend All Selected
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="destructive"
                        onClick={() => performBulkAction({ type: 'delete' })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Selected
                      </Button>
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium">Change Role for All Selected:</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {['family', 'extended-family', 'friend', 'guest'].map(role => (
                            <Button
                              key={role}
                              size="sm"
                              variant="outline"
                              onClick={() => performBulkAction({ type: 'change-role', role: role as 'admin' | 'family' | 'extended-family' | 'friend' | 'guest' })}
                            >
                              {role.replace('-', ' ')}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkActionDialog(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={selectAllUsers}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div 
                key={user.id} 
                className={`border rounded-lg p-4 transition-colors ${
                  selectedUsers.has(user.id) ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium truncate">{user.name}</h3>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(user.status)}
                            <span>{user.status}</span>
                          </div>
                        </Badge>
                        {!user.hasAccess && (
                          <Badge variant="destructive">
                            <EyeOff className="h-3 w-3 mr-1" />
                            No Access
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Joined {new Date(user.created).toLocaleDateString()}</span>
                          </div>
                          {user.lastLogin && (
                            <div className="flex items-center space-x-1">
                              <Activity className="h-3 w-3" />
                              <span>Active {new Date(user.lastLogin).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        
                        {user.approvedBy && user.approvedAt && (
                          <div className="flex items-center space-x-1 text-xs">
                            <UserCheck className="h-3 w-3" />
                            <span>Approved by {user.approvedBy} on {new Date(user.approvedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {user.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => performUserAction(user.id, 'approve')}
                          disabled={actionLoading === user.id}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => performUserAction(user.id, 'suspend')}
                          disabled={actionLoading === user.id}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {user.status === 'approved' && user.role !== 'admin' && (
                      <>
                        <Select onValueChange={(role) => performUserAction(user.id, 'promote', role)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Change role..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="family">Family</SelectItem>
                            <SelectItem value="extended-family">Extended Family</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => performUserAction(user.id, 'suspend')}
                          disabled={actionLoading === user.id}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      </>
                    )}

                    {user.status === 'suspended' && (
                      <Button
                        size="sm"
                        onClick={() => performUserAction(user.id, 'approve')}
                        disabled={actionLoading === user.id}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Reactivate
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteConfirmUser(user)}
                      disabled={actionLoading === user.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input 
                  id="edit-name" 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="User's display name"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Name changes are not currently saved (display only)
                </p>
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input 
                  id="edit-email" 
                  value={editingUser.email}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={editForm.role} 
                  onValueChange={(role) => setEditForm(prev => ({ ...prev, role }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="extended-family">Extended Family</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-notes">Admin Notes (Optional)</Label>
                <Input 
                  id="edit-notes" 
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add a note about this role change..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button 
              onClick={saveUserChanges}
              disabled={actionLoading === editingUser?.id}
            >
              {actionLoading === editingUser?.id ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmUser?.name}</strong> ({deleteConfirmUser?.email})?
              <br /><br />
              This action cannot be undone. The user will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmUser && deleteUser(deleteConfirmUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading === deleteConfirmUser?.id}
            >
              {actionLoading === deleteConfirmUser?.id ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
      )
  }
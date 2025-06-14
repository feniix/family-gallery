'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Check, X, UserPlus, UserMinus, Users, AlertTriangle, Clock } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';
import { authLogger } from '@/lib/logger'

interface UserWithAccess {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest';
  status: 'pending' | 'approved' | 'suspended';
  created: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  hasAccess: boolean;
}

export default function UserManagementPanel() {
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        if (filter === 'pending' || filter === 'approved' || filter === 'suspended') {
          params.set('status', filter);
        } else {
          params.set('role', filter);
        }
      }

      const response = await authenticatedFetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
          } catch (error) {
        authLogger.error('Error loading users', { error })
        toast.error('Failed to load users')
      } finally {
      setLoading(false);
    }
  }, [filter]);

  // Perform user action (approve, promote, suspend)
  const performAction = async (userId: string, action: string, role?: string) => {
    try {
      setActionLoading(userId);
      
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          action,
          targetUserId: userId,
          role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      const data = await response.json();
      
      // Update user in local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? data.user : user
        )
      );

      toast.success(`User ${action}${role ? ` to ${role}` : ''} successfully`);
    } catch (error) {
      authLogger.error('Error performing user action', { action, error })
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'family': return 'secondary';
      case 'extended-family': return 'outline';
      case 'friend': return 'outline';
      case 'guest': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'suspended': return <X className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const pendingUsers = users.filter(user => user.status === 'pending');
  const approvedUsers = users.filter(user => user.status === 'approved');
  const suspendedUsers = users.filter(user => user.status === 'suspended');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Approve new users and manage user roles in the 5-tier system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Pending</div>
                <div className="text-2xl font-bold">{pendingUsers.length}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-green-600 dark:text-green-400 text-sm font-medium">Approved</div>
                <div className="text-2xl font-bold">{approvedUsers.length}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <div className="text-red-600 dark:text-red-400 text-sm font-medium">Suspended</div>
                <div className="text-2xl font-bold">{suspendedUsers.length}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total</div>
                <div className="text-2xl font-bold">{users.length}</div>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter:</span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="extended-family">Extended Family</SelectItem>
                  <SelectItem value="friend">Friends</SelectItem>
                  <SelectItem value="guest">Guests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Approved ({approvedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Users ({users.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Users Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approval</CardTitle>
              <CardDescription>
                New users waiting for approval. Guests have no access to content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {getStatusIcon(user.status)}
                          {user.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(role) => performAction(user.id, 'promote', role)}
                        disabled={actionLoading === user.id}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Promote to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">Family</SelectItem>
                          <SelectItem value="extended-family">Extended Family</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        size="sm"
                        onClick={() => performAction(user.id, 'approve')}
                        disabled={actionLoading === user.id}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {actionLoading === user.id ? 'Processing...' : 'Approve as Guest'}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={actionLoading === user.id}>
                            <UserMinus className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Suspend User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to suspend {user.name}? They will lose access to all content.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => performAction(user.id, 'suspend')}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Suspend
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                {pendingUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No pending users
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved Users Tab */}
        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approved Users</CardTitle>
              <CardDescription>
                Users with approved access to the family gallery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvedUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created).toLocaleDateString()}
                          {user.approvedAt && ` • Approved ${new Date(user.approvedAt).toLocaleDateString()}`}
                          {user.approvedBy && ` by ${user.approvedBy}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge variant="outline">
                          {user.hasAccess ? 'Has Access' : 'No Access'}
                        </Badge>
                      </div>
                    </div>
                    
                    {user.role !== 'admin' && (
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(role) => performAction(user.id, 'promote', role)}
                          disabled={actionLoading === user.id}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Change role..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="family">Family</SelectItem>
                            <SelectItem value="extended-family">Extended Family</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={actionLoading === user.id}>
                              <UserMinus className="h-4 w-4 mr-1" />
                              Suspend
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Suspend User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to suspend {user.name}? They will lose access to all content.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => performAction(user.id, 'suspend')}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Suspend
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
                {approvedUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No approved users
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Users Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Complete list of all users in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {getStatusIcon(user.status)}
                          {user.status}
                        </Badge>
                        <Badge variant="outline">
                          {user.hasAccess ? 'Has Access' : 'No Access'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 